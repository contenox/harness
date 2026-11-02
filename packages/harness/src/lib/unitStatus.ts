import type { Status } from '@contenox/ui';
import type { TranslationKey } from '../i18n';
import type { FleetInstanceState, HITLApproval, MissionReport, MissionStatus } from './types';

export type UnitStatusFacts = {
  instanceState?: FleetInstanceState;
  missionStatus?: MissionStatus;
  lastHeartbeat?: string;
  lastError?: string;
  blocked?: boolean;
};

export type UnitStatusBadgeVariant = 'success' | 'error' | 'warning' | 'outline' | 'secondary';

export type UnitStatusAtomKind = 'primary' | 'liveness';

export type UnitPrimaryKind =
  | 'done'
  | 'failed'
  | 'stuck'
  | 'stopped'
  | 'needs_you'
  | 'working'
  | 'idle'
  | 'process'
  | 'unknown';

export type UnitStatusAtom = {
  kind: UnitStatusAtomKind;
  primary?: UnitPrimaryKind;
  labelKey?: TranslationKey;
  label?: string;
  titleKey?: TranslationKey;
  indicator?: Status;
  variant?: UnitStatusBadgeVariant;
  heartbeat?: string;
  reason?: string;
};

export const PROCESS_STATUS_INDICATOR: Record<FleetInstanceState, Status> = {
  running: 'completed',
  starting: 'in-progress',
  stopped: 'planned',
  warning: 'warning',
  error: 'error',
};

export const PROCESS_LABEL_KEY: Record<FleetInstanceState, TranslationKey> = {
  starting: 'fleet.state.starting',
  running: 'fleet.state.running',
  stopped: 'fleet.state.stopped',
  warning: 'fleet.state.warning',
  error: 'fleet.state.error',
};

type VerdictKind = Exclude<UnitPrimaryKind, 'process' | 'unknown'>;

const PRIMARY: Record<
  VerdictKind,
  { labelKey: TranslationKey; titleKey: TranslationKey; indicator: Status }
> = {
  done: {
    labelKey: 'unit.primary_done',
    titleKey: 'unit.verdict_landed_title',
    indicator: 'completed',
  },
  failed: {
    labelKey: 'unit.primary_failed',
    titleKey: 'unit.verdict_derailed_title',
    indicator: 'error',
  },
  stuck: {
    labelKey: 'unit.primary_stuck',
    titleKey: 'unit.verdict_stuck_title',
    indicator: 'warning',
  },
  stopped: {
    labelKey: 'unit.primary_stopped',
    titleKey: 'unit.verdict_abandoned_title',
    indicator: 'planned',
  },
  needs_you: {
    labelKey: 'unit.primary_needs_you',
    titleKey: 'unit.blocked_title',
    indicator: 'warning',
  },
  working: {
    labelKey: 'unit.primary_working',
    titleKey: 'unit.primary_working_title',
    indicator: 'in-progress',
  },
  idle: {
    labelKey: 'unit.primary_idle',
    titleKey: 'unit.verdict_open_title',
    indicator: 'planned',
  },
};

const WORKING_STATES: FleetInstanceState[] = ['running', 'starting', 'warning'];

function verdictAtom(kind: VerdictKind, reason?: string): UnitStatusAtom {
  const copy = PRIMARY[kind];
  return {
    kind: 'primary',
    primary: kind,
    labelKey: copy.labelKey,
    titleKey: copy.titleKey,
    indicator: copy.indicator,
    ...(reason ? { reason } : {}),
  };
}

export function deriveUnitPrimary(facts: UnitStatusFacts): UnitStatusAtom | null {
  const reason = facts.lastError?.trim() || undefined;
  switch (facts.missionStatus) {
    case 'landed':
      return verdictAtom('done');
    case 'derailed':
      return verdictAtom('failed', reason);
    case 'stuck':
      return verdictAtom('stuck', reason);
    case 'abandoned':
      return verdictAtom('stopped');
    case 'open':
      break;
    case undefined:
      if (facts.blocked) return verdictAtom('needs_you');
      if (!facts.instanceState) return null;
      return {
        kind: 'primary',
        primary: 'process',
        labelKey: PROCESS_LABEL_KEY[facts.instanceState],
        indicator: PROCESS_STATUS_INDICATOR[facts.instanceState],
      };
    default:
      return {
        kind: 'primary',
        primary: 'unknown',
        label: facts.missionStatus,
        titleKey: 'unit.verdict_unknown_title',
        indicator: 'info',
      };
  }
  if (facts.blocked) return verdictAtom('needs_you');
  if (reason || facts.instanceState === 'error') return verdictAtom('failed', reason);
  if (facts.instanceState && WORKING_STATES.includes(facts.instanceState)) {
    return verdictAtom('working');
  }
  return verdictAtom('idle');
}

export function composeUnitStatus(facts: UnitStatusFacts): UnitStatusAtom[] {
  const atoms: UnitStatusAtom[] = [];
  const primary = deriveUnitPrimary(facts);
  if (primary) atoms.push(primary);

  if (facts.missionStatus === 'open' && primary?.primary !== 'failed') {
    atoms.push(
      facts.lastHeartbeat
        ? {
            kind: 'liveness',
            heartbeat: facts.lastHeartbeat,
            titleKey: 'unit.liveness_title',
            variant: 'secondary',
          }
        : {
            kind: 'liveness',
            labelKey: 'missions.heartbeat_never',
            titleKey: 'unit.liveness_never_title',
            variant: 'secondary',
          },
    );
  }

  return atoms;
}

export function unitAttentionRank(facts: UnitStatusFacts): number | null {
  const primary = deriveUnitPrimary(facts)?.primary;
  if (primary === 'failed' || facts.instanceState === 'error') return 0;
  if (primary === 'stuck' || primary === 'needs_you' || facts.instanceState === 'warning') return 1;
  return null;
}

export function pendingApprovalMissionIds(
  approvals: readonly HITLApproval[] | undefined,
): Set<string> {
  const ids = new Set<string>();
  for (const approval of approvals ?? []) {
    const missionId = approval.missionId?.trim();
    if (approval.state === 'pending' && missionId) ids.add(missionId);
  }
  return ids;
}

export function needsYouMissionIds(
  reports: MissionReport[],
  approvals: readonly HITLApproval[] | undefined,
): Set<string> {
  const ids = blockedMissionIds(reports);
  for (const id of pendingApprovalMissionIds(approvals)) ids.add(id);
  return ids;
}

function sortableTime(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

export function blockedMissionIds(reports: MissionReport[]): Set<string> {
  const newest = new Map<string, MissionReport>();
  for (const report of reports) {
    const current = newest.get(report.missionId);
    if (!current || sortableTime(report.createdAt) > sortableTime(current.createdAt)) {
      newest.set(report.missionId, report);
    }
  }
  const blocked = new Set<string>();
  for (const [missionId, report] of newest) {
    if (report.kind === 'blocker') blocked.add(missionId);
  }
  return blocked;
}
