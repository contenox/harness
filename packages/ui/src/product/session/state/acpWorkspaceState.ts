import { acpSessionReducer, initialAcpSessionState, type AcpSessionAction, type AcpSessionState } from './acpSessionState';
import type { PromptCapabilities, SessionConfigOption, SessionInfo } from '@contenox/acp-client';

/**
 * Pure, framework-free workspace-level state: reducer + types only, no React, no WebSocket.
 */

export type AcpWorkspaceStatus =
  | 'connecting'
  | 'ready'
  | 'reconnecting'
  | 'disconnected'
  /** The one TERMINAL status: what refused is not going to stop refusing, so nothing retries and no retry is offered. */
  | 'setup_required'
  | 'error';

/**
 * Outcome of the most recent explicit `openSession()` call (deep link / rail switch) — kept independent of `AcpWorkspaceStatus`, which is reserved for the connection lifecycle.
 */
export type AcpSessionLoadState = 'loading' | 'ready' | 'not_found' | 'error';

export interface AcpWorkspaceState {
  status: AcpWorkspaceStatus;
  /**
   * Set on `setup_required`/`error`; cleared on `connecting`/`ready`.
   */
  error: string | null;
  agentName: string | null;
  /**
   * The `session/list` roster, sorted freshest-first (see `compareByFreshness`).
   */
  sessions: SessionInfo[];
  activeSessionId: string | null;
  /**
   * Outcome of the in-flight/most-recent `openSession()` call — see `AcpSessionLoadState`.
   */
  sessionLoadState: AcpSessionLoadState;
  /**
   * Set on `session_load_failed`; cleared on `session_load_start`/`session_load_succeeded`.
   */
  sessionLoadError: string | null;
  /**
   * The workspace-level (session-less) config options advertised in the agent's `initialize` `_meta` (see `workspaceConfigOptionsFromInit`).
   */
  workspaceConfigOptions: SessionConfigOption[];
  /**
   * The agent's advertised `initialize` prompt capabilities (`agentCapabilities.promptCapabilities`) — what content kinds a `session/prompt` may carry.
   */
  promptCapabilities: PromptCapabilities;
}

export const initialAcpWorkspaceState: AcpWorkspaceState = {
  status: 'connecting',
  error: null,
  agentName: null,
  sessions: [],
  activeSessionId: null,
  sessionLoadState: 'ready',
  sessionLoadError: null,
  workspaceConfigOptions: [],
  promptCapabilities: {},
};

export type AcpWorkspaceAction =
  | { type: 'connecting' }
  | {
      type: 'ready';
      agentName: string | null;
      workspaceConfigOptions: SessionConfigOption[];
      promptCapabilities: PromptCapabilities;
    }
  | { type: 'reconnecting' }
  | { type: 'disconnected' }
  /**
   * A refusal the connection cannot recover from — the controller never
   * auto-retries past this and the screen offers no retry (see
   * acpWorkspaceController.ts).
   *
   * TWO sources, arriving by different routes because there are two places to
   * refuse from: the machine answers `initialize` with JSON-RPC `-32000
   * auth_required`, and the relay closes an accepted socket with a private
   * close code (`lib/acp/closeCodes.ts`) for a refusal that has no message to
   * travel in. `message` is what the person reads, so it names which.
   */
  | { type: 'setup_required'; message: string }
  | { type: 'error'; message: string }
  /** A full, authoritative `session/list` result (paginated to completion) replaces the roster. */
  | { type: 'sessions_replaced'; sessions: SessionInfo[] }
  /** Insert-or-merge one session (new session created/opened, or a live `session_info_update`) and re-sort by freshness. */
  | { type: 'session_upserted'; session: SessionInfo }
  | { type: 'session_removed'; sessionId: string }
  | { type: 'active_session_changed'; sessionId: string | null }
  /** An explicit `openSession()` call started — the page can show a loading affordance instead of stale content. */
  | { type: 'session_load_start' }
  /** The `openSession()` call resolved: whichever session was requested is now open. */
  | { type: 'session_load_succeeded' }
  /** `openSession()`'s `session/load` failed with an unknown-session error — see acpWorkspaceController.ts's `classifySessionOpenFailure`. */
  | { type: 'session_load_not_found' }
  /** `openSession()`'s `session/load` failed for a reason other than "unknown session". */
  | { type: 'session_load_failed'; message: string };


function compareByFreshness(a: SessionInfo, b: SessionInfo): number {
  const at = a.updatedAt ? Date.parse(a.updatedAt) : NaN;
  const bt = b.updatedAt ? Date.parse(b.updatedAt) : NaN;
  const aValid = !Number.isNaN(at);
  const bValid = !Number.isNaN(bt);
  if (aValid && bValid) return bt - at;
  if (aValid) return -1;
  if (bValid) return 1;
  return 0;
}


function mergeMeta(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!existing) return incoming;
  if (!incoming) return existing;
  return { ...existing, ...incoming };
}


