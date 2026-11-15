import { formatCompactNumber, ProgressBar, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { AcpUsageState } from '../../../hooks/acpSessionState';

export function UsageMeter({
  usage,
  max,
  userMessages,
  compact = false,
}: {
  usage: AcpUsageState | null;
  userMessages?: number;
  max?: number;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const size = max && max > 0 ? max : (usage?.size ?? 0);
  if (!usage || size <= 0) return null;

  const pct = Math.min(100, Math.max(0, Math.round((usage.used / size) * 100)));
  const palette = pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'neutral';
  const exact = t('acp_chat.usage_details', {
    used: usage.used.toLocaleString(locale),
    size: size.toLocaleString(locale),
  });
  const description =
    userMessages === undefined
      ? exact
      : exact + ' ' + t('acp_chat.usage_turns', { count: userMessages });

  if (compact) {
    return (
      <Span
        variant="muted"
        className="shrink-0 text-xs tabular-nums"
        title={description}
        aria-label={description}>
        {pct}%
      </Span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2" aria-label={description}>
      <ProgressBar value={pct} palette={palette} className="w-16 sm:w-28" />
      <Span variant="muted" className="text-xs tabular-nums" title={description}>
        {formatCompactNumber(usage.used, locale)} / {formatCompactNumber(size, locale)}
      </Span>
    </div>
  );
}
