import { Badge, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMissions } from '../hooks/useMissions';

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
  const mission = (missions ?? []).find(m => m.instanceId === instanceId);

  return (
    <div className="border-surface-200 dark:border-dark-surface-600 bg-surface-50 dark:bg-dark-surface-200 shrink-0 border-b px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge
          variant={controller ? 'success' : 'secondary'}
          size="sm"
          title={
            controller
              ? t('acp_chat.adopted_controller_title')
              : t('acp_chat.adopted_observer_title')
          }>
          {controller ? t('acp_chat.adopted_controller_label') : t('acp_chat.adopted_observer_label')}
        </Badge>
        {agentName && (
          <Span className="text-text-muted dark:text-dark-text-muted text-xs">
            {t('acp_chat.agent_label', { name: agentName })}
          </Span>
        )}
        {mission && (
          <Link
            to={`/missions/${mission.id}`}
            className="text-primary dark:text-dark-primary text-xs hover:underline"
            title={mission.intent}>
            {t('acp_chat.adopted_mission_link')}
          </Link>
        )}
      </div>
      <p className="text-text-muted dark:text-dark-text-muted mt-1 text-xs">
        {t('acp_chat.adopted_durability_notice')}
      </p>
    </div>
  );
}
