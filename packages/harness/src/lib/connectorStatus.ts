import type { StatusDotStatus } from '@contenox/ui';
import type { TranslationKey } from '../i18n';
import type { Connector, McpServer } from './connectorTypes';

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

export function browserInstallation(connector?: Connector | McpServer) {
  if (
    connector?.name === 'browser' &&
    (!('kind' in connector) || connector.kind === 'mcp') &&
    connector.transport === 'stdio' &&
    connector.command &&
    connector.args?.length === 3 &&
    /(?:^|[\\/])browser-mcp\.cjs$/.test(connector.args[0]) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(connector.args[2])
  )
    return connector.args[2];
}
