import { Badge } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { MissionChangeScope } from '../lib/types';


export function ScopeBadge({ scope }: { scope: MissionChangeScope }) {
  const { t } = useTranslation();
  return (
    <Badge variant="secondary" size="sm" title={t('scope.count_title')}>
      {t('scope.count', { files: scope.files, dirs: scope.dirs })}
    </Badge>
  );
}

export function ScopeAnomalyChip({ scope }: { scope: MissionChangeScope }) {
  const { t } = useTranslation();
  if (!scope.anomaly) return null;
  return (
    <Badge
      variant="warning"
      size="sm"
      className="shrink-0 font-semibold"
      title={t('scope.anomaly_chip_title')}>
      {`⚠ ${t('scope.anomaly_chip')}`}
    </Badge>
  );
}
