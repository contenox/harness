import { Badge, Button, InlineNotice, Span } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApprovals } from '../hooks/useApprovals';
import { useFleet, useStopInstance } from '../hooks/useFleet';
import { useMissionReports, useMissions } from '../hooks/useMissions';
import type { InstanceStatus } from '../lib/types';
import { needsYouMissionIds } from '../lib/unitStatus';
import { StopConfirmDialog } from './StopConfirmDialog';
import { UnitStatus } from './UnitStatus';

export function AdoptedSessionBanner({
  instanceId,
  controller,
  agentName,
}: {
  instanceId: string;
  controller: boolean;
  agentName: string | null;
}) {
  const { t } = useTranslation();
  const { data: missions } = useMissions();
  const { data: fleet } = useFleet();
  const { data: approvals } = useApprovals();
  const stopInstance = useStopInstance();
  const [confirmStop, setConfirmStop] = useState(false);
  const mission = (missions ?? []).find(m => m.instanceId === instanceId);
  const { data: reports } = useMissionReports(mission?.id ?? '');
  let instance: InstanceStatus | undefined;
  for (const entry of fleet ?? []) {
    for (const inst of entry.instances ?? []) {
      if (inst.id === instanceId) instance = inst;
    }
  }
  const needsYou = mission ? needsYouMissionIds(reports ?? [], approvals).has(mission.id) : false;

  return (
    <div className="border-line bg-sidebar shrink-0 border-b px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge
          variant={controller ? 'success' : 'secondary'}
          size="sm"
          title={
            controller
              ? t('acp_chat.adopted_controller_title')
              : t('acp_chat.adopted_observer_title')
          }>
          {controller
            ? t('acp_chat.adopted_controller_label')
            : t('acp_chat.adopted_observer_label')}
        </Badge>
        {agentName && (
          <Span className="text-text-muted text-xs">
            {t('acp_chat.agent_label', { name: agentName })}
          </Span>
        )}
        {mission && (
          <UnitStatus
            facts={{
              instanceState: instance?.state,
              missionStatus: mission.status,
              lastHeartbeat: mission.lastHeartbeat,
              lastError: mission.lastError,
              blocked: needsYou,
            }}
          />
        )}
        {mission && (
          <Link
            to={`/missions/${mission.id}`}
            className="text-link text-xs hover:underline"
            title={mission.intent}>
            {t('acp_chat.adopted_mission_link')}
          </Link>
        )}
        {instance && (!mission || mission.status === 'open') && (
          <Button
            variant="danger"
            size="xs"
            className="ml-auto"
            aria-label={t('fleet.stop_aria', { id: instance.id })}
            isLoading={stopInstance.isPending}
            disabled={stopInstance.isPending}
            onClick={() => setConfirmStop(true)}>
            {t('fleet.stop')}
          </Button>
        )}
      </div>
      {stopInstance.isError && (
        <InlineNotice variant="error" role="alert" className="mt-2">
          {`${t('fleet.stop_error')} ${stopInstance.error?.message ?? ''}`}
        </InlineNotice>
      )}
      {confirmStop && instance && (
        <StopConfirmDialog
          instance={instance}
          pending={stopInstance.isPending}
          onClose={() => setConfirmStop(false)}
          onConfirm={() => {
            stopInstance.mutate(instance.id);
            setConfirmStop(false);
          }}
        />
      )}
    </div>
  );
}