function mergeSessionInfo(existing: SessionInfo | undefined, incoming: SessionInfo): SessionInfo {
  if (!existing) return incoming;
  return {
    sessionId: incoming.sessionId,
    cwd: incoming.cwd ?? existing.cwd,
    title: incoming.title ?? existing.title,
    updatedAt: incoming.updatedAt ?? existing.updatedAt,



    _meta: mergeMeta(existing._meta, incoming._meta),
  };
}

export function acpWorkspaceReducer(state: AcpWorkspaceState, action: AcpWorkspaceAction): AcpWorkspaceState {
  switch (action.type) {
    case 'connecting':
      return { ...state, status: 'connecting', error: null };

    case 'ready':
      return {
        ...state,
        status: 'ready',
        error: null,
        agentName: action.agentName,
        workspaceConfigOptions: action.workspaceConfigOptions,
        promptCapabilities: action.promptCapabilities,
      };

    case 'reconnecting':
      return { ...state, status: 'reconnecting', error: null };

    case 'disconnected':
      return { ...state, status: 'disconnected' };

    case 'setup_required':
      return { ...state, status: 'setup_required', error: action.message };

    case 'error':
      return { ...state, status: 'error', error: action.message };

    case 'sessions_replaced': {












      const known = new Map(state.sessions.map(s => [s.sessionId, s] as const));
      const sessions = action.sessions.map(incoming => mergeSessionInfo(known.get(incoming.sessionId), incoming));
      return { ...state, sessions: sessions.sort(compareByFreshness) };
    }

    case 'session_upserted': {
      const idx = state.sessions.findIndex(s => s.sessionId === action.session.sessionId);
      const sessions = state.sessions.slice();
      if (idx === -1) {
        sessions.push(action.session);
      } else {
        sessions[idx] = mergeSessionInfo(sessions[idx], action.session);
      }
      return { ...state, sessions: sessions.sort(compareByFreshness) };
    }

    case 'session_removed':
      return { ...state, sessions: state.sessions.filter(s => s.sessionId !== action.sessionId) };

    case 'active_session_changed':
      return { ...state, activeSessionId: action.sessionId };

    case 'session_load_start':
      return { ...state, sessionLoadState: 'loading', sessionLoadError: null };

    case 'session_load_succeeded':
      return { ...state, sessionLoadState: 'ready', sessionLoadError: null };

    case 'session_load_not_found':
      return { ...state, sessionLoadState: 'not_found', sessionLoadError: null };

    case 'session_load_failed':
      return { ...state, sessionLoadState: 'error', sessionLoadError: action.message };

    default:
      return state;
  }
}






export const EMPTY_SESSION_KEY = '';

/**
 * The multiplexed session state: an `AcpSessionState` slice per open session (keyed by sessionId, plus the reserved `EMPTY_SESSION_KEY` empty-chat slice), and the key of the slice the single-view UI renders.
 */
export interface AcpSessionsState {
  /**
   * Live-timeline slice per open session, keyed by sessionId (`EMPTY_SESSION_KEY` for the empty-chat slice).
   */
  slices: Record<string, AcpSessionState>;
  /**
   * Storage key of the slice the single-view UI renders — a sessionId, or `EMPTY_SESSION_KEY`.
   */
  focusedKey: string;
}

export const initialAcpSessionsState: AcpSessionsState = {
  slices: {},
  focusedKey: EMPTY_SESSION_KEY,
};

export type AcpSessionsAction =

  | { type: 'session_dispatch'; key: string; action: AcpSessionAction }
  /** Drop `key`'s slice entirely (a closed/deleted session). Never changes `focusedKey` — the controller re-points focus explicitly. */
  | { type: 'session_closed'; key: string }
  /** Re-point which slice the single-view UI renders. */
  | { type: 'session_focused'; key: string };

export function acpSessionsReducer(state: AcpSessionsState, action: AcpSessionsAction): AcpSessionsState {
  switch (action.type) {
    case 'session_dispatch': {
      const prev = state.slices[action.key] ?? initialAcpSessionState;
      const next = acpSessionReducer(prev, action.action);
      if (next === prev) return state;
      return { ...state, slices: { ...state.slices, [action.key]: next } };
    }

    case 'session_closed': {
      if (!(action.key in state.slices)) return state;
      const slices = { ...state.slices };
      delete slices[action.key];
      return { ...state, slices };
    }

    case 'session_focused':
      return state.focusedKey === action.key ? state : { ...state, focusedKey: action.key };

    default:
      return state;
  }
}

/**
 * The focused session's slice — what the single-view UI renders.
 */
export function selectFocusedSession(state: AcpSessionsState): AcpSessionState {
  return state.slices[state.focusedKey] ?? initialAcpSessionState;
}

/**
 * The ids of all open sessions (every slice key except the reserved empty-chat one).
 */
export function selectOpenSessionIds(state: AcpSessionsState): string[] {
  return Object.keys(state.slices).filter(key => key !== EMPTY_SESSION_KEY);
}
