import type { Status } from '@contenox/ui';
import type { TranslationKey } from '../../../i18n';
import { relativeTime } from '../../../lib/relativeTime';
import type { MissionReportKind, MissionStatus } from '../../../lib/types';

export const MISSION_STATUS_INDICATOR: Record<MissionStatus, Status> = {
  open: 'in-progress',
  landed: 'completed',
  derailed: 'error',
  stuck: 'warning',
  abandoned: 'planned',
};

export const MISSION_STATUS_LABEL_KEY: Record<MissionStatus, TranslationKey> = {
  open: 'missions.status.open',
  landed: 'missions.status.landed',
  derailed: 'missions.status.derailed',
  stuck: 'missions.status.stuck',
  abandoned: 'missions.status.abandoned',
};

type ReportBadgeVariant = 'error' | 'accent' | 'secondary' | 'success';

export const REPORT_KIND_BADGE_VARIANT: Record<MissionReportKind, ReportBadgeVariant> = {
  blocker: 'error',
  finding: 'accent',
  progress: 'secondary',
  result: 'success',
};

export const REPORT_KIND_LABEL_KEY: Record<MissionReportKind, TranslationKey> = {
  progress: 'missions.report_kind.progress',
  finding: 'missions.report_kind.finding',
  blocker: 'missions.report_kind.blocker',
  result: 'missions.report_kind.result',
};

export function heartbeatLabel(
  lastHeartbeat: string | undefined,
  locale: string,
  labels: { never: string; justNow: string },
): string {
  if (!lastHeartbeat) return labels.never;
  return relativeTime(lastHeartbeat, locale, labels.justNow);
}
