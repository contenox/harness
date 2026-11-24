import { useContext } from 'react';
import { useSetupStatus } from '../../hooks/useSetupStatus';
import { HasSavedSessionsContext } from '../../lib/acp/acpWorkspaceContext';
import type { SetupStatus } from '../../lib/types';

export function isSetupComplete(data: SetupStatus | undefined): boolean {
  if (!data) return false;
  const hasErrors = (data.issues ?? []).some(i => i.severity === 'error');
  return !hasErrors && data.reachableBackendCount > 0;
}

/** Decides whether the signed-in user still has to finish provider setup. */
export function useSetupGate(signedIn: boolean) {
  const { data, isLoading, isError } = useSetupStatus(signedIn);
  const hasSavedSessions = useContext(HasSavedSessionsContext);
  const needsSetup = signedIn && !hasSavedSessions;
  // A failing status endpoint must not lock the user out of the app behind the sign-in screen.
  const showSignIn = needsSetup && !isLoading && !isSetupComplete(data) && !(isError && !data);
  return { data, loading: needsSetup && isLoading, showSignIn };
}
