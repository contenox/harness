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

/**
 * Pure, framework-free state for the ACP workspace's currently-open session: reducer + types only, no React, no WebSocket.
 */

export type AcpTimelineItemKind = 'message' | 'tool_call' | 'terminal' | 'error';

/**
 * One entry in `AcpSessionState.items`, in arrival order.
 */
export interface AcpTimelineItem {
  kind: AcpTimelineItemKind;
  id: string;
  /**
   * The turn (one `session/prompt` call) this item was created during, or `undefined` for items created with no turn in flight (`session/load` replay, a `!` passthrough terminal card, a delivered mission question).
   */
  turnId?: string;
}

export interface AcpChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /**
   * Image parts carried by this message's chunks, in arrival order (ACP wire form: raw base64 + mime type).
   */
  images?: ImagePart[];
  /**
   * Audio parts carried by this message's chunks, in arrival order — same flat-alongside-`text` shape as `images`.
   */
  audio?: AudioPart[];
  /**
   * Content kinds the runtime reported it could not use from THIS message — `contenox.droppedContent` on the `session/prompt` response `_meta`, see `lib/droppedContent.ts`.
   */
  droppedContent?: string[];
  /**
   * True while more `agent_message_chunk`/`user_message_chunk`s are still expected for this message.
   */
  streaming?: boolean;
  /**
   * Collapsible "thinking" block (`agent_thought_chunk`s sharing this message's id).
   */
  thinking?: string;
  /**
   * True while more `agent_thought_chunk`s are still expected for this message.
   */
  thinkingStreaming?: boolean;
  /**
   * Set when this message IS a mission unit's question, delivered into the session that fired it.
   */
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
  /**
   * Timestamp when this tool call started (pending or in_progress), for elapsed time display.
   */
  startTime?: number;
}

export interface AcpUsageState {
  used: number;
  size: number;
}

/**
 * Live scrollback of the session's shell, accumulated from `_contenox.terminalOutput` stream events for the terminal panel.
 */
export interface AcpTerminalState {
  text: string;
  offset: number;
}

/**
 * A compact record of one `!` passthrough line, rendered in the transcript.
 */
export interface AcpTerminalCard {
  id: string;
  command: string;
  output: string;
}

/**
 * A failed turn recorded IN the transcript (arrival-ordered, like every other item), so a failure is anchored where it happened instead of only surfacing as the transient top-of-page recovery banner (`session.error`).
 */
export interface AcpErrorCard {
  id: string;
  message: string;
}

/**
 * Transient banner state for the currently-open session, driven by the workspace controller's reconnect supervisor: `'disconnected'` while the transport is down and this session's live updates may be stale, `'resumed'` once the session has been successfully re-bound (via `session/resume` or a `session/load` replay fallback) after a drop.
 */
export type AcpSessionConnectionBanner = 'disconnected' | 'resumed' | null;

export interface AcpSessionState {
  sessionId: string | null;
  /**
   * Highest session sequence seen so far (the runtime stamps it into each notification's `_meta`, key contenox.seq).
   */
  lastSeq: number;
  /**
   * Arrival-ordered index into `messages`/`toolCalls` — the single source of truth for render order.
   */
  items: AcpTimelineItem[];
  messages: Record<string, AcpChatMessage>;
  toolCalls: Record<string, AcpToolCallState>;
  /**
   * Compact `!` passthrough records, keyed by timeline item id.
   */
  terminals: Record<string, AcpTerminalCard>;
  /**
   * Failed-turn cards anchored in the transcript, keyed by timeline item id (see `AcpErrorCard`).
   */
  errorCards: Record<string, AcpErrorCard>;
  /**
   * Live shell scrollback for the terminal panel (null until first output).
   */
  terminal: AcpTerminalState | null;
  /**
   * `toolCallId`s already appended into `terminal.text` by the `tool_call` reducer case, so a `pending` -> `completed` update pair (or a repeated `tool_call_update`) for the SAME call doesn't print its output twice.
   */
  printedShellToolCalls: Record<string, true>;
  plan: PlanEntry[];
  usage: AcpUsageState | null;
  configOptions: SessionConfigOption[];
  availableCommands: AvailableCommand[];
  pendingPermission: RequestPermissionRequest | null;
  /**
   * True for the duration of one `session/prompt` call.
   */
  isPrompting: boolean;
  /**
   * The most recently completed turn's stop reason, if any.
   */
  stopReason: StopReason | null;
  /**
   * Set on a `prompt_error`; cleared on the next `session_reset`/`prompt_start`.
   */
  error: string | null;
  connectionBanner: AcpSessionConnectionBanner;
  /**
   * The canonical `messages` key for the CURRENTLY ACTIVE turn's assistant message, or null before its first chunk has arrived.
   */
  activeTurnMessageId: string | null;
  /**
   * Every id that has ever served as an `activeTurnMessageId` (i.e. every canonical id a PAST OR CURRENT turn has been established under).
   */
  usedTurnMessageIds: Record<string, true>;
  /**
   * This turn's id, tagged onto every `message`/`tool_call` item created while it's active (see `AcpTimelineItem.turnId`).
   */
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
  /** Live shell output batch (append, or replace when `payload.reset`). */
  | { type: 'terminal_output'; payload: TerminalOutputPayload }
  /** Record a `!` passthrough line as a compact transcript card. */
  | { type: 'terminal_card'; id: string; command: string; output: string }
  | { type: 'plan'; entries: PlanEntry[] }
  | { type: 'usage'; usage: UsageEvent }
  | { type: 'available_commands'; commands: AvailableCommand[] }
  | { type: 'config_options'; configOptions: SessionConfigOption[] }
  | { type: 'permission_request'; request: RequestPermissionRequest }
  | { type: 'permission_resolved' }
  | { type: 'prompt_start' }
  /**
   * The runtime reported that it discarded some of `messageId`'s content (see
   * `AcpChatMessage.droppedContent`). A separate action from `prompt_end`
   * because the two are about different things — one ends a turn, one marks a
   * message — and because a no-op for the ordinary turn should cost the
   * reducer nothing.
   */
  | { type: 'content_dropped'; messageId: string; kinds: string[] }
  | { type: 'prompt_end'; stopReason: StopReason }
  | { type: 'prompt_error'; message: string }
  /** Transport dropped: this session's live updates are stale until a resume/reload lands. */
  | { type: 'connection_lost' }
  /** The workspace controller re-bound this session after a drop (resume or reload fallback). */
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
