import type { Instance } from './api/types';
import { relativeTime } from './relativeTime';

export type HostState = 'connected' | 'offline' | 'revoked';

export function hostState(host: Instance): HostState {
  if (host.revoked_at !== null) return 'revoked';
  return host.connected ? 'connected' : 'offline';
}

export function hostStateLabel(state: HostState): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'offline':
      return 'Offline';
    case 'revoked':
      return 'Revoked';
  }
}

export function hostDetail(host: Instance): string {
  switch (hostState(host)) {
    case 'revoked':
      return host.revoked_at === null
        ? 'Revoked'
        : `Revoked ${relativeTime(host.revoked_at, 'just now')}`;
    case 'connected':
      return 'Holding a connection now';
    case 'offline':
      return host.last_seen_at === null
        ? 'Never connected'
        : `Last seen ${relativeTime(host.last_seen_at, 'just now')}`;
  }
}

export function isReachable(host: Instance): boolean {
  return hostState(host) === 'connected';
}
