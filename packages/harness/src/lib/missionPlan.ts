import type { Status } from '@contenox/ui';
import type { TranslationKey } from '../i18n';
import type { MissionPlan, MissionPlanEntryPriority, MissionPlanEntryStatus } from './types';

export type PlanProgress = {
  completed: number;
  total: number;
  inProgress: number;
};

export function planProgress(plan?: MissionPlan | null): PlanProgress | null {
  const entries = plan?.entries;
  if (!entries || entries.length === 0) return null;
  let completed = 0;
  let inProgress = 0;
  for (const entry of entries) {
    if (entry.status === 'completed') completed += 1;
    else if (entry.status === 'in_progress') inProgress += 1;
  }
  return { completed, total: entries.length, inProgress };
}

export function hasPlan(plan?: MissionPlan | null): boolean {
  return planProgress(plan) !== null;
}

export const PLAN_ENTRY_STATUS_INDICATOR: Record<MissionPlanEntryStatus, Status> = {
  pending: 'planned',
  in_progress: 'in-progress',
  completed: 'completed',
};

export const PLAN_ENTRY_STATUS_LABEL_KEY: Record<MissionPlanEntryStatus, TranslationKey> = {
  pending: 'plan.status_pending',
  in_progress: 'plan.status_in_progress',
  completed: 'plan.status_completed',
};

export const PLAN_ENTRY_PRIORITY_LABEL_KEY: Record<MissionPlanEntryPriority, TranslationKey> = {
  high: 'plan.priority_high',
  medium: 'plan.priority_medium',
  low: 'plan.priority_low',
};
