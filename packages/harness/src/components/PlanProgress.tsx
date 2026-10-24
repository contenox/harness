import { cn, StatusIndicator } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { planProgress } from '../lib/missionPlan';
import type { MissionPlan } from '../lib/types';

export function PlanProgress({
  plan,
  className,
}: {
  plan?: MissionPlan | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const progress = planProgress(plan);
  if (!progress) return null;

  const { completed, total, inProgress } = progress;

  return (
    <span
      className={cn(
        'text-text-muted dark:text-dark-text-muted inline-flex shrink-0 items-center gap-1.5 text-xs',
        className,
      )}
      title={
        inProgress > 0
          ? t('plan.progress_title_active', { completed, total, inProgress })
          : t('plan.progress_title', { completed, total })
      }>
      {inProgress > 0 && (
        <StatusIndicator status="in-progress" size="sm" aria-hidden />
      )}
      <span className="tabular-nums">{t('plan.steps', { completed, total })}</span>
    </span>
  );
}
