import type { Status } from '@contenox/ui';
import type { TranslationKey } from '../i18n';
import type { FleetInstanceState, MissionReport, MissionStatus } from './types';


export type UnitStatusFacts = {
  instanceState?: FleetInstanceState;
  missionStatus?: MissionStatus;
  lastHeartbeat?: string;
  blocked?: boolean;
};

export type UnitStatusBadgeVariant = 'success' | 'error' | 'warning' | 'outline' | 'secondary';

export type UnitStatusAtomKind = 'blocked' | 'process' | 'verdict' | 'liveness';

export type UnitStatusAtom = {
  kind: UnitStatusAtomKind;
  labelKey?: TranslationKey;
  label?: string;
  titleKey?: TranslationKey;
  indicator?: Status;
  variant?: UnitStatusBadgeVariant;
  heartbeat?: string;
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

const VERDICT: Record<
  MissionStatus,
  { labelKey: TranslationKey; titleKey: TranslationKey; variant: UnitStatusBadgeVariant }
> = {
  open: { labelKey: 'unit.verdict_open', titleKey: 'unit.verdict_open_title', variant: 'outline' },
  landed: {
    labelKey: 'unit.verdict_landed',
    titleKey: 'unit.verdict_landed_title',
    variant: 'success',
  },
  derailed: {
    labelKey: 'unit.verdict_derailed',
    titleKey: 'unit.verdict_derailed_title',
    variant: 'error',
  },
  stuck: {
    labelKey: 'unit.verdict_stuck',
    titleKey: 'unit.verdict_stuck_title',
    variant: 'warning',
  },
  abandoned: {
    labelKey: 'unit.verdict_abandoned',
    titleKey: 'unit.verdict_abandoned_title',
    variant: 'secondary',
  },
};

const UNKNOWN_VERDICT: { titleKey: TranslationKey; variant: UnitStatusBadgeVariant } = {
  titleKey: 'unit.verdict_unknown_title',
  variant: 'secondary',
};

export function composeUnitStatus(facts: UnitStatusFacts): UnitStatusAtom[] {
  const atoms: UnitStatusAtom[] = [];

  if (facts.blocked) {
    atoms.push({
      kind: 'blocked',
      labelKey: 'unit.blocked',
      titleKey: 'unit.blocked_title',
      variant: 'warning',
    });
  }

  if (facts.instanceState) {
    atoms.push({
      kind: 'process',
      indicator: PROCESS_STATUS_INDICATOR[facts.instanceState],
      labelKey: PROCESS_LABEL_KEY[facts.instanceState],
    });
  }

  if (facts.missionStatus) {
    const v = VERDICT[facts.missionStatus];
    atoms.push(
      v
        ? { kind: 'verdict', labelKey: v.labelKey, titleKey: v.titleKey, variant: v.variant }
        : {
            kind: 'verdict',
            label: facts.missionStatus,
            titleKey: UNKNOWN_VERDICT.titleKey,
            variant: UNKNOWN_VERDICT.variant,
          },
    );
  }

  if (facts.missionStatus) {
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
