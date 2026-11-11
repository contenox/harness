import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  H1,
  InlineNotice,
  LoadingState,
  P,
  Page,
  Section,
  StatusIndicator,
} from '@contenox/ui';
import type { UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { PlanProgress } from '../../../components/PlanProgress';
import { StopConfirmDialog } from '../../../components/StopConfirmDialog';
import { UnitStatus } from '../../../components/UnitStatus';
import { useAgents } from '../../../hooks/useAgents';
import { useApprovals, useInboxReports } from '../../../hooks/useApprovals';
import {
  useCancelInstance,
  useFleet,
  useStopInstance,
  type CancelInstanceInput,
} from '../../../hooks/useFleet';
import { useMissions } from '../../../hooks/useMissions';
import { startAdoptSession, useAdoptIntent } from '../../../lib/adoptIntent';
import { isMissionCapable, startMissionPath } from '../../../lib/missionAgents';
import { relativeTime } from '../../../lib/relativeTime';
import { createStopFlow } from '../../../lib/stopFlow';
import type { FleetInstanceState, InstanceStatus, Mission } from '../../../lib/types';
import {
  needsYouMissionIds,
  unitAttentionRank,
  type UnitStatusFacts,
} from '../../../lib/unitStatus';

const LIVE_STATES: FleetInstanceState[] = ['running', 'starting'];

const FINISHED_MISSION_STATUSES: Mission['status'][] = ['landed', 'abandoned'];

function isFinishedMission(mission?: Mission): boolean {
  return !!mission && FINISHED_MISSION_STATUSES.includes(mission.status);
}

type StopMutation = UseMutationResult<string, Error, string, unknown>;
type CancelMutation = UseMutationResult<string, Error, CancelInstanceInput, unknown>;

function InstanceRow({
  entry,
  inst,
  mission,
  blocked,
  tone,
  finished = false,
  stopMutation,
  cancelMutation,
  onRequestStop,
}: {
  entry: { agentName: string; kind: string };
  inst: InstanceStatus;
  mission?: Mission;
  blocked: boolean;
  tone?: 'failed' | 'attention';
  finished?: boolean;
  stopMutation: StopMutation;
  cancelMutation: CancelMutation;
  onRequestStop: (inst: InstanceStatus) => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAdoptIntent } = useAdoptIntent();
  const sessionIds = inst.sessionIds ?? [];
  const canAdopt = inst.state === 'running';
  const openSession = (sessionId: string) =>
    startAdoptSession(
      {
        instanceId: inst.id,
        sessionId,
        ...(mission?.cwd ? { cwd: mission.cwd } : {}),
        ...(mission?.intent ? { title: mission.intent } : {}),
      },
      { setAdoptIntent, navigate },
    );

  const absoluteTime = (iso: string) => {
    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? iso : new Date(parsed).toLocaleString(i18n.language);
  };

  const stopPending = stopMutation.isPending && stopMutation.variables === inst.id;
  const stopFailed = stopMutation.error !== null && stopMutation.variables === inst.id;
  const cancelPending = (sessionId?: string) =>
    cancelMutation.isPending &&
    cancelMutation.variables?.instanceId === inst.id &&
    cancelMutation.variables.sessionId === sessionId;
  const cancelFailed =
    cancelMutation.error !== null && cancelMutation.variables?.instanceId === inst.id;

  const border =
    tone === 'failed'
      ? 'border-l-4 border-l-error dark:border-l-dark-error'
      : tone === 'attention'
        ? 'border-l-4 border-l-warning dark:border-l-dark-warning'
        : '';

  return (
    <div
      className={`border-surface-200 dark:border-dark-surface-600 space-y-3 rounded-lg border p-4 ${border}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{entry.agentName}</span>
            <Badge variant="secondary" size="sm">
              {entry.kind}
            </Badge>
          </div>
          {mission && (
            <Link
              to={`/missions/${mission.id}`}
              className="text-text-muted dark:text-dark-text-muted block max-w-full truncate text-sm hover:underline"
              title={mission.intent}>
              {mission.intent}
            </Link>
          )}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <UnitStatus
            facts={{
              instanceState: inst.state,
              missionStatus: mission?.status,
              lastHeartbeat: mission?.lastHeartbeat,
              lastError: mission?.lastError,
              blocked,
            }}
            className="sm:justify-end"
          />
          <PlanProgress plan={mission?.plan} />
        </div>
      </div>

      <div className="text-text-muted dark:text-dark-text-muted flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="min-w-0 break-all">
          {t('fleet.col_instance')}: <span className="font-mono text-xs">{inst.id}</span>
        </span>
        <span className="tabular-nums">
          {t('fleet.col_sessions')}: {inst.sessions}
        </span>
        <span className="tabular-nums">
          {t('fleet.col_viewers')}: {inst.viewers}
        </span>
        <span title={absoluteTime(inst.startedAt)}>
          {t('fleet.col_started')}:{' '}
          {relativeTime(inst.startedAt, i18n.language, t('common.just_now'))}
        </span>
      </div>

      {sessionIds.length === 0 ? (
        <P variant="muted" className="text-xs">
          {t('fleet.no_sessions')}
        </P>
      ) : (
        <ul className="space-y-2">
          {sessionIds.map(sessionId => (
            <li
              key={sessionId}
              className="border-surface-100 dark:border-dark-surface-700 flex flex-col gap-2 rounded border p-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 break-all">
                <span className="text-text-muted mr-2 text-xs">{t('fleet.session_label')}</span>
                <span className="font-mono text-xs">{sessionId}</span>
              </span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {canAdopt && (
                  <Button
                    variant="outline"
                    palette="neutral"
                    size="xs"
                    className="w-full sm:w-auto"
                    aria-label={t('fleet.open_session_aria', { id: sessionId })}
                    onClick={() => openSession(sessionId)}>
                    {t('fleet.open_session')}
                  </Button>
                )}
                {!finished && (
                  <Button
                    variant="outline"
                    palette="neutral"
                    size="xs"
                    className="w-full sm:w-auto"
                    aria-label={t('fleet.cancel_session_aria', { id: sessionId })}
                    isLoading={cancelPending(sessionId)}
                    disabled={cancelPending(sessionId)}
                    onClick={() => cancelMutation.mutate({ instanceId: inst.id, sessionId })}>
                    {t('fleet.cancel_session')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {!finished && sessionIds.length > 1 && (
          <Button
            variant="outline"
            palette="neutral"
            size="xs"
            aria-label={t('fleet.cancel_all_aria')}
            isLoading={cancelPending(undefined)}
            disabled={cancelPending(undefined)}
            onClick={() => cancelMutation.mutate({ instanceId: inst.id })}>
            {t('fleet.cancel_all')}
          </Button>
        )}

        <Button
          variant={finished ? 'outline' : 'danger'}
          palette={finished ? 'neutral' : undefined}
          size="xs"
          aria-label={
            finished
              ? t('fleet.release_aria', { id: inst.id })
              : t('fleet.stop_aria', { id: inst.id })
          }
          isLoading={stopPending}
          disabled={stopPending}
          onClick={() => onRequestStop(inst)}>
          {finished ? t('fleet.release') : t('fleet.stop')}
        </Button>
      </div>

      {(stopFailed || cancelFailed) && (
        <InlineNotice variant="error" role="alert">
          {stopFailed
            ? `${t('fleet.stop_error')} ${stopMutation.error?.message ?? ''}`
            : `${t('fleet.cancel_error')} ${cancelMutation.error?.message ?? ''}`}
        </InlineNotice>
      )}
    </div>
  );
}

export default function FleetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useFleet();
  const { data: missionsData } = useMissions();
  const { data: agentsData } = useAgents();
  const { data: approvals } = useApprovals();
  const inboxReports = useInboxReports();
  const stopInstance = useStopInstance();
  const cancelInstance = useCancelInstance();
  const [stopTarget, setStopTarget] = useState<InstanceStatus | null>(null);
  const stopFlow = createStopFlow(stopInstance.mutate, setStopTarget);

  if (isLoading) {
    return (
      <Page bodyScroll="auto">
        <LoadingState message={t('fleet.loading')} />
      </Page>
    );
  }

  if (error) {
    return (
      <Page bodyScroll="auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-6">
          <ErrorState error={error} onRetry={() => void refetch()} title={t('fleet.load_error')} />
        </div>
      </Page>
    );
  }

  const fleet = data ?? [];

  const missionByInstanceId = new Map<string, Mission>(
    (missionsData ?? [])
      .filter((m): m is Mission & { instanceId: string } => !!m.instanceId)
      .map(m => [m.instanceId, m]),
  );
  const blocked = needsYouMissionIds(
    inboxReports.items.map(i => i.report),
    approvals,
  );
  const missionCapable = new Set(
    (agentsData ?? []).filter(isMissionCapable).map(agent => agent.name),
  );

  const unitFacts = (inst: InstanceStatus): UnitStatusFacts => {
    const mission = missionByInstanceId.get(inst.id);
    return {
      instanceState: inst.state,
      missionStatus: mission?.status,
      lastError: mission?.lastError,
      blocked: mission ? blocked.has(mission.id) : false,
    };
  };

  const attention: { entry: (typeof fleet)[number]; inst: InstanceStatus; rank: number }[] = [];
  const live: { entry: (typeof fleet)[number]; inst: InstanceStatus }[] = [];
  const finished: { entry: (typeof fleet)[number]; inst: InstanceStatus }[] = [];
  for (const entry of fleet) {
    for (const inst of entry.instances ?? []) {
      const rank = unitAttentionRank(unitFacts(inst));
      if (rank !== null) attention.push({ entry, inst, rank });
      else if (isFinishedMission(missionByInstanceId.get(inst.id))) finished.push({ entry, inst });
      else live.push({ entry, inst });
    }
  }
  attention.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return Date.parse(b.inst.startedAt) - Date.parse(a.inst.startedAt);
  });
  live.sort((a, b) => Date.parse(b.inst.startedAt) - Date.parse(a.inst.startedAt));
  finished.sort((a, b) => Date.parse(b.inst.startedAt) - Date.parse(a.inst.startedAt));

  const idleEntries = fleet.filter(entry => (entry.instances ?? []).length === 0);
  const runningCount = live.filter(x => LIVE_STATES.includes(x.inst.state)).length;

  const isBlocked = (mission?: Mission) => (mission ? blocked.has(mission.id) : false);

  const renderRow = (
    entry: (typeof fleet)[number],
    inst: InstanceStatus,
    rowTone?: 'failed' | 'attention',
    rowFinished = false,
  ) => {
    const mission = missionByInstanceId.get(inst.id);
    return (
      <InstanceRow
        key={inst.id}
        entry={entry}
        inst={inst}
        mission={mission}
        blocked={isBlocked(mission)}
        tone={rowTone}
        finished={rowFinished}
        stopMutation={stopInstance}
        cancelMutation={cancelInstance}
        onRequestStop={stopFlow.request}
      />
    );
  };

  return (
    <Page bodyScroll="auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-6">
        <div>
          <H1 variant="page">{t('fleet.title')}</H1>
          <P variant="muted" className="mt-2">
            {t('fleet.description')}
          </P>
          {fleet.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" size="sm">
                {t('fleet.count_running', { n: runningCount })}
              </Badge>
              <Badge variant={attention.length > 0 ? 'error' : 'secondary'} size="sm">
                {t('fleet.count_attention', { n: attention.length })}
              </Badge>
              {finished.length > 0 && (
                <Badge variant="secondary" size="sm">
                  {t('fleet.count_finished', { n: finished.length })}
                </Badge>
              )}
              <Badge variant="secondary" size="sm">
                {t('fleet.count_idle', { n: idleEntries.length })}
              </Badge>
            </div>
          )}
        </div>

        {fleet.length === 0 ? (
          <EmptyState title={t('fleet.empty_title')} description={t('fleet.empty_description')}>
            <Button variant="primary" size="sm" onClick={() => navigate('/missions/new')}>
              {t('missions.fire_action')}
            </Button>
          </EmptyState>
        ) : (
          <>
            {attention.length > 0 && (
              <Section
                title={t('fleet.attention_title')}
                description={t('fleet.attention_description')}>
                <div className="mt-4 space-y-3">
                  {attention.map(({ entry, inst, rank }) =>
                    renderRow(entry, inst, rank === 0 ? 'failed' : 'attention'),
                  )}
                </div>
              </Section>
            )}

            <Section title={t('fleet.running_title')}>
              <div className="mt-4 space-y-3">
                {live.length === 0 ? (
                  <P variant="muted">{t('fleet.running_none')}</P>
                ) : (
                  live.map(({ entry, inst }) => renderRow(entry, inst))
                )}
              </div>
            </Section>

            {finished.length > 0 && (
              <Section
                title={t('fleet.finished_title')}
                description={t('fleet.finished_description')}>
                <div className="mt-4 space-y-3">
                  {finished.map(({ entry, inst }) => renderRow(entry, inst, undefined, true))}
                </div>
              </Section>
            )}

            {idleEntries.length > 0 && (
              <Section
                title={t('fleet.idle_agents_title')}
                description={t('fleet.idle_agents_description')}>
                <ul className="border-surface-200 dark:border-dark-surface-600 divide-surface-200 dark:divide-dark-surface-600 mt-4 divide-y rounded-lg border">
                  {idleEntries.map(entry => (
                    <li key={entry.agentId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="font-medium">{entry.agentName}</span>
                      <Badge variant="secondary" size="sm">
                        {entry.kind}
                      </Badge>
                      <span className="ml-auto flex items-center gap-2">
                        <StatusIndicator status="planned" label={t('fleet.idle')} size="sm" />
                        {missionCapable.has(entry.agentName) && (
                          <Button
                            variant="outline"
                            palette="neutral"
                            size="xs"
                            aria-label={t('fleet.start_mission_aria', { name: entry.agentName })}
                            onClick={() => navigate(startMissionPath(entry.agentName))}>
                            {t('fleet.start_mission')}
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}

        {stopTarget && (
          <StopConfirmDialog
            instance={stopTarget}
            pending={stopInstance.isPending && stopInstance.variables === stopTarget.id}
            finished={isFinishedMission(missionByInstanceId.get(stopTarget.id))}
            onClose={stopFlow.dismiss}
            onConfirm={() => stopFlow.confirm(stopTarget)}
          />
        )}
      </div>
    </Page>
  );
}
