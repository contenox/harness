import { useMemo } from 'react';
import { useSetupStatus } from '../../hooks/useSetupStatus';
import type { SetupStatus } from '../../lib/types';

export function isSetupComplete(data: SetupStatus | undefined): boolean {
  if (!data) return false;
  const hasErrors = (data.issues ?? []).some(i => i.severity === 'error');
  return !hasErrors && data.reachableBackendCount > 0;
}

/** Decides whether the signed-in user still has to finish provider setup. */
export function useSetupGate(signedIn: boolean) {
  const { data, isLoading, isError } = useSetupStatus(signedIn);
  const complete = useMemo(() => isSetupComplete(data), [data]);
  // A failing status endpoint must not lock the user out of the app behind the sign-in screen.
  const showSignIn = signedIn && !isLoading && !complete && !(isError && !data);
  return { data, loading: signedIn && isLoading, showSignIn };
}
