import type { TranslationKey } from '../../../i18n';
import type {
  FleetEntry,
  FleetInstanceState,
  HITLApproval,
  InstanceStatus,
  Mission,
  MissionReport,
  OperatorInboxItem,
  OperatorInboxReason,
} from '../../../lib/types';



export type InboxReportItem = {
  report: MissionReport;
  mission: Mission;
  operatorInbox?: { reason: OperatorInboxReason; parentSessionId?: string };
};

export type ReportGroup = {
  mission: Mission;
  items: InboxReportItem[];
  newestAt: string;
  newCount: number;
};

export const DEFAULT_INBOX_REPORT_LIMIT = 200;

export function joinInboxReports(
  missions: Mission[],
  reportsByMissionId: Map<string, MissionReport[]>,
  limit: number = DEFAULT_INBOX_REPORT_LIMIT,
): InboxReportItem[] {
  const items: InboxReportItem[] = [];
  for (const mission of missions) {
    const reports = reportsByMissionId.get(mission.id) ?? [];
    for (const report of reports) {
      items.push({ report, mission });
    }
  }
  items.sort((a, b) => sortableTime(b.report.createdAt) - sortableTime(a.report.createdAt));
  return limit >= 0 ? items.slice(0, limit) : items;
}

export function groupReportsByMission(items: InboxReportItem[], lastSeen?: string): ReportGroup[] {
  const byMission = new Map<string, ReportGroup>();
  for (const item of items) {
    const id = item.mission.id;
    let group = byMission.get(id);
    if (!group) {
      group = { mission: item.mission, items: [], newestAt: item.report.createdAt, newCount: 0 };
      byMission.set(id, group);
    }
    group.items.push(item);
    if (sortableTime(item.report.createdAt) > sortableTime(group.newestAt)) {
      group.newestAt = item.report.createdAt;
    }
    if (isNewReport(item.report.createdAt, lastSeen)) group.newCount += 1;
  }
  return [...byMission.values()].sort(
    (a, b) => sortableTime(b.newestAt) - sortableTime(a.newestAt),
  );
}

export function isNewReport(createdAt: string, lastSeen?: string): boolean {
  if (!lastSeen) return false;
  return sortableTime(createdAt) > sortableTime(lastSeen);
}

export function countNewReports(items: InboxReportItem[], lastSeen?: string): number {
  return items.reduce((n, i) => (isNewReport(i.report.createdAt, lastSeen) ? n + 1 : n), 0);
}

export function newestReportAt(items: InboxReportItem[]): string | undefined {
  let newest: string | undefined;
  for (const { report } of items) {
    if (!newest || sortableTime(report.createdAt) > sortableTime(newest)) newest = report.createdAt;
  }
  return newest;
}


export function mergeOperatorInboxReports(
  items: InboxReportItem[],
  operatorItems: OperatorInboxItem[] | null | undefined,
  missionById: Map<string, Mission>,
): InboxReportItem[] {
  if (!operatorItems || operatorItems.length === 0) return items;

  const byIdentity = new Map<string, OperatorInboxItem>();
  for (const opItem of operatorItems) {
    byIdentity.set(reportIdentity(opItem.missionId, opItem.report.id), opItem);
  }

  const seen = new Set<string>();
  const merged: InboxReportItem[] = items.map(item => {
    const key = reportIdentity(item.report.missionId, item.report.id);
    const opItem = byIdentity.get(key);
    if (!opItem) return item;
    seen.add(key);
    return {
      ...item,
      operatorInbox: { reason: opItem.reason, parentSessionId: opItem.parentSessionId },
    };
  });

  for (const opItem of operatorItems) {
    const key = reportIdentity(opItem.missionId, opItem.report.id);
    if (seen.has(key)) continue;
    const mission = missionById.get(opItem.missionId);
    if (!mission) continue;
    merged.push({
      report: opItem.report,
      mission,
      operatorInbox: { reason: opItem.reason, parentSessionId: opItem.parentSessionId },
    });
  }

  return merged;
}

function reportIdentity(missionId: string, reportId: string): string {
  return `${missionId}::${reportId}`;
}


export type ApprovalGroup = {
  mission?: Mission;
  missionId?: string;
  approvals: HITLApproval[];
};

