import { Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { SessionInfo } from '../../lib/acp';
import { SessionRow } from './SessionRow';

export type SessionListProps = {
  sessions: SessionInfo[];
  activeSessionId: string | undefined;
  pendingPermission: (sessionId: string) => boolean;
  onNavigate: () => void;
  onDelete: (session: SessionInfo) => void;
};

export function SessionList({
  sessions,
  activeSessionId,
  pendingPermission,
  onNavigate,
  onDelete,
}: SessionListProps) {
  const { t } = useTranslation();
  if (sessions.length === 0) {
    return (
      <Span variant="muted" className="block px-8 py-1 text-xs">
        {t('acp_sidebar.project_empty')}
      </Span>
    );
  }
  return (
    <>
      {sessions.map(s => (
        <SessionRow
          key={s.sessionId}
          session={s}
          active={activeSessionId === s.sessionId}
          hasPendingPermission={pendingPermission(s.sessionId)}
          onNavigate={onNavigate}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}
