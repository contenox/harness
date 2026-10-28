import type {
  AudioPart,
  AvailableCommand,
  ImagePart,
  MissionAsk,
  PlanEntry,
  RequestPermissionRequest,
  SessionConfigOption,
  StopReason,
  TerminalOutputPayload,
  ToolCallContent,
  ToolCallEvent,
  ToolCallLocation,
  ToolCallStatus,
  ToolKind,
  UsageEvent,
} from '@contenox/acp-client';
import { shellCommandLine, shellOutputLines } from '../lib/shellExecution';


export type AcpTimelineItemKind = 'message' | 'tool_call' | 'terminal' | 'error';

export interface AcpTimelineItem {
  kind: AcpTimelineItemKind;
  id: string;
  turnId?: string;
}

export interface AcpChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: ImagePart[];
  audio?: AudioPart[];
  droppedContent?: string[];
  streaming?: boolean;
  thinking?: string;
  thinkingStreaming?: boolean;
  missionAsk?: MissionAsk;
}

export interface AcpToolCallState {
  toolCallId: string;
  title?: string;
  kind?: ToolKind;
  status?: ToolCallStatus;
  content?: ToolCallContent[];
  locations?: ToolCallLocation[];
  rawInput?: unknown;
  rawOutput?: unknown;
  startTime?: number;
}

export interface AcpUsageState {
  used: number;
  size: number;
}

export interface AcpTerminalState {
  text: string;
  offset: number;
}

export interface AcpTerminalCard {
  id: string;
  command: string;
  output: string;
}

export interface AcpErrorCard {
  id: string;
  message: string;
}

export type AcpSessionConnectionBanner = 'disconnected' | 'resumed' | null;

export interface AcpSessionState {
  sessionId: string | null;
  lastSeq: number;
  items: AcpTimelineItem[];
  messages: Record<string, AcpChatMessage>;
  toolCalls: Record<string, AcpToolCallState>;
  terminals: Record<string, AcpTerminalCard>;
  errorCards: Record<string, AcpErrorCard>;
  terminal: AcpTerminalState | null;
  printedShellToolCalls: Record<string, true>;
  plan: PlanEntry[];
  usage: AcpUsageState | null;
  configOptions: SessionConfigOption[];
  availableCommands: AvailableCommand[];
  pendingPermission: RequestPermissionRequest | null;
  isPrompting: boolean;
  stopReason: StopReason | null;
  error: string | null;
  connectionBanner: AcpSessionConnectionBanner;
  activeTurnMessageId: string | null;
  usedTurnMessageIds: Record<string, true>;
  currentTurnId: string | null;
}

export const initialAcpSessionState: AcpSessionState = {
  sessionId: null,
  lastSeq: 0,
  items: [],
  messages: {},
  toolCalls: {},
  terminals: {},
  errorCards: {},
  terminal: null,
  printedShellToolCalls: {},
  plan: [],
  usage: null,
  configOptions: [],
  availableCommands: [],
  pendingPermission: null,
  isPrompting: false,
  stopReason: null,
  error: null,
  connectionBanner: null,
  activeTurnMessageId: null,
  usedTurnMessageIds: {},
  currentTurnId: null,
};

export type AcpSessionAction =

  | { type: 'session_reset'; sessionId: string | null }
  | { type: 'event_seq'; seq: number }
  | { type: 'user_message_chunk'; id: string; text: string; image?: ImagePart; audio?: AudioPart }
  | {
      type: 'message_chunk';
      id: string;
      text: string;
      image?: ImagePart;
      audio?: AudioPart;
      missionAsk?: MissionAsk;
    }
  | { type: 'thought_chunk'; id: string; text: string }
  | { type: 'tool_call'; event: ToolCallEvent }
  | { type: 'terminal_output'; payload: TerminalOutputPayload }
  | { type: 'terminal_card'; id: string; command: string; output: string }
  | { type: 'plan'; entries: PlanEntry[] }
  | { type: 'usage'; usage: UsageEvent }
  | { type: 'available_commands'; commands: AvailableCommand[] }
  | { type: 'config_options'; configOptions: SessionConfigOption[] }
  | { type: 'permission_request'; request: RequestPermissionRequest }
  | { type: 'permission_resolved' }
  | { type: 'prompt_start' }
  | { type: 'content_dropped'; messageId: string; kinds: string[] }
  | { type: 'prompt_end'; stopReason: StopReason }
  | { type: 'prompt_error'; message: string }
  | { type: 'connection_lost' }
  | { type: 'connection_resumed' };

