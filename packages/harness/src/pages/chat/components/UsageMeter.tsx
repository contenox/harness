import { formatCompactNumber, ProgressBar, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { AcpUsageState } from '../../../hooks/acpSessionState';

export function UsageMeter({ usage, compact = false }: { usage: AcpUsageState | null; compact?: boolean }) {
  const { t } = useTranslation();
  if (!usage || usage.size <= 0) return null;

  const pct = Math.min(100, Math.max(0, Math.round((usage.used / usage.size) * 100)));
  const palette = pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'neutral';
  const exact = `${usage.used.toLocaleString()} / ${usage.size.toLocaleString()}`;

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
        {formatCompactNumber(usage.used)} / {formatCompactNumber(usage.size)}
      </Span>
    </div>
  );
}
