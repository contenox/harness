import type { AcpSessionState } from '../state/acpSessionState';
import type {
  ToolCallContent,
  ToolCallLocation,
  ToolKind,
  ToolCallStatus,
} from '@contenox/acp-client';


export type ActivityStatus = 'pending' | 'running' | 'success' | 'error';

export interface ActivityTool {
  toolCallId: string;
  title: string;
  kind?: ToolKind;
  status: ActivityStatus;
  locations: ToolCallLocation[];
  diffs: { path?: string; oldText?: string; newText?: string }[];
  hasRaw: boolean;
  input?: unknown;
  output?: unknown;
  turnId?: string;
  startTime?: number;
}

export function activityStatus(status: ToolCallStatus | undefined): ActivityStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'running';
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    default:

      return 'running';
  }
}

export function toolTitle(call: { title?: string; kind?: ToolKind; toolCallId: string }): string {
  if (call.title !== undefined && call.title !== '') return call.title;
  const byKind: Record<ToolKind, string> = {
    read: 'Read a file',
    edit: 'Edited a file',
    delete: 'Deleted a file',
    move: 'Moved a file',
    search: 'Searched the workspace',
    execute: 'Ran a command',
    think: 'Thought',
    fetch: 'Fetched a URL',
    other: 'Tool call',
  };
  return call.kind !== undefined ? byKind[call.kind] : 'Tool call';
}

function diffBlocks(content: ToolCallContent[] | undefined): ActivityTool['diffs'] {
  if (content === undefined) return [];
  const diffs: ActivityTool['diffs'] = [];
  for (const block of content) {
    if (block.type !== 'diff') continue;
    if (block.oldText === undefined && block.newText === undefined) continue;
    diffs.push({
      path: block.path,
      oldText: block.oldText,
      newText: block.newText,
    });
  }
  return diffs;
}

export function activityTools(session: AcpSessionState): ActivityTool[] {
  const tools: ActivityTool[] = [];
  for (const item of session.items) {
    if (item.kind !== 'tool_call') continue;
    const call = session.toolCalls[item.id];
    if (call === undefined) continue;
    tools.push({
      toolCallId: call.toolCallId,
      title: toolTitle(call),
      kind: call.kind,
      status: activityStatus(call.status),
      locations: call.locations ?? [],
      diffs: diffBlocks(call.content),
      hasRaw: call.rawInput !== undefined || call.rawOutput !== undefined,
      input: call.rawInput,
      output: call.rawOutput,
      turnId: item.turnId,
      startTime: call.startTime,
    });
  }
  return tools;
}

export type FileAction = 'created' | 'modified' | 'deleted' | 'moved';

function actionFor(call: ActivityTool): FileAction | null {
  if (call.kind === 'delete') return 'deleted';
  if (call.kind === 'move') return 'moved';
  if (call.kind === 'edit' || call.diffs.length > 0) {
    const allNew = call.diffs.every(d => (d.oldText ?? '') === '' && d.newText !== '');
    return allNew && call.diffs.length > 0 ? 'created' : 'modified';
  }
  return null;
}

export interface ChangedFile {
  path: string;
  action: FileAction;
  tools: { toolCallId: string; action: FileAction }[];
  diffs: { toolCallId: string; oldText?: string; newText?: string }[];
}

export function changedFiles(session: AcpSessionState): ChangedFile[] {
  const order: string[] = [];
  const byPath = new Map<string, ChangedFile>();
  for (const tool of activityTools(session)) {
    const action = actionFor(tool);




    const touched = new Set<string>();
    if (action !== null) {
      for (const location of tool.locations) {
        if (location.path !== '') touched.add(location.path);
      }
    }
    for (const diff of tool.diffs) {
      if (diff.path !== undefined && diff.path !== '') touched.add(diff.path);
    }
    if (touched.size === 0) continue;
    for (const path of touched) {
      let file = byPath.get(path);
      if (file === undefined) {
        file = { path, action: action ?? 'modified', tools: [], diffs: [] };
        byPath.set(path, file);
        order.push(path);
      }
      file.tools.push({ toolCallId: tool.toolCallId, action: action ?? 'modified' });
      file.diffs.push(
        ...tool.diffs
          .filter(d => d.path === undefined || d.path === path)
          .map(d => ({
            toolCallId: tool.toolCallId,
            oldText: d.oldText,
            newText: d.newText,
          })),
      );

      if (action !== null) file.action = action;
    }
  }
  return order.map(path => byPath.get(path)!);
}


const SECRET_KEY =
  /(?:^|[-_.])(?:key|token|secret|password|passwd|auth|cookie|credential)(?:[-_.]|$)|^authorization$|^bearer$|^api[-_]?key$/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] =
      SECRET_KEY.test(key) && typeof entry === 'string' && entry !== '' ? '••••••' : redact(entry);
  }
  return out;
}
