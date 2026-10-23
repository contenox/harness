import { describe, expect, it } from 'vitest';
import { ConnectionState, isConnectionBlocked } from './ConnectionState';
import type { AcpWorkspaceState } from '../state/acpWorkspaceState';

type Status = AcpWorkspaceState['status'];

const ALL_STATUSES: Status[] = [
  'connecting',
  'ready',
  'reconnecting',
  'disconnected',
  'error',
  'setup_required',
];

function stateFor(status: Status): AcpWorkspaceState {
  return { status, sessions: [], error: null } as unknown as AcpWorkspaceState;
}

describe('isConnectionBlocked', () => {






  it('disagrees with the element the component returns for no status', () => {
    for (const status of ALL_STATUSES) {
      const rendered = ConnectionState({ workspace: stateFor(status), onReconnect: () => {} });
      expect(
        isConnectionBlocked(status),
        `isConnectionBlocked(${status}) must match whether ConnectionState renders`,
      ).toBe(rendered !== null);
    }
  });

  it('does not block a healthy connection', () => {
    expect(isConnectionBlocked('ready')).toBe(false);
    expect(isConnectionBlocked('reconnecting')).toBe(false);
  });

  it('blocks the statuses that replace the screen', () => {
    expect(isConnectionBlocked('connecting')).toBe(true);
    expect(isConnectionBlocked('disconnected')).toBe(true);
    expect(isConnectionBlocked('error')).toBe(true);
    expect(isConnectionBlocked('setup_required')).toBe(true);
  });



  it('returns a truthy element even when it renders nothing', () => {
    const element = <ConnectionState workspace={stateFor('ready')} onReconnect={() => {}} />;
    expect(Boolean(element)).toBe(true);
    expect(isConnectionBlocked('ready')).toBe(false);
  });
});
