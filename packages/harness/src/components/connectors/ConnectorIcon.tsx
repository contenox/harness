import { Globe, Plug, SquareTerminal, Wrench } from 'lucide-react';
import type { Connector } from '../../lib/connectorTypes';

export function ConnectorIcon({ connector }: { connector: Pick<Connector, 'kind' | 'transport'> }) {
  if (connector.kind === 'builtin') return <Wrench />;
  if (connector.kind === 'openapi') return <Plug />;
  if (connector.transport === 'stdio') return <SquareTerminal />;
  return <Globe />;
}
