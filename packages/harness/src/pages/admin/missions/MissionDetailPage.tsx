import {
  Badge,
  Button,
  Collapsible,
  ErrorState,
  H1,
  InlineNotice,
  KeyValue,
  LoadingState,
  P,
  Page,
  Section,
  Span,
} from '@contenox/ui';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MissionPlanPanel } from '../../../components/MissionPlanPanel';
import { MissionRevisionFeed } from '../../../components/MissionRevisionFeed';
import { ScopeAnomalyChip, ScopeBadge } from '../../../components/ScopeStatus';
import { UnitStatus } from '../../../components/UnitStatus';
import { useFleet } from '../../../hooks/useFleet';
import { useMissionChanges } from '../../../hooks/useMissionChanges';
import { useMission, useMissionReports } from '../../../hooks/useMissions';
import { startAdoptSession, useAdoptIntent } from '../../../lib/adoptIntent';
import { relativeTime } from '../../../lib/relativeTime';
import type { FleetInstanceState } from '../../../lib/types';
import { blockedMissionIds } from '../../../lib/unitStatus';
import { MissionInspectorTabs } from './MissionInspectorTabs';
import { MISSION_INSPECTOR_TABS, useInspectorTab } from './inspectorTabs';
import {
  heartbeatLabel,
  REPORT_KIND_BADGE_VARIANT,
  REPORT_KIND_LABEL_KEY,
} from './missionPresentation';

const MissionTerminalTab = lazy(() => import('./MissionTerminalTab'));
const MissionChangesTab = lazy(() => import('./MissionChangesTab'));
const MissionSearchTab = lazy(() => import('./MissionSearchTab'));

