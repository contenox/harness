import { Badge, cn, StatusIndicator } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { relativeTime } from '../lib/relativeTime';
import { composeUnitStatus, type UnitStatusFacts } from '../lib/unitStatus';

export function UnitStatus({
  facts,
  className,
  size = 'sm',
}: {
  facts: UnitStatusFacts;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { t, i18n } = useTranslation();
  const atoms = composeUnitStatus(facts);
  if (atoms.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {atoms.map((atom, i) => {
        const title = atom.titleKey ? t(atom.titleKey) : undefined;

        if (atom.kind === 'process' && atom.indicator) {
          return (
            <span key={i} className="shrink-0" title={title}>
              <StatusIndicator
                status={atom.indicator}
                label={atom.labelKey ? t(atom.labelKey) : undefined}
                showIcon
                size={size}
              />
            </span>
          );
        }

        const label =
          atom.kind === 'liveness' && atom.heartbeat
            ? `${t('unit.liveness_prefix')}: ${relativeTime(atom.heartbeat, i18n.language, t('common.just_now'))}`
            : atom.labelKey
              ? t(atom.labelKey)
              : (atom.label ?? '');

        return (
          <Badge
            key={i}
            variant={atom.variant ?? 'secondary'}
            size="sm"
            title={title}
            className={cn('shrink-0', atom.kind === 'blocked' && 'font-semibold')}>
            {atom.kind === 'blocked' ? `⚠ ${label}` : label}
          </Badge>
        );
      })}
    </div>
  );
}
