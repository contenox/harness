import { Badge, cn, Span, StatusIndicator } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { relativeTime } from '../lib/relativeTime';
import { composeUnitStatus, type UnitStatusFacts } from '../lib/unitStatus';

export function UnitStatus({
  facts,
  className,
  size = 'sm',
  showReason = true,
}: {
  facts: UnitStatusFacts;
  className?: string;
  size?: 'sm' | 'md';
  showReason?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const atoms = composeUnitStatus(facts);
  if (atoms.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {atoms.map((atom, i) => {
        const title = atom.titleKey ? t(atom.titleKey) : undefined;
        const label = atom.labelKey ? t(atom.labelKey) : (atom.label ?? '');

        if (atom.kind === 'primary' && atom.indicator) {
          return (
            <span key={i} className="flex max-w-full min-w-0 items-center gap-2" title={title}>
              <StatusIndicator status={atom.indicator} label={label} showIcon size={size} />
              {showReason && atom.reason && (
                <Span variant="muted" className="min-w-0 truncate text-xs" title={atom.reason}>
                  {atom.reason}
                </Span>
              )}
            </span>
          );
        }

        const badgeLabel =
          atom.kind === 'liveness' && atom.heartbeat
            ? `${t('unit.liveness_prefix')}: ${relativeTime(atom.heartbeat, i18n.language, t('common.just_now'))}`
            : label;

        return (
          <Badge
            key={i}
            variant={atom.variant ?? 'secondary'}
            size="sm"
            title={title}
            className="shrink-0">
            {badgeLabel}
          </Badge>
        );
      })}
    </div>
  );
}
