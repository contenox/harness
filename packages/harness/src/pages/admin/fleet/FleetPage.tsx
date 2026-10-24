import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  H1,
  InlineNotice,
  KeyValue,
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
import { UnitStatus } from '../../../components/UnitStatus';
import { startAdoptSession, useAdoptIntent } from '../../../lib/adoptIntent';
import { useInboxReports } from '../../../hooks/useApprovals';
import {
  useCancelInstance,
  useFleet,
  useStopInstance,
  type CancelInstanceInput,
} from '../../../hooks/useFleet';
import { useMissions } from '../../../hooks/useMissions';
import type { TranslationKey } from '../../../i18n';
import { relativeTime } from '../../../lib/relativeTime';
import type { FleetInstanceState, InstanceStatus, Mission } from '../../../lib/types';
import { blockedMissionIds, PROCESS_LABEL_KEY } from '../../../lib/unitStatus';

const ATTENTION_STATES: FleetInstanceState[] = ['error', 'warning'];
const attentionRank = (s: FleetInstanceState): number => (s === 'error' ? 0 : 1);

const LIVE_STATES: FleetInstanceState[] = ['running', 'starting'];

export function stopConfirmCopy(state: FleetInstanceState): {
  title: TranslationKey;
  body: TranslationKey;
  confirm: TranslationKey;
} {
  return LIVE_STATES.includes(state)
    ? {
        title: 'fleet.stop_confirm_title',
        body: 'fleet.stop_confirm_body',
        confirm: 'fleet.stop_confirm_confirm',
      }
    : {
        title: 'fleet.stop_confirm_title_dead',
        body: 'fleet.stop_confirm_body_dead',
        confirm: 'fleet.stop_confirm_confirm_dead',
      };
}

export function createStopFlow(
  stop: (instanceId: string) => void,
  setTarget: (instance: InstanceStatus | null) => void,
) {
  return {
    request: (instance: InstanceStatus) => setTarget(instance),
    confirm: (instance: InstanceStatus) => {
      stop(instance.id);
      setTarget(null);
    },
    dismiss: () => setTarget(null),
  };
}

export function StopConfirmDialog({
  instance,
  pending,
  onConfirm,
  onClose,
}: {
  instance: InstanceStatus;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const copy = stopConfirmCopy(instance.state);

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(copy.title)}
      closeLabel={t('fleet.stop_confirm_close')}
      className="w-[min(32rem,90vw)]">
      <P>{t(copy.body)}</P>
      <div className="mt-4 space-y-1">
        <KeyValue label={t('fleet.stop_confirm_agent')} value={instance.agentName} />
        <KeyValue
          label={t('fleet.stop_confirm_instance')}
          value={<span className="font-mono text-xs break-all">{instance.id}</span>}
        />
        <KeyValue
          label={t('fleet.stop_confirm_state')}
          value={t(PROCESS_LABEL_KEY[instance.state])}
        />
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          palette="neutral"
          size="sm"
          className="w-full sm:w-auto"
          onClick={onClose}>
          {t('fleet.stop_confirm_decline')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="w-full sm:w-auto"
          isLoading={pending}
          disabled={pending}
          onClick={onConfirm}>
          {t(copy.confirm)}
        </Button>
      </div>
    </Dialog>
  );
}

type StopMutation = UseMutationResult<string, Error, string, unknown>;
type CancelMutation = UseMutationResult<string, Error, CancelInstanceInput, unknown>;

function InstanceRow({
  entry,
  inst,
  mission,
  blocked,
  tone,
  stopMutation,
  cancelMutation,
  onRequestStop,
}: {
  entry: { agentName: string; kind: string };
  inst: InstanceStatus;
  mission?: Mission;
  blocked: boolean;
  tone?: 'attention';
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
    startAdoptSession({ instanceId: inst.id, sessionId }, { setAdoptIntent, navigate });

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
    tone === 'attention'
      ? inst.state === 'error'
        ? 'border-l-4 border-l-error dark:border-l-dark-error'
        : 'border-l-4 border-l-warning dark:border-l-dark-warning'
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
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">

        {sessionIds.length > 1 && (
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
          variant="danger"
          size="xs"
          aria-label={t('fleet.stop_aria', { id: inst.id })}
          isLoading={stopPending}
          disabled={stopPending}
          onClick={() => onRequestStop(inst)}>
          {t('fleet.stop')}
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
  const { data, isLoading, error, refetch } = useFleet();
  const { data: missionsData } = useMissions();
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
  const blocked = blockedMissionIds(inboxReports.items.map(i => i.report));

  const attention: { entry: (typeof fleet)[number]; inst: InstanceStatus }[] = [];
  const live: { entry: (typeof fleet)[number]; inst: InstanceStatus }[] = [];
  for (const entry of fleet) {
    for (const inst of entry.instances ?? []) {
      if (ATTENTION_STATES.includes(inst.state)) attention.push({ entry, inst });
      else live.push({ entry, inst });
    }
  }
  attention.sort((a, b) => {
    const byState = attentionRank(a.inst.state) - attentionRank(b.inst.state);
    if (byState !== 0) return byState;
    return Date.parse(b.inst.startedAt) - Date.parse(a.inst.startedAt);
  });
  live.sort((a, b) => Date.parse(b.inst.startedAt) - Date.parse(a.inst.startedAt));

  const idleEntries = fleet.filter(entry => (entry.instances ?? []).length === 0);
  const runningCount = live.filter(x => LIVE_STATES.includes(x.inst.state)).length;

  const isBlocked = (mission?: Mission) => (mission ? blocked.has(mission.id) : false);

  const renderRow = (
    entry: (typeof fleet)[number],
    inst: InstanceStatus,
    rowTone?: 'attention',
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
              <Badge variant="secondary" size="sm">
                {t('fleet.count_idle', { n: idleEntries.length })}
              </Badge>
            </div>
          )}
        </div>

        {fleet.length === 0 ? (
          <EmptyState title={t('fleet.empty_title')} description={t('fleet.empty_description')} />
        ) : (
          <>
            {attention.length > 0 && (
              <Section
                title={t('fleet.attention_title')}
                description={t('fleet.attention_description')}>
                <div className="mt-4 space-y-3">
                  {attention.map(({ entry, inst }) => renderRow(entry, inst, 'attention'))}
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
                      <span className="ml-auto">
                        <StatusIndicator status="planned" label={t('fleet.idle')} size="sm" />
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
            onClose={stopFlow.dismiss}
            onConfirm={() => stopFlow.confirm(stopTarget)}
          />
        )}
      </div>
    </Page>
  );
}
