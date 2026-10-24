import { acpSessionReducer, initialAcpSessionState, type AcpSessionAction, type AcpSessionState } from './acpSessionState';
import type { PromptCapabilities, SessionConfigOption, SessionInfo } from '@contenox/acp-client';


export type AcpWorkspaceStatus =
  | 'connecting'
  | 'ready'
  | 'reconnecting'
  | 'disconnected'
  | 'setup_required'
  | 'error';

export type AcpSessionLoadState = 'loading' | 'ready' | 'not_found' | 'error';

export interface AcpWorkspaceState {
  status: AcpWorkspaceStatus;
  error: string | null;
  agentName: string | null;
  sessions: SessionInfo[];
  activeSessionId: string | null;
  sessionLoadState: AcpSessionLoadState;
  sessionLoadError: string | null;
  workspaceConfigOptions: SessionConfigOption[];
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
  | { type: 'setup_required'; message: string }
  | { type: 'error'; message: string }
  | { type: 'sessions_replaced'; sessions: SessionInfo[] }
  | { type: 'session_upserted'; session: SessionInfo }
  | { type: 'session_removed'; sessionId: string }
  | { type: 'active_session_changed'; sessionId: string | null }
  | { type: 'session_load_start' }
  | { type: 'session_load_succeeded' }
  | { type: 'session_load_not_found' }
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

export interface AcpSessionsState {
  slices: Record<string, AcpSessionState>;
  focusedKey: string;
}

export const initialAcpSessionsState: AcpSessionsState = {
  slices: {},
  focusedKey: EMPTY_SESSION_KEY,
};

export type AcpSessionsAction =

  | { type: 'session_dispatch'; key: string; action: AcpSessionAction }
  | { type: 'session_closed'; key: string }
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

export function selectFocusedSession(state: AcpSessionsState): AcpSessionState {
  return state.slices[state.focusedKey] ?? initialAcpSessionState;
}

export function selectOpenSessionIds(state: AcpSessionsState): string[] {
  return Object.keys(state.slices).filter(key => key !== EMPTY_SESSION_KEY);
}
