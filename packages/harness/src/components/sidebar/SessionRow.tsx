import { Badge, IconButton, SidebarItem } from '@contenox/ui';
import { CircleDot, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { externalAgentFromMeta, missionFromMeta, type SessionInfo } from '../../lib/acp';
import { adoptResultFromMeta } from '../../lib/adoptMeta';
import { relativeTime } from '../../lib/relativeTime';
import { sessionLabel } from './useSessionSidebarActions';

type Props = {
  session: SessionInfo;
  active: boolean;
  hasPendingPermission: boolean;
  onNavigate: () => void;
  onDelete: (session: SessionInfo) => void;
};

export function SessionRow({ session, active, hasPendingPermission, onNavigate, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const label = sessionLabel(session, t);
  const agentName = externalAgentFromMeta(session._meta);
  const missionId = missionFromMeta(session._meta);
  const adopted = adoptResultFromMeta(session._meta) != null;
  const relative = session.updatedAt
    ? relativeTime(session.updatedAt, i18n.language, t('common.just_now'))
    : null;

  return (
    <SidebarItem
      as={Link}
      to={`/chat/${session.sessionId}`}
      level={1}
      active={active}
      onClick={onNavigate}
      title={agentName ? `${label} - ${agentName}` : label}
      icon={
        hasPendingPermission ? (
          <CircleDot className="text-text-warning" aria-label={t('acp_sidebar.pending_permission')} />
        ) : undefined
      }
      meta={relative}
      trailing={
        adopted ? undefined : (
          <IconButton
            label={t('acp_sidebar.delete_label', { name: label })}
            size="xs"
            noTooltip
            onClick={() => onDelete(session)}>
            <Trash2 className="size-3.5" aria-hidden />
          </IconButton>
        )
      }>
      {label}
      {missionId && (
        <Badge
          variant="accent"
          size="sm"
          className="ml-1.5"
          title={t('acp_sidebar.mission_session_title', { id: missionId })}>
          {t('acp_sidebar.mission_session_badge')}
        </Badge>
      )}
    </SidebarItem>
  );
}
