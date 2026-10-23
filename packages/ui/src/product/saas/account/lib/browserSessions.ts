import type { BrowserSession } from '../../../lib/api/types';

/**
 * What one row on the signed-in-devices screen actually is.
 */
export type BrowserSessionState = 'current' | 'signed_in' | 'expired' | 'signed_out';

/**
 * Derives one session's state at `now`.
 */
export function browserSessionState(session: BrowserSession, now: number): BrowserSessionState {
  if (session.revoked_at !== null) return 'signed_out';
  if (session.current) return 'current';
  return hasExpired(session, now) ? 'expired' : 'signed_in';
}

/**
 * How many OTHER browsers "sign out everywhere else" would actually end.
 */
export function signedInElsewhere(sessions: readonly BrowserSession[], now: number): number {
  return sessions.filter(session => browserSessionState(session, now) === 'signed_in').length;
}

/**
 * Whether this session may be signed out — only a live one that is not the caller's own.
 */
export function canRevoke(state: BrowserSessionState): boolean {
  return state === 'signed_in';
}

/**
 * The badge on the row, one label per state.
 */
export function browserSessionLabel(state: BrowserSessionState): string {
  switch (state) {
    case 'current':
      return 'This browser';
    case 'signed_in':
      return 'Signed in';
    case 'expired':
      return 'Expired';
    case 'signed_out':
      return 'Signed out';
  }
}

function hasExpired(session: BrowserSession, now: number): boolean {
  const expires = Date.parse(session.expires_at);
  return !Number.isNaN(expires) && expires <= now;
}
