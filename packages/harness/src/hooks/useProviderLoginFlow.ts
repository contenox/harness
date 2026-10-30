import { useEffect, useRef } from 'react';
import type { CloudProviderType } from '../lib/types';
import {
  useProviderLoginStatus,
  useProviderLogout,
  useProviderStatus,
  useStartProviderLogin,
} from './useProviders';

/** Device-code login state shared by ProviderLogin and the first-run sign-in screen. */
export function useProviderLoginFlow(provider: CloudProviderType, onSignedIn?: () => void) {
  const statusQuery = useProviderStatus(provider);
  const loginQuery = useProviderLoginStatus(provider);
  const startMutation = useStartProviderLogin(provider);
  // The runtime's logout also cancels a pending device-code attempt.
  const logoutMutation = useProviderLogout(provider);
  const announced = useRef(false);

  const login = loginQuery.data;
  const started = startMutation.data;
  const state =
    login?.state ??
    started?.state ??
    (statusQuery.data?.loginRequired ? 'login_required' : statusQuery.data?.authState) ??
    'login_required';
  const signedIn = state === 'authenticated';
  const pending = state === 'login_pending';

  useEffect(() => {
    if (!signedIn || announced.current) return;
    announced.current = true;
    onSignedIn?.();
  }, [signedIn, onSignedIn]);

  return {
    signedIn,
    pending,
    deviceUrl: pending ? (login?.url ?? started?.url) : undefined,
    deviceCode: pending ? (login?.code ?? started?.code) : undefined,
    error: login?.error ?? startMutation.error?.message ?? statusQuery.error?.message ?? null,
    start: () => startMutation.mutate(),
    starting: startMutation.isPending,
    cancel: () => logoutMutation.mutate(undefined, { onSettled: () => startMutation.reset() }),
    cancelling: logoutMutation.isPending,
  };
}
