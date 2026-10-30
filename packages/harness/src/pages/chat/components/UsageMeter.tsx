import { formatCompactNumber, ProgressBar, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { AcpUsageState } from '../../../hooks/acpSessionState';

export function UsageMeter({
  usage,
  max,
  compact = false,
}: {
  usage: AcpUsageState | null;
  /** Effective limit (selected token limit, else the reported window); defaults to usage.size. */
  max?: number;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const size = max && max > 0 ? max : (usage?.size ?? 0);
  if (!usage || size <= 0) return null;

  const pct = Math.min(100, Math.max(0, Math.round((usage.used / size) * 100)));
  const palette = pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'neutral';
  const exact = `${usage.used.toLocaleString(locale)} / ${size.toLocaleString(locale)}`;

  if (compact) {
    return (
      <Span
        variant="muted"
        className="shrink-0 text-xs tabular-nums"
        title={exact}
        aria-label={`${t('acp_chat.usage_label')}: ${pct}%`}>
        {pct}%
      </Span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2" aria-label={t('acp_chat.usage_label')}>
      <ProgressBar value={pct} palette={palette} className="w-16 sm:w-28" />
      <Span variant="muted" className="text-xs tabular-nums" title={exact}>
        {formatCompactNumber(usage.used, locale)} / {formatCompactNumber(size, locale)}
      </Span>
    </div>
  );
}
