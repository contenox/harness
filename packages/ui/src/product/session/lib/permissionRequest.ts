import type {
  PermissionToolCall,
  RequestPermissionRequest,
  ToolCallContent,
} from '@contenox/acp-client';


export interface PermissionDiff {
  path: string;
  oldText: string;
  newText: string;
}

export interface PermissionArgument {
  key: string;
  value: string;
  hiddenLines: number;
}

export interface PermissionEvidence {
  diffs: PermissionDiff[];
  summary: string;
  argumentsSent: boolean;
  args: PermissionArgument[];
  hiddenArguments: number;
}

export interface PermissionMeta {
  policyName: string;
  policyPath: string;
  matchedRule: number | null;
  detail: string;
  mayCall: string[];
  mayCallDeclared: boolean | null;
  askId: string;
  expiresAt: string;
  onTimeout: string;
  recoveryCommand: string;
}


export const ARGUMENT_MAX_LINES = 10;
export const ARGUMENT_MAX_CHARS = 800;


export const ARGUMENT_MAX_ENTRIES = 12;

export function permissionMetaFrom(request: RequestPermissionRequest): PermissionMeta {
  const outer = asRecord(request._meta);
  const inner = asRecord(request.toolCall._meta);
  const read = (key: string): unknown => (key in outer ? outer[key] : inner[key]);

  return {
    policyName: asText(read('policyName')),
    policyPath: asText(read('policyPath')),
    matchedRule: asIndex(read('matchedRule')),
    detail: asText(read('detail')),
    mayCall: asTextList(read('mayCall')),
    mayCallDeclared: asFlag(read('mayCallDeclared')),
    askId: asText(read('askId')),
    expiresAt: asText(read('expiresAt')),
    onTimeout: asText(read('onTimeout')),
    recoveryCommand: asText(read('recoveryCommand')),
  };
}

export function permissionEvidence(toolCall: PermissionToolCall): PermissionEvidence {
  const blocks: ToolCallContent[] = Array.isArray(toolCall.content) ? toolCall.content : [];
  const { args, hidden } = clampArguments(toolCall.rawInput);
  return {
    diffs: blocks.filter(isDiffBlock).map(toDiff),
    summary: blocks
      .filter(block => block?.type === 'content')
      .map(block => asVerbatim(block.content?.text))
      .filter(text => text.trim() !== '')
      .join('\n\n'),
    argumentsSent: toolCall.rawInput !== undefined && toolCall.rawInput !== null,
    args,
    hiddenArguments: hidden,
  };
}


function isDiffBlock(block: ToolCallContent): boolean {
  if (block?.type !== 'diff') return false;
  if (asText(block.path) === '') return false;
  return asVerbatim(block.oldText) !== asVerbatim(block.newText);
}

function toDiff(block: ToolCallContent): PermissionDiff {
  return {
    path: asText(block.path),
    oldText: asVerbatim(block.oldText),
    newText: asVerbatim(block.newText),
  };
}


function clampArguments(rawInput: unknown): { args: PermissionArgument[]; hidden: number } {
  if (rawInput === undefined || rawInput === null) return { args: [], hidden: 0 };
  if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return { args: [clampArgument('', rawInput)], hidden: 0 };
  }
  const entries = Object.entries(rawInput as Record<string, unknown>);
  return {
    args: entries
      .slice(0, ARGUMENT_MAX_ENTRIES)
      .map(([key, value]) => clampArgument(key, value)),
    hidden: Math.max(0, entries.length - ARGUMENT_MAX_ENTRIES),
  };
}

function clampArgument(key: string, value: unknown): PermissionArgument {
  const text = typeof value === 'string' ? value : stringify(value);
  const lines = text.split('\n');
  let shown = lines.slice(0, ARGUMENT_MAX_LINES).join('\n');
  let hiddenLines = lines.length - Math.min(lines.length, ARGUMENT_MAX_LINES);
  if (shown.length > ARGUMENT_MAX_CHARS) {


    shown = shown.slice(0, ARGUMENT_MAX_CHARS);
    hiddenLines += 1;
  }
  return { key, value: shown, hiddenLines };
}


function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}


function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}


function asVerbatim(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function asIndex(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function asFlag(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}