function ensureItem(
  items: AcpTimelineItem[],
  kind: AcpTimelineItemKind,
  id: string,
  turnId?: string,
): AcpTimelineItem[] {
  if (items.some(it => it.kind === kind && it.id === id)) return items;
  return [...items, turnId !== undefined ? { kind, id, turnId } : { kind, id }];
}


function upsertMessage(
  messages: Record<string, AcpChatMessage>,
  id: string,
  role: 'user' | 'assistant',
  patch: {
    text?: string;
    thinking?: string;
    image?: ImagePart;
    audio?: AudioPart;
    missionAsk?: MissionAsk;
  },
  activeTurn: boolean,
): Record<string, AcpChatMessage> {
  const existing = messages[id];
  const next: AcpChatMessage = existing ? { ...existing } : { id, role, text: '' };
  if (patch.text !== undefined) {
    next.text = next.text + patch.text;
    next.streaming = activeTurn;
  }
  if (patch.image !== undefined) {



    next.images = [...(next.images ?? []), patch.image];
    next.streaming = activeTurn;
  }
  if (patch.audio !== undefined) {
    next.audio = [...(next.audio ?? []), patch.audio];
    next.streaming = activeTurn;
  }
  if (patch.missionAsk !== undefined) {


    next.missionAsk = patch.missionAsk;
  }
  if (patch.thinking !== undefined) {
    next.thinking = (next.thinking ?? '') + patch.thinking;
    next.thinkingStreaming = activeTurn;
  }
  return { ...messages, [id]: next };
}


function endStreaming(messages: Record<string, AcpChatMessage>): Record<string, AcpChatMessage> {
  let changed = false;
  const next: Record<string, AcpChatMessage> = {};
  for (const [id, m] of Object.entries(messages)) {
    if (m.streaming || m.thinkingStreaming) {
      changed = true;
      next[id] = { ...m, streaming: false, thinkingStreaming: false };
    } else {
      next[id] = m;
    }
  }
  return changed ? next : messages;
}


function resolveTurnMessageId(
  state: AcpSessionState,
  actionId: string,
  active: boolean,
): { id: string; establishesNew: boolean } {
  if (!active) return { id: actionId, establishesNew: false };
  if (state.activeTurnMessageId !== null) {
    return { id: state.activeTurnMessageId, establishesNew: false };
  }
  const id = state.usedTurnMessageIds[actionId]
    ? `${actionId}#turn-${state.items.length}`
    : actionId;
  return { id, establishesNew: true };
}