export function groupApprovalsByMission(
  approvals: HITLApproval[],
  missionById: Map<string, Mission>,
): ApprovalGroup[] {
  const attributed = new Map<string, ApprovalGroup>();
  const unattributed: HITLApproval[] = [];
  for (const approval of approvals) {
    const missionId = approval.missionId?.trim();
    if (!missionId) {
      unattributed.push(approval);
      continue;
    }
    let group = attributed.get(missionId);
    if (!group) {
      group = { mission: missionById.get(missionId), missionId, approvals: [] };
      attributed.set(missionId, group);
    }
    group.approvals.push(approval);
  }
  const groups = [...attributed.values()].sort(
    (a, b) => newestApprovalTime(b.approvals) - newestApprovalTime(a.approvals),
  );
  if (unattributed.length > 0) groups.push({ approvals: unattributed });
  return groups;
}

function newestApprovalTime(approvals: HITLApproval[]): number {
  return approvals.reduce((max, a) => Math.max(max, sortableTime(a.createdAt)), -Infinity);
}


export type StalledUnit = {
  instance: InstanceStatus;
  agentName: string;
  kind: string;
  mission?: Mission;
};

const STALLED_STATES: FleetInstanceState[] = ['error', 'warning'];
const stalledRank = (s: FleetInstanceState): number => (s === 'error' ? 0 : 1);

export type RunningSummary = { running: number; starting: number; live: number };

const LIVE_STATES: FleetInstanceState[] = ['running', 'starting'];

export function stalledUnits(
  fleet: FleetEntry[],
  missionByInstanceId: Map<string, Mission>,
): StalledUnit[] {
  const units: StalledUnit[] = [];
  for (const entry of fleet) {
    for (const instance of entry.instances ?? []) {
      if (!STALLED_STATES.includes(instance.state)) continue;
      units.push({
        instance,
        agentName: entry.agentName,
        kind: entry.kind,
        mission: missionByInstanceId.get(instance.id),
      });
    }
  }
  units.sort((a, b) => {
    const byState = stalledRank(a.instance.state) - stalledRank(b.instance.state);
    if (byState !== 0) return byState;
    return sortableTime(b.instance.startedAt) - sortableTime(a.instance.startedAt);
  });
  return units;
}

export function runningSummary(fleet: FleetEntry[]): RunningSummary {
  let running = 0;
  let starting = 0;
  for (const entry of fleet) {
    for (const instance of entry.instances ?? []) {
      if (instance.state === 'running') running += 1;
      else if (instance.state === 'starting') starting += 1;
    }
  }
  return { running, starting, live: running + starting };
}

export function missionsByInstanceId(missions: Mission[]): Map<string, Mission> {
  const map = new Map<string, Mission>();
  for (const mission of missions) {
    if (mission.instanceId) map.set(mission.instanceId, mission);
  }
  return map;
}

export function missionsById(missions: Mission[]): Map<string, Mission> {
  return new Map(missions.map(m => [m.id, m]));
}


export function approvalToolLabel(approval: Pick<HITLApproval, 'toolsName' | 'toolName'>): string {
  const parts = [approval.toolsName, approval.toolName].map(p => p?.trim()).filter(Boolean);
  return parts.join(' / ');
}

export function isAttentionAsk(approval: Pick<HITLApproval, 'toolsName' | 'toolName'>): boolean {
  return approval.toolsName === 'mission' && approval.toolName === 'mission_ask_attention';
}

export function approvalAttribution(approval: HITLApproval): {
  agentName?: string;
  missionId?: string;
  instanceId?: string;
  sessionId?: string;
} {
  return {
    agentName: nonEmpty(approval.agentName),
    missionId: nonEmpty(approval.missionId),
    instanceId: nonEmpty(approval.instanceId),
    sessionId: nonEmpty(approval.sessionId),
  };
}

export function approvalPolicyLabel(
  approval: Pick<HITLApproval, 'policyName' | 'matchedRule'>,
): string | undefined {
  const policy = nonEmpty(approval.policyName);
  if (!policy) return undefined;
  return approval.matchedRule != null ? `${policy} #${approval.matchedRule}` : policy;
}

function nonEmpty(v?: string): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

function sortableTime(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}


export { REPORT_KIND_BADGE_VARIANT, REPORT_KIND_LABEL_KEY } from '../missions/missionPresentation';

export const APPROVAL_ANSWER_VARIANT: Record<'allow' | 'deny', 'primary' | 'danger'> = {
  allow: 'primary',
  deny: 'danger',
};

export const APPROVAL_ANSWER_LABEL_KEY: Record<'allow' | 'deny', TranslationKey> = {
  allow: 'inbox.answer_allow',
  deny: 'inbox.answer_deny',
};

export const STALLED_STATE_LABEL_KEY: Record<'error' | 'warning', TranslationKey> = {
  error: 'fleet.state.error',
  warning: 'fleet.state.warning',
};

export { LIVE_STATES, STALLED_STATES };
