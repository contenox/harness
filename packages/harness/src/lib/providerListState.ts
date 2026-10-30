import type { StatusDotStatus } from '@contenox/ui';
import { connectionStatus } from './connectionStatus';
import { initialValues, type ProviderSetupValues } from './providerSetupValues';
import type { CloudProviderSetup } from './providerCatalog';
import type { Connection } from './types';

/** UI state of the provider list: one open row, and an unsaved draft per provider. */
export type ProviderListState = {
  expanded: string | null;
  drafts: Record<string, ProviderSetupValues>;
};

export type ProviderListAction =
  | { type: 'expand'; provider: string; expanded: boolean }
  | { type: 'draft'; provider: string; values: ProviderSetupValues }
  | { type: 'clearDraft'; provider: string };

export const initialProviderListState: ProviderListState = { expanded: null, drafts: {} };

export function providerListReducer(
  state: ProviderListState,
  action: ProviderListAction,
): ProviderListState {
  switch (action.type) {
    case 'expand':
      // One row open at a time; closing a row that is not the open one is a no-op.
      if (action.expanded) return { ...state, expanded: action.provider };
      return state.expanded === action.provider ? { ...state, expanded: null } : state;
    case 'draft':
      return { ...state, drafts: { ...state.drafts, [action.provider]: action.values } };
    case 'clearDraft': {
      if (!(action.provider in state.drafts)) return state;
      const drafts = { ...state.drafts };
      delete drafts[action.provider];
      return { ...state, drafts };
    }
  }
}

/** The draft for a provider, or its fresh defaults (prefilled address) when there is none. */
export function draftFor(state: ProviderListState, setup: CloudProviderSetup): ProviderSetupValues {
  return state.drafts[setup.provider] ?? initialValues(setup);
}

export function groupConnections(connections: Connection[]): Map<string, Connection[]> {
  const byType = new Map<string, Connection[]>();
  for (const connection of connections) {
    const list = byType.get(connection.providerType) ?? [];
    list.push(connection);
    byType.set(connection.providerType, list);
  }
  return byType;
}

/**
 * One dot for a provider row that has connections: anything needing attention wins, then
 * in-progress, then available. No connections -> undefined (no dot).
 */
export function rollupStatus(connections: Connection[]): StatusDotStatus | undefined {
  if (connections.length === 0) return undefined;
  const dots = connections.map(c => connectionStatus(c));
  const worst = dots.find(s => s.attention);
  if (worst) return worst.statusDot;
  if (dots.some(s => s.statusDot === 'checking')) return 'checking';
  if (dots.some(s => s.statusDot === 'available')) return 'available';
  return 'unknown';
}
