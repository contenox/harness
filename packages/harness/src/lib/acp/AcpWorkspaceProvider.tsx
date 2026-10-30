import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { AcpSessionState } from '../../hooks/acpSessionState';
import {
  createAcpWorkspaceController,
  type AcpWorkspaceController,
} from '../../hooks/acpWorkspaceController';
import {
  acpSessionsReducer,
  acpWorkspaceReducer,
  initialAcpSessionsState,
  initialAcpWorkspaceState,
  selectFocusedSession,
  type AcpSessionsState,
  type AcpWorkspaceState,
} from '../../hooks/acpWorkspaceState';
import { WebSocketTransport } from '@contenox/acp-client';
import {
  acpWsUrl,
  ensureProjectPrefix,
  hasProjectBridge,
  projectPathForCwd,
} from '../projectRuntime';

export interface AcpWorkspaceContextValue {
  workspace: AcpWorkspaceState;
  session: AcpSessionState;
  sessions: AcpSessionsState;
  controller: AcpWorkspaceController;
}

const AcpWorkspaceContext = createContext<AcpWorkspaceContextValue | null>(null);

export function createDeferredDisposer(dispose: () => void): { armForCleanup: () => void; cancelPendingDispose: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    armForCleanup: () => {
      timer = setTimeout(() => {
        timer = null;
        dispose();
      }, 0);
    },
    cancelPendingDispose: () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

export interface AcpWorkspaceProviderProps {
  children: ReactNode;
}

export function AcpWorkspaceProvider({ children }: AcpWorkspaceProviderProps) {
  const [workspace, workspaceDispatch] = useReducer(acpWorkspaceReducer, initialAcpWorkspaceState);
  const [sessions, sessionsDispatch] = useReducer(acpSessionsReducer, initialAcpSessionsState);

  const controllerRef = useRef<AcpWorkspaceController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createAcpWorkspaceController(
      {
        createTransport: async (target, attempt) => {
          const prefix = target ? await ensureProjectPrefix(target, { force: attempt > 0 }) : '';
          return new WebSocketTransport(acpWsUrl(prefix));
        },
        resolveProject: hasProjectBridge() ? projectPathForCwd : undefined,
      },
      workspaceDispatch,
      sessionsDispatch,
    );
  }

  const disposerRef = useRef(createDeferredDisposer(() => controllerRef.current?.dispose()));
  useEffect(() => {
    const disposer = disposerRef.current;
    disposer.cancelPendingDispose();
    return () => disposer.armForCleanup();
  }, []);

  const session = useMemo(() => selectFocusedSession(sessions), [sessions]);

  const value = useMemo<AcpWorkspaceContextValue>(
    () => ({ workspace, session, sessions, controller: controllerRef.current! }),
    [workspace, session, sessions],
  );

  return <AcpWorkspaceContext.Provider value={value}>{children}</AcpWorkspaceContext.Provider>;
}

export function useAcpWorkspaceContext(): AcpWorkspaceContextValue {
  const ctx = useContext(AcpWorkspaceContext);
  if (!ctx) {
    throw new Error('useAcpWorkspace/useAcpWorkspaceContext must be used within an <AcpWorkspaceProvider>');
  }
  return ctx;
}
