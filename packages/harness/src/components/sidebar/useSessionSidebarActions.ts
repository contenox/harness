import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAcpWorkspace } from '../../hooks/useAcpWorkspace';
import { useForgetWorkspaceRoot } from '../../hooks/useWorkspaceRootMutations';
import type { SessionInfo } from '../../lib/acp';
import { adoptResultFromMeta } from '../../lib/adoptMeta';
import type { WorkspaceRoot } from '../../lib/types';
import { projectName } from '../../lib/workspaceRoots';
import { meaningfulTitle } from '../../pages/chat/lib/sessionLabel';

export function sessionLabel(session: SessionInfo, t: TFunction): string {
  return (
    meaningfulTitle(session) ??
    t('acp_sidebar.session_fallback_label', { shortId: session.sessionId.slice(0, 8) })
  );
}

/** Confirm-then-act handlers for deleting a session or forgetting a project. */
export function useSessionSidebarActions(activeSessionId: string | undefined) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteSession } = useAcpWorkspace();
  const forgetRoot = useForgetWorkspaceRoot();

  const confirmDeleteSession = (session: SessionInfo) => {
    if (adoptResultFromMeta(session._meta)) return;
    const name = sessionLabel(session, t);
    if (!window.confirm(t('acp_sidebar.confirm_delete', { name }))) return;
    deleteSession(session.sessionId);
    if (session.sessionId === activeSessionId) navigate('/chat');
  };

  const confirmRemoveProject = (root: WorkspaceRoot, sessionCount: number) => {
    const name = projectName(root);
    const message =
      sessionCount > 0
        ? t('acp_sidebar.remove_project_confirm_sessions', { name, count: sessionCount })
        : t('acp_sidebar.remove_project_confirm', { name });
    if (!window.confirm(message)) return;
    forgetRoot.mutate(root.path);
  };

  return { confirmDeleteSession, confirmRemoveProject, removeProjectFailed: !!forgetRoot.error };
}
