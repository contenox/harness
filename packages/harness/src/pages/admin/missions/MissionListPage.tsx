import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  H1,
  LoadingState,
  P,
  Page,
  Section,
} from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { MissionActions } from '../../../components/MissionActions';
import { PlanProgress } from '../../../components/PlanProgress';
import { UnitStatus } from '../../../components/UnitStatus';
import { useApprovals, useInboxReports } from '../../../hooks/useApprovals';
import { useFleet } from '../../../hooks/useFleet';
import { useMissions } from '../../../hooks/useMissions';
import { missionProblem } from '../../../lib/missionProblem';
import type { InstanceStatus } from '../../../lib/types';
import { needsYouMissionIds } from '../../../lib/unitStatus';

export default function MissionListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useMissions();
  const fleetQuery = useFleet();
  const inboxReports = useInboxReports();
  const { data: approvals } = useApprovals();

  if (isLoading) {
    return (
      <Page bodyScroll="auto">
        <LoadingState message={t('missions.loading')} />
      </Page>
    );
  }

  if (error) {
    return (
      <Page bodyScroll="auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-6">
          <ErrorState
            error={error}
            onRetry={() => void refetch()}
            title={t('missions.load_error')}
          />
        </div>
      </Page>
    );
  }

  const missions = data ?? [];

  const instanceById = new Map<string, InstanceStatus>();
  for (const entry of fleetQuery.data ?? []) {
    for (const inst of entry.instances ?? []) instanceById.set(inst.id, inst);
  }
  const blocked = needsYouMissionIds(
    inboxReports.items.map(i => i.report),
    approvals,
  );

  return (
    <Page bodyScroll="auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <H1 variant="page">{t('missions.title')}</H1>
            <P variant="muted" className="mt-2">
              {t('missions.description')}
            </P>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/missions/new')}>
            {t('missions.fire_action')}
          </Button>
        </div>

        {missions.length === 0 ? (
          <EmptyState
            title={t('missions.empty_title')}
            description={t('missions.empty_description')}>
            <Button variant="primary" size="sm" onClick={() => navigate('/missions/new')}>
              {t('missions.fire_action')}
            </Button>
          </EmptyState>
        ) : (
          <Section variant="empty">
            <div className="space-y-3">
              {missions.map(m => {
                const inst = m.instanceId ? instanceById.get(m.instanceId) : undefined;
                return (
                  <div
                    key={m.id}
                    className="border-surface-200 dark:border-dark-surface-600 space-y-2 rounded-lg border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <Link
                          to={`/missions/${m.id}`}
                          className="text-primary dark:text-dark-primary block font-medium hover:underline"
                          title={m.intent}>
                          {m.intent}
                        </Link>
                        {missionProblem(m) && (
                          <div
                            className="text-error dark:text-dark-error max-w-full truncate text-xs"
                            title={missionProblem(m)}>
                            {t('missions.last_error_label')}: {missionProblem(m)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-1 sm:items-end">
                        <UnitStatus
                          facts={{
                            instanceState: inst?.state,
                            missionStatus: m.status,
                            lastHeartbeat: m.lastHeartbeat,
                            lastError: m.lastError,
                            blocked: blocked.has(m.id),
                          }}
                          showReason={false}
                          className="sm:justify-end"
                        />
                        <PlanProgress plan={m.plan} />
                      </div>
                    </div>
                    <div className="text-text-muted dark:text-dark-text-muted flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                      <span>
                        {t('missions.col_agent')}: {m.agentName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {t('missions.col_envelope')}:
                        <Badge variant="outline" size="sm">
                          {m.hitlPolicyName}
                        </Badge>
                      </span>
                      <MissionActions mission={m} instance={inst} className="ml-auto" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </Page>
  );
}
