import { Button, cn, InlineNotice } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStopInstance } from '../hooks/useFleet';
import { fireAgainPath } from '../lib/missionAgents';
import type { InstanceStatus, Mission } from '../lib/types';
import { StopConfirmDialog } from './StopConfirmDialog';

export function MissionActions({
  mission,
  instance,
  className,
}: {
  mission: Mission;
  instance?: InstanceStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const stopInstance = useStopInstance();
  const [confirmStop, setConfirmStop] = useState(false);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {mission.status === 'open' && instance && (
          <Button
            variant="danger"
            size="xs"
            aria-label={t('missions.stop_aria', { intent: mission.intent })}
            isLoading={stopInstance.isPending}
            disabled={stopInstance.isPending}
            onClick={() => setConfirmStop(true)}>
            {t('missions.stop')}
          </Button>
        )}
        <Button
          variant="outline"
          palette="neutral"
          size="xs"
          aria-label={t('missions.fire_again_aria', { intent: mission.intent })}
          onClick={() => navigate(fireAgainPath(mission))}>
          {t('missions.fire_again')}
        </Button>
      </div>
      {stopInstance.isError && (
        <InlineNotice variant="error" role="alert">
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
