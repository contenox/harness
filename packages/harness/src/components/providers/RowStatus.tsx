import { StatusDot } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { connectionStatus } from '../../lib/connectionStatus';
import { rollupStatus } from '../../lib/providerListState';
import type { Connection } from '../../lib/types';

/** The single dot on a provider row summarising its connections (nothing when there are none). */
export function RowStatus({ connections }: { connections: Connection[] }) {
  const { t } = useTranslation();
  const dot = rollupStatus(connections);
  if (!dot) return null;
  const pick = connections.find(c => connectionStatus(c).attention) ?? connections[0];
  return <StatusDot status={dot} aria-label={t(connectionStatus(pick).summaryKey)} />;
}
