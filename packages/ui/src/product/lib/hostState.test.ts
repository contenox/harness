import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Instance } from './api/types';
import { hostDetail, hostState, hostStateLabel, isReachable } from './hostState';

const NOW = Date.parse('2026-08-21T12:00:00Z');

function host(overrides: Partial<Instance> = {}): Instance {
  return {
    id: 'inst-1',
    account_id: 'acct-1',
    name: 'mbp',
    created_at: '2026-08-01T12:00:00Z',
    last_seen_at: null,
    revoked_at: null,
    connected: false,
    ...overrides,
  };
}

function freeze(): void {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
}


function hoursAgo(hours: number): string {
  return new Date(NOW - hours * 60 * 60 * 1000).toISOString();
}

afterEach(() => {
  vi.useRealTimers();
});

describe('hostState', () => {
  it('is connected for a live machine', () => {
    expect(hostState(host({ connected: true }))).toBe('connected');
  });

  it('is offline for a paired machine holding no connection', () => {
    expect(hostState(host())).toBe('offline');
  });

  it('is revoked whatever the live registry still says', () => {
    expect(hostState(host({ connected: true, revoked_at: hoursAgo(1) }))).toBe('revoked');
  });
});

describe('hostStateLabel', () => {
  it('gives each state exactly one word, shared by both screens', () => {
    expect(hostStateLabel('connected')).toBe('Connected');
    expect(hostStateLabel('offline')).toBe('Offline');
    expect(hostStateLabel('revoked')).toBe('Revoked');
  });
});

describe('hostDetail', () => {
  it('says what a connected machine is doing rather than when it started', () => {
    expect(hostDetail(host({ connected: true }))).toBe('Holding a connection now');
  });

  it('dates an offline machine from its last connection', () => {
    freeze();
    expect(hostDetail(host({ last_seen_at: hoursAgo(3) }))).toBe('Last seen 3 hours ago');
  });

  it('distinguishes never connected from offline for a while', () => {
    freeze();
    expect(hostDetail(host())).toBe('Never connected');
  });

  it('dates a revoked machine from its revocation, not from its last connection', () => {
    freeze();
    expect(hostDetail(host({ last_seen_at: hoursAgo(50), revoked_at: hoursAgo(2) }))).toBe(
      'Revoked 2 hours ago',
    );
  });
});

describe('isReachable', () => {
  it('is true only for a connected, unrevoked machine', () => {
    expect(isReachable(host({ connected: true }))).toBe(true);
    expect(isReachable(host())).toBe(false);
    expect(isReachable(host({ connected: true, revoked_at: hoursAgo(1) }))).toBe(false);
  });
});
