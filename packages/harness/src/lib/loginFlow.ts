import type { ProviderLoginStart, ProviderLoginStatus } from './types';

export type LoginView = {
  state: string;
  signedIn: boolean;
  pending: boolean;
  deviceUrl?: string;
  deviceCode?: string;
};

/**
 * Newest information wins: the polled login status, then the response of the start call, then
 * the state known from the provider/connection status.
 */
export function deriveLoginView(
  login: ProviderLoginStatus | undefined,
  started: ProviderLoginStart | undefined,
  fallbackState: string,
): LoginView {
  const state = login?.state ?? started?.state ?? fallbackState;
  const pending = state === 'login_pending';
  return {
    state,
    signedIn: state === 'authenticated',
    pending,
    deviceUrl: pending ? (login?.url ?? started?.url) : undefined,
    deviceCode: pending ? (login?.code ?? started?.code) : undefined,
  };
}

/**
 * Cancelling a device-code attempt: ask the runtime to cancel (never logout), then always drop
 * the local traces so a new attempt starts clean and re-opens the browser.
 */
export async function cancelLoginAttempt(steps: {
  cancel: () => Promise<unknown>;
  resetStart: () => void;
  clearHandoff: () => void;
}): Promise<void> {
  try {
    await steps.cancel();
  } finally {
    steps.resetStart();
    steps.clearHandoff();
  }
}