export function acpSessionReducer(
  state: AcpSessionState,
  action: AcpSessionAction,
): AcpSessionState {
  switch (action.type) {
    case 'event_seq': {
      if (action.seq <= state.lastSeq) return state;
      return { ...state, lastSeq: action.seq };
    }
    case 'session_reset':
      return { ...initialAcpSessionState, sessionId: action.sessionId };

    case 'user_message_chunk':
      return {
        ...state,
        items: ensureItem(state.items, 'message', action.id),
        messages: upsertMessage(
          state.messages,
          action.id,
          'user',
          { text: action.text, image: action.image, audio: action.audio },
          state.isPrompting,
        ),
      };

    case 'message_chunk': {










      const outOfBand = action.missionAsk !== undefined;
      const active = state.isPrompting && !outOfBand;
      const { id, establishesNew } = resolveTurnMessageId(state, action.id, active);
      return {
        ...state,
        items: ensureItem(
          state.items,
          'message',
          id,
          active ? (state.currentTurnId ?? undefined) : undefined,
        ),
        messages: upsertMessage(
          state.messages,
          id,
          'assistant',
          {
            text: action.text,
            image: action.image,
            audio: action.audio,
            missionAsk: action.missionAsk,
          },


          active,
        ),
        activeTurnMessageId: active ? id : state.activeTurnMessageId,
        usedTurnMessageIds: establishesNew
          ? { ...state.usedTurnMessageIds, [id]: true }
          : state.usedTurnMessageIds,
      };
    }

    case 'thought_chunk': {
      const { id, establishesNew } = resolveTurnMessageId(state, action.id, state.isPrompting);
      return {
        ...state,
        items: ensureItem(
          state.items,
          'message',
          id,
          state.isPrompting ? (state.currentTurnId ?? undefined) : undefined,
        ),
        messages: upsertMessage(
          state.messages,
          id,
          'assistant',
          { thinking: action.text },
          state.isPrompting,
        ),
        activeTurnMessageId: state.isPrompting ? id : state.activeTurnMessageId,
        usedTurnMessageIds: establishesNew
          ? { ...state.usedTurnMessageIds, [id]: true }
          : state.usedTurnMessageIds,
      };
    }

    case 'tool_call': {
      const { event } = action;
      const existing = state.toolCalls[event.toolCallId];
      const newStatus = event.status ?? existing?.status;
      const statusChanged = newStatus !== existing?.status;

      const shouldCaptureStartTime =
        statusChanged &&
        !existing?.startTime &&
        (newStatus === 'pending' || newStatus === 'in_progress');
      const merged: AcpToolCallState = {
        toolCallId: event.toolCallId,
        title: event.title ?? existing?.title,
        kind: event.kind ?? existing?.kind,
        status: newStatus,
        content: event.content ?? existing?.content,
        locations: event.locations ?? existing?.locations,
        rawInput: event.rawInput ?? existing?.rawInput,
        rawOutput: event.rawOutput ?? existing?.rawOutput,
        startTime: shouldCaptureStartTime ? Date.now() : existing?.startTime,
      };







      const outputLines =
        merged.kind === 'execute' &&
        (merged.status === 'completed' || merged.status === 'failed') &&
        !state.printedShellToolCalls[event.toolCallId]
          ? shellOutputLines(merged.rawOutput)
          : null;
      const terminal = outputLines
        ? {
            text:
              (state.terminal?.text ?? '') +
              (state.terminal?.text ? '\n' : '') +
              [shellCommandLine(merged.rawInput), ...outputLines]
                .filter((l): l is string => l != null)
                .join('\n') +
              '\n',
            offset: state.terminal?.offset ?? 0,
          }
        : state.terminal;
      return {
        ...state,
        items: ensureItem(
          state.items,
          'tool_call',
          event.toolCallId,
          state.isPrompting ? (state.currentTurnId ?? undefined) : undefined,
        ),
        toolCalls: { ...state.toolCalls, [event.toolCallId]: merged },
        terminal,
        printedShellToolCalls: outputLines
          ? { ...state.printedShellToolCalls, [event.toolCallId]: true }
          : state.printedShellToolCalls,
      };
    }

    case 'terminal_output': {
      const { chunk, offset, reset } = action.payload;
      const text = reset ? chunk : (state.terminal?.text ?? '') + chunk;
      return { ...state, terminal: { text, offset } };
    }

    case 'terminal_card':
      return {
        ...state,
        items: ensureItem(state.items, 'terminal', action.id),
        terminals: {
          ...state.terminals,
          [action.id]: { id: action.id, command: action.command, output: action.output },
        },
      };

    case 'plan':
      return { ...state, plan: action.entries };

    case 'usage':
      return { ...state, usage: { used: action.usage.used, size: action.usage.size } };

    case 'available_commands':
      return { ...state, availableCommands: action.commands };

    case 'config_options':
      return { ...state, configOptions: action.configOptions };

    case 'permission_request':
      return { ...state, pendingPermission: action.request };

    case 'permission_resolved':
      return { ...state, pendingPermission: null };

    case 'prompt_start':





      return {
        ...state,
        isPrompting: true,
        error: null,
        activeTurnMessageId: null,
        currentTurnId: `turn-${state.items.length}`,
      };

    case 'content_dropped': {
      const message = state.messages[action.messageId];


      if (!message || action.kinds.length === 0) return state;
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.messageId]: { ...message, droppedContent: action.kinds },
        },
      };
    }

    case 'prompt_end':
      return {
        ...state,
        isPrompting: false,
        stopReason: action.stopReason,
        pendingPermission: null,
        messages: endStreaming(state.messages),
      };

    case 'prompt_error': {






      const id = `error-${state.items.length}`;
      return {
        ...state,
        isPrompting: false,
        error: action.message,
        items: ensureItem(state.items, 'error', id),
        errorCards: { ...state.errorCards, [id]: { id, message: action.message } },
        messages: endStreaming(state.messages),
      };
    }

    case 'connection_lost':




      return {
        ...state,
        connectionBanner: 'disconnected',
        pendingPermission: null,
        isPrompting: false,
        messages: endStreaming(state.messages),
      };

    case 'connection_resumed':
      return { ...state, connectionBanner: 'resumed' };

    default:
      return state;
  }
}
