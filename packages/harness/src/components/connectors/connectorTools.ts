import type { Connector } from '../../lib/connectorTypes';

export function samePath(a: string, b: string) {
  return a.replace(/[\\/]+$/, '').toLowerCase() === b.replace(/[\\/]+$/, '').toLowerCase();
}

export function hiddenAt(connector: Connector, workspace: string): string[] {
  const entries = Object.entries(connector.hidden ?? {});
  const found = entries.find(([scope]) =>
    workspace ? scope !== '' && samePath(scope, workspace) : scope === '',
  );
  return found?.[1] ?? [];
}
