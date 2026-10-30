import { useCallback, useEffect, useRef } from 'react';
import { clearBrowserHandoff } from '../components/setup/useBrowserHandoff';
import { cancelLoginAttempt, deriveLoginView } from '../lib/loginFlow';
import type {
  CloudProviderType,
  Connection,
  ProviderLoginStart,
  ProviderLoginStatus,
} from '../lib/types';
import {
  useCancelConnectionLogin,
  useConnectionLogout,
  useConnectionLoginStatus,
  useStartConnectionLogin,
} from './useConnections';
import {
  useCancelProviderLogin,
  useProviderLoginStatus,
  useProviderLogout,
  useProviderStatus,
  useStartProviderLogin,
} from './useProviders';

type Parts = {
  login?: ProviderLoginStatus;
  started?: ProviderLoginStart;
  fallbackState: string;
  errors: Array<string | undefined>;
  start: () => void;
  starting: boolean;
  cancelAttempt: () => Promise<unknown>;
  resetStart: () => void;
  cancelling: boolean;
  logout: () => void;
  loggingOut: boolean;
  onSignedIn?: () => void;
};

/** Shared device-code state: derived view, one-shot signed-in callback, cancel with cleanup. */
function useLoginFlowView(parts: Parts) {
  const announced = useRef(false);
  const view = deriveLoginView(parts.login, parts.started, parts.fallbackState);
  const { onSignedIn } = parts;
  const { cancelAttempt, resetStart } = parts;

  useEffect(() => {
    if (!view.signedIn || announced.current) return;
    announced.current = true;
    onSignedIn?.();
  }, [view.signedIn, onSignedIn]);

  const cancel = useCallback(
    () =>
      cancelLoginAttempt({
        cancel: cancelAttempt,
        resetStart,
        clearHandoff: clearBrowserHandoff,
      }).catch(() => undefined),
    [cancelAttempt, resetStart],
  );

  return {
    signedIn: view.signedIn,
    pending: view.pending,
    deviceUrl: view.deviceUrl,
    deviceCode: view.deviceCode,
    error: parts.login?.error ?? parts.errors.find(Boolean) ?? null,
    start: parts.start,
    starting: parts.starting,
    cancel,
    cancelling: parts.cancelling,
    logout: parts.logout,
    loggingOut: parts.loggingOut,
  };
}

/**
 * Device-code login for the backend named after the provider type (first-run sign-in).
 * Cancel only stops the in-progress attempt; it never signs out an established session.
 */
export function useProviderLoginFlow(provider: CloudProviderType, onSignedIn?: () => void) {
  const statusQuery = useProviderStatus(provider);
  const loginQuery = useProviderLoginStatus(provider);
  const startMutation = useStartProviderLogin(provider);
  const cancelMutation = useCancelProviderLogin(provider);
  const logoutMutation = useProviderLogout(provider);

  const { mutateAsync: cancelAsync } = cancelMutation;
  const { reset: resetStart, mutate: startMutate } = startMutation;
  const { mutate: logoutMutate } = logoutMutation;

  return useLoginFlowView({
    login: loginQuery.data,
    started: startMutation.data,
    fallbackState:
      (statusQuery.data?.loginRequired ? 'login_required' : statusQuery.data?.authState) ??
      'login_required',
    errors: [
      startMutation.error?.message,
      cancelMutation.error?.message,
      statusQuery.error?.message,
    ],
    start: useCallback(() => startMutate(), [startMutate]),
    starting: startMutation.isPending,
    cancelAttempt: cancelAsync,
    resetStart,
    cancelling: cancelMutation.isPending,
    logout: useCallback(() => logoutMutate(), [logoutMutate]),
    loggingOut: logoutMutation.isPending,
    onSignedIn,
  });
}

/** Device-code login scoped to one connection (rows in lists, several ChatGPT accounts). */
export function useConnectionLoginFlow(
  connection: Pick<Connection, 'id' | 'authState'>,
  onSignedIn?: () => void,
) {
  const loginQuery = useConnectionLoginStatus(connection.id);
  const startMutation = useStartConnectionLogin(connection.id);
  const cancelMutation = useCancelConnectionLogin(connection.id);
  const logoutMutation = useConnectionLogout(connection.id);

  const { mutateAsync: cancelAsync } = cancelMutation;
  const { reset: resetStart, mutate: startMutate } = startMutation;
  const { mutate: logoutMutate } = logoutMutation;

  return useLoginFlowView({
    login: loginQuery.data,
    started: startMutation.data,
    fallbackState: connection.authState,
    errors: [
      startMutation.error?.message,
      cancelMutation.error?.message,
      logoutMutation.error?.message,
    ],
    start: useCallback(() => startMutate(), [startMutate]),
    starting: startMutation.isPending,
    cancelAttempt: cancelAsync,
    resetStart,
    cancelling: cancelMutation.isPending,
    logout: useCallback(() => logoutMutate(), [logoutMutate]),
    loggingOut: logoutMutation.isPending,
    onSignedIn,
  });
}
