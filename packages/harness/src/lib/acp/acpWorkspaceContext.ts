import { createContext, useContext } from 'react';
import type { AcpSessionState } from '../../hooks/acpSessionState';
import type { AcpWorkspaceController } from '../../hooks/acpWorkspaceController';
import type { AcpSessionsState, AcpWorkspaceState } from '../../hooks/acpWorkspaceState';

export interface AcpWorkspaceContextValue {
  workspace: AcpWorkspaceState;
  session: AcpSessionState;
  sessions: AcpSessionsState;
  controller: AcpWorkspaceController;
}

export const AcpWorkspaceContext = createContext<AcpWorkspaceContextValue | null>(null);

export function createDeferredDisposer(dispose: () => void): {
  armForCleanup: () => void;
  cancelPendingDispose: () => void;
} {
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

export function useAcpWorkspaceContext(): AcpWorkspaceContextValue {
  const ctx = useContext(AcpWorkspaceContext);
  if (!ctx) {
    throw new Error(
      'useAcpWorkspace/useAcpWorkspaceContext must be used within an <AcpWorkspaceProvider>',
    );
  }
  return ctx;
}
