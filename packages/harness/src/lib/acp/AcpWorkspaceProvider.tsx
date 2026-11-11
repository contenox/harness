import { WebSocketTransport } from '@contenox/acp-client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
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
} from '../../hooks/acpWorkspaceState';
import {
  acpWsUrl,
  ensureProjectPrefix,
  hasProjectBridge,
  projectPathForCwd,
} from '../projectRuntime';
import { agentsConfigKeys, envelopeKeys, workspaceAccessKeys } from '../queryKeys';
import {
  AcpWorkspaceContext,
  createDeferredDisposer,
  type AcpWorkspaceContextValue,
} from './acpWorkspaceContext';

export interface AcpWorkspaceProviderProps {
  children: ReactNode;
}

export function AcpWorkspaceProvider({ children }: AcpWorkspaceProviderProps) {
  const [workspace, workspaceDispatch] = useReducer(acpWorkspaceReducer, initialAcpWorkspaceState);
  const [sessions, sessionsDispatch] = useReducer(acpSessionsReducer, initialAcpSessionsState);
  const queryClient = useQueryClient();

  const controllerRef = useRef<AcpWorkspaceController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createAcpWorkspaceController(
      {
        createTransport: async (target, attempt) => {
          const prefix = target ? await ensureProjectPrefix(target, { force: attempt > 0 }) : '';
          return new WebSocketTransport(acpWsUrl(prefix));
        },
        resolveProject: hasProjectBridge() ? projectPathForCwd : undefined,
        fetchWorkspaceConfigOptions: client => client.workspaceConfigOptions(),
        onAgentDeclarationsChanged: () => {
          void queryClient.invalidateQueries({ queryKey: agentsConfigKeys.all });
          void queryClient.invalidateQueries({ queryKey: envelopeKeys.all });
          void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.all });
        },
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
