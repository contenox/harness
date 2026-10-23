import { describe, expect, it } from 'vitest';
import type { BrowserSession } from '../../../lib/api/types';
import {
  browserSessionLabel,
  browserSessionState,
  canRevoke,
  signedInElsewhere,
} from './browserSessions';

const NOW = Date.parse('2026-08-21T12:00:00Z');
const FUTURE = '2026-09-21T12:00:00Z';
const PAST = '2026-08-01T12:00:00Z';

function session(overrides: Partial<BrowserSession> = {}): BrowserSession {
  return {
    id: 'sess-1',
    user_agent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/124.0',
    created_at: '2026-08-01T12:00:00Z',
    expires_at: FUTURE,
    last_seen_at: null,
    revoked_at: null,
    current: false,
    ...overrides,
  };
}

describe('browserSessionState', () => {
  it('reads an unrevoked session past its expiry as expired, not as signed in', () => {
    expect(browserSessionState(session({ expires_at: PAST }), NOW)).toBe('expired');
  });

  it('reads a live session as signed in', () => {
    expect(browserSessionState(session(), NOW)).toBe('signed_in');
  });

  it('marks the caller’s own browser', () => {
    expect(browserSessionState(session({ current: true }), NOW)).toBe('current');
  });

  it('keeps the caller’s own browser current even past the expiry it reports', () => {
    expect(browserSessionState(session({ current: true, expires_at: PAST }), NOW)).toBe('current');
  });

  it('reports a revoked session as signed out whether or not it also expired', () => {
    expect(browserSessionState(session({ revoked_at: PAST }), NOW)).toBe('signed_out');
    expect(browserSessionState(session({ revoked_at: PAST, expires_at: PAST }), NOW)).toBe(
      'signed_out',
    );
  });

  it('treats an expiry exactly at now as expired', () => {
    expect(browserSessionState(session({ expires_at: new Date(NOW).toISOString() }), NOW)).toBe(
      'expired',
    );
  });

  it('falls back to signed in for an unparseable expiry rather than hiding a live session', () => {
    expect(browserSessionState(session({ expires_at: 'not a date' }), NOW)).toBe('signed_in');
  });
});

describe('signedInElsewhere', () => {
  it('counts only what signing out everywhere else would actually end', () => {
    const sessions = [
      session({ id: 'a', current: true }),
      session({ id: 'b' }),
      session({ id: 'c', expires_at: PAST }),
      session({ id: 'd', revoked_at: PAST }),
    ];
    expect(signedInElsewhere(sessions, NOW)).toBe(1);
  });

  it('is zero when every other browser is expired or signed out', () => {
    const sessions = [
      session({ id: 'a', current: true }),
      session({ id: 'b', expires_at: PAST }),
      session({ id: 'c', revoked_at: PAST }),
    ];
    expect(signedInElsewhere(sessions, NOW)).toBe(0);
  });

  it('is zero for no sessions at all', () => {
    expect(signedInElsewhere([], NOW)).toBe(0);
  });
});

describe('canRevoke', () => {
  it('offers Sign out for a live browser and for nothing else', () => {
    expect(canRevoke('signed_in')).toBe(true);
    expect(canRevoke('current')).toBe(false);
    expect(canRevoke('expired')).toBe(false);
    expect(canRevoke('signed_out')).toBe(false);
  });
});

describe('browserSessionLabel', () => {
  it('gives expired its own word rather than reusing either neighbour', () => {
    expect(browserSessionLabel('expired')).toBe('Expired');
    expect(browserSessionLabel('signed_in')).toBe('Signed in');
    expect(browserSessionLabel('signed_out')).toBe('Signed out');
    expect(browserSessionLabel('current')).toBe('This browser');
  });
});
