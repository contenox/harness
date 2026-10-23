import type { Instance } from './api/types';
import { relativeTime } from './relativeTime';

/**
 * What a paired machine is, in the only three states the relay serves.
 */
export type HostState = 'connected' | 'offline' | 'revoked';

/**
 * Derives one machine's state.
 */
export function hostState(host: Instance): HostState {
  if (host.revoked_at !== null) return 'revoked';
  return host.connected ? 'connected' : 'offline';
}

/**
 * The word for a state — the ONLY place a machine's state is named.
 */
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

/**
 * The line under the name: when the state started, or what it is doing now.
 */
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

/**
 * Whether this machine can be attached to right now.
 */
export function isReachable(host: Instance): boolean {
  return hostState(host) === 'connected';
}
