import { Badge, Section, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { relativeTime } from '../lib/relativeTime';
import { formatRevisionDelta, revisionsNewestFirst } from '../lib/planRevisions';
import type { PlanRevisionSummary } from '../lib/types';

export function MissionRevisionFeed({ revisions }: { revisions?: PlanRevisionSummary[] | null }) {
  const { t, i18n } = useTranslation();
  const ordered = revisionsNewestFirst(revisions);
  if (ordered.length === 0) return null;

  return (
    <Section title={t('revisions.title')}>
      <ol className="mt-3 space-y-2">
        {ordered.map(rev => (
          <li key={rev.revision} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
            <Badge variant="outline" size="sm" className="shrink-0 tabular-nums">
              {t('revisions.delta', {
                delta: formatRevisionDelta(rev.added, rev.removed),
              })}
            </Badge>
            <span className="text-text dark:text-dark-text min-w-0 break-words">
              {rev.explanation?.trim() ? (
                rev.explanation
              ) : (
                <Span variant="muted">{t('revisions.no_explanation')}</Span>
              )}
            </span>
            <span
              className="text-text-muted dark:text-dark-text-muted ml-auto shrink-0 text-xs"
              title={t('revisions.revision_label', { n: rev.revision })}>
              {relativeTime(rev.at, i18n.language, t('common.just_now'))}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function PlanRevisionLine({ revisions }: { revisions?: PlanRevisionSummary[] | null }) {
  const { t } = useTranslation();
  const ordered = revisionsNewestFirst(revisions);
  const latest = ordered[0];
  if (!latest) return null;
  const delta = formatRevisionDelta(latest.added, latest.removed);
  const why = latest.explanation?.trim();
  return (
    <Span
      variant="muted"
      className="inline-flex min-w-0 items-baseline gap-1 text-xs"
      title={t('revisions.revision_label', { n: latest.revision })}>
      <span className="tabular-nums">{delta}</span>
      {why && <span className="truncate">— {why}</span>}
    </Span>
  );
}