export default function MissionDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAdoptIntent } = useAdoptIntent();
  const { id } = useParams<{ id: string }>();
  const missionQuery = useMission(id ?? '');
  const reportsQuery = useMissionReports(id ?? '');
  const fleetQuery = useFleet();
  const changes = useMissionChanges(id ?? '');
  const [activeTab, setActiveTab] = useInspectorTab();
  const [focusChangePath, setFocusChangePath] = useState<string | null>(null);

  const absoluteTime = (iso?: string) => {
    if (!iso) return undefined;
    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? iso : new Date(parsed).toLocaleString(i18n.language);
  };

  if (missionQuery.isLoading) {
    return (
      <Page bodyScroll="auto">
        <LoadingState message={t('missions.loading')} />
      </Page>
    );
  }

  if (missionQuery.error || !missionQuery.data) {
    return (
      <Page bodyScroll="auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 md:p-6">
          <ErrorState
            error={missionQuery.error ?? undefined}
            onRetry={() => void missionQuery.refetch()}
            title={t('missions.not_found_title')}
            description={t('missions.not_found_description')}
          />
        </div>
      </Page>
    );
  }

  const m = missionQuery.data;
  const reports = reportsQuery.data ?? [];

  let instanceState: FleetInstanceState | undefined;
  for (const entry of fleetQuery.data ?? []) {
    for (const inst of entry.instances ?? []) {
      if (inst.id === m.instanceId) instanceState = inst.state;
    }
  }
  const blocked = blockedMissionIds(reports).has(m.id);
  const scope = changes.data?.scope;
  const changedFiles = changes.data?.files ?? [];
  const openInChanges = (absolutePath: string) => {
    setFocusChangePath(absolutePath);
    setActiveTab('changes');
  };
  const canAdopt = instanceState === 'running' && !!m.sessionId && !!m.instanceId;
  const openSession = () => {
    if (!m.instanceId || !m.sessionId) return;
    startAdoptSession(
      { instanceId: m.instanceId, sessionId: m.sessionId },
      { setAdoptIntent, navigate },
    );
  };

  return (
    <Page bodyScroll="auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 md:p-6">
        <div>
          <Link
            to="/missions"
            className="text-text-muted dark:text-dark-text-muted text-sm hover:underline">
            {t('missions.back_to_list')}
          </Link>

          <H1 variant="page" className="mt-2">
            {m.intent}
          </H1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <UnitStatus
              facts={{
                instanceState,
                missionStatus: m.status,
                lastHeartbeat: m.lastHeartbeat,
                blocked,
              }}
            />
            {scope && <ScopeAnomalyChip scope={scope} />}
            {scope && <ScopeBadge scope={scope} />}
          </div>

          {scope?.anomaly && (
            <InlineNotice variant="warning" className="mt-3">
              <p className="font-medium">{t('scope.anomaly_title')}</p>
              <p className="mt-1 text-xs">{t('scope.anomaly_body')}</p>
              {scope.outsidePaths && scope.outsidePaths.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium">{t('scope.outside_label')}</p>
                  <ul className="mt-1 space-y-0.5">
                    {scope.outsidePaths.map(p => (
                      <li key={p} className="font-mono text-xs break-all">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </InlineNotice>
          )}
          {canAdopt && (
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={openSession}>
                {t('missions.open_session')}
              </Button>
            </div>
          )}
        </div>

        <MissionInspectorTabs
          tabs={MISSION_INSPECTOR_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === 'changes' && (
          <Suspense fallback={<LoadingState message={t('changes.loading')} />}>
            <MissionChangesTab missionId={m.id} focusPath={focusChangePath} />
          </Suspense>
        )}

        {activeTab === 'search' && (
          <Suspense fallback={<LoadingState message={t('workspaceSearch.searching')} />}>
            <MissionSearchTab changedFiles={changedFiles} onOpenInChanges={openInChanges} />
          </Suspense>
        )}

        {activeTab === 'terminal' && (
          <Suspense fallback={<LoadingState message={t('hostTerminal.connecting')} />}>
            <MissionTerminalTab missionId={m.id} />
          </Suspense>
        )}

        {activeTab === 'overview' && (
          <div className="flex flex-col gap-8">
            {m.lastError && (
              <InlineNotice variant="error" role="alert">
                <span className="font-medium">{t('missions.last_error_label')}: </span>
                {m.lastError}
              </InlineNotice>
            )}

            <Section title={t('missions.facts_title')}>
              <div className="mt-2 space-y-1">
                <KeyValue label={t('missions.facts_agent')} value={m.agentName} />

                {m.statusReason && (
                  <KeyValue label={t('missions.facts_status_reason')} value={m.statusReason} />
                )}
                <KeyValue
                  label={t('missions.facts_envelope')}
                  value={
                    <Badge variant="outline" size="sm">
                      {m.hitlPolicyName}
                    </Badge>
                  }
                />
                <KeyValue
                  label={t('missions.facts_heartbeat')}
                  value={
                    <span title={absoluteTime(m.lastHeartbeat)}>
                      {heartbeatLabel(m.lastHeartbeat, i18n.language, {
                        never: t('missions.heartbeat_never'),
                        justNow: t('common.just_now'),
                      })}
                    </span>
                  }
                />
                <KeyValue
                  label={t('missions.facts_session')}
                  value={<span className="font-mono text-xs break-all">{m.sessionId || '—'}</span>}
                />
                <KeyValue
                  label={t('missions.facts_instance')}
                  value={<span className="font-mono text-xs break-all">{m.instanceId || '—'}</span>}
                />
                <KeyValue label={t('missions.facts_created')} value={absoluteTime(m.createdAt)} />
                <KeyValue label={t('missions.facts_updated')} value={absoluteTime(m.updatedAt)} />
              </div>
            </Section>


            <MissionPlanPanel plan={m.plan} />


            <MissionRevisionFeed revisions={m.planRevisions} />

            <Section
              title={t('missions.reports_title')}
              description={t('missions.reports_description')}>
              <div className="mt-4 space-y-3">
                {reportsQuery.isLoading ? (
                  <LoadingState message={t('missions.reports_loading')} />
                ) : reportsQuery.error ? (
                  <ErrorState
                    error={reportsQuery.error}
                    onRetry={() => void reportsQuery.refetch()}
                    title={t('missions.reports_load_error')}
                  />
                ) : reports.length === 0 ? (
                  <P variant="muted">{t('missions.reports_empty')}</P>
                ) : (
                  reports.map(r => (
                    <div
                      key={r.id}
                      className="border-surface-200 dark:border-dark-surface-600 rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={REPORT_KIND_BADGE_VARIANT[r.kind]} size="sm">
                            {t(REPORT_KIND_LABEL_KEY[r.kind])}
                          </Badge>
                          <span className="font-medium">{r.summary}</span>
                        </div>
                        <span
                          className="text-text-muted dark:text-dark-text-muted text-xs"
                          title={absoluteTime(r.createdAt)}>
                          {relativeTime(r.createdAt, i18n.language, t('common.just_now'))}
                        </span>
                      </div>

                      {r.detail && (
                        <Collapsible title={t('missions.report_detail_toggle')} className="mt-3">
                          <P className="mt-2 whitespace-pre-wrap">{r.detail}</P>
                        </Collapsible>
                      )}

                      {r.refs && r.refs.length > 0 && (
                        <div className="mt-3">
                          <Span variant="muted" className="text-xs">
                            {t('missions.report_refs_label')}:
                          </Span>
                          <ul className="mt-1 space-y-0.5">
                            {r.refs.map((ref, i) => (
                              <li key={i} className="font-mono text-xs break-all">
                                {ref}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Section>
          </div>
        )}
      </div>
    </Page>
  );
}
