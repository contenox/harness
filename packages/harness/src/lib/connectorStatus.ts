import type { StatusDotStatus } from '@contenox/ui';
import type { TranslationKey } from '../i18n';
import type { Connector } from './connectorTypes';

export function connectorDot(c: Pick<Connector, 'status'>, checking = false): StatusDotStatus {
  if (checking) return 'checking';
  if (c.status === 'ready') return 'available';
  if (c.status === 'needs_sign_in') return 'attention';
  return 'unavailable';
}

export function connectorSummaryKey(c: Pick<Connector, 'status'>): TranslationKey {
  if (c.status === 'ready') return 'connectors.status.ready';
  if (c.status === 'needs_sign_in') return 'connectors.status.needs_sign_in';
  return 'connectors.status.unavailable';
}

export function connectorWhere(
  c: Pick<Connector, 'kind' | 'transport' | 'command' | 'args' | 'url'>,
): string {
  if (c.kind === 'mcp' && c.transport === 'stdio')
    return [c.command, ...(c.args ?? [])].filter(Boolean).join(' ');
  return c.url ?? '';
}

export function isOwnedConnector(c: Pick<Connector, 'kind' | 'scope'>): boolean {
  return c.kind !== 'builtin' && (c.scope === 'everywhere' || c.scope === 'workspace');
}
