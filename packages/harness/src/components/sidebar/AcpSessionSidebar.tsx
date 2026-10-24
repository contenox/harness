import { Button, Span, Spinner } from '@contenox/ui';
import { ChevronDown, Folder, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { useAcpWorkspace } from '../../hooks/useAcpWorkspace';
import { useWorkspaceRoots } from '../../hooks/useWorkspaceRoots';
import { externalAgentFromMeta, missionFromMeta, type SessionInfo } from '../../lib/acp';
import { adoptResultFromMeta } from '../../lib/adoptMeta';
import { relativeTime } from '../../lib/relativeTime';
import { useStagedAgent } from '../../lib/stagedAgent';
import { useStagedRoot } from '../../lib/stagedRoot';
import { workspaceNameForCwd } from '../../lib/workspaceRoots';
import { meaningfulTitle, workspaceLabel } from '../../pages/chat/lib/sessionLabel';
import { AgentPicker } from '../AgentPicker';
import { startNewChat } from './newChatIntent';


export function AcpSessionSidebar({ setIsOpen }: { setIsOpen: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const match = useMatch('/chat/:sessionId');
  const activeSessionId = match?.params.sessionId;
  const { workspace, sessions, deleteSession, focusEmptyTab } = useAcpWorkspace();
  const { roots } = useWorkspaceRoots();
  const { setStagedAgent } = useStagedAgent();
  const { setStagedRoot } = useStagedRoot();

  const startNew = useCallback(
    (agent: string | null) =>
      startNewChat(agent, {
        setStagedAgent,
        setStagedRoot,
        focusEmptyTab,
        navigate,
        closeSidebar: () => setIsOpen(false),
      }),
    [setStagedAgent, setStagedRoot, focusEmptyTab, navigate, setIsOpen],
  );

  const handleDelete = (session: SessionInfo) => {
    if (adoptResultFromMeta(session._meta)) return;
    const label =
      meaningfulTitle(session) ??
      t('acp_sidebar.session_fallback_label', { shortId: session.sessionId.slice(0, 8) });
    if (!window.confirm(t('acp_sidebar.confirm_delete', { name: label }))) return;
    deleteSession(session.sessionId);
    if (session.sessionId === activeSessionId) {
      navigate('/chat');
    }
  };

  const isInitialLoad = workspace.status === 'connecting' && workspace.sessions.length === 0;

  const projectLabelFor = (session: SessionInfo): string =>
    workspaceNameForCwd(session.cwd, roots) ?? workspaceLabel(session.cwd) ?? '';

  const renderSessionRow = (session: SessionInfo, showProjectLabel: boolean) => {
    const isActive = activeSessionId === session.sessionId;
    const label =
      meaningfulTitle(session) ??
      t('acp_sidebar.session_fallback_label', { shortId: session.sessionId.slice(0, 8) });
    const relative = session.updatedAt
      ? relativeTime(session.updatedAt, i18n.language, t('common.just_now'))
      : null;
    const agentName = externalAgentFromMeta(session._meta);
    const missionId = missionFromMeta(session._meta);
    const workspaceName = showProjectLabel ? projectLabelFor(session) : null;
    const adopted = adoptResultFromMeta(session._meta) != null;
    const hasPendingPermission = sessions.slices[session.sessionId]?.pendingPermission != null;
    return (
      <div
        key={session.sessionId}
        className={`group flex items-center gap-1 rounded-lg border p-1 pl-3 transition-colors duration-150 ${
          isActive
            ? 'bg-surface-200 dark:bg-dark-surface-200 border-surface-400 dark:border-dark-surface-600'
            : 'bg-surface-100 dark:bg-dark-surface-100 border-surface-200 dark:border-dark-surface-700 hover:bg-surface-200 dark:hover:bg-dark-surface-200'
        }`}>
        <Link
          to={`/chat/${session.sessionId}`}
          onClick={() => setIsOpen(false)}
          className="min-w-0 flex-1 py-2 text-left">
          <Span className="text-text dark:text-dark-text line-clamp-2 text-xs">{label}</Span>
          {hasPendingPermission && (
            <Span
              className="text-warning-800 dark:text-warning-300 mt-1 flex items-center gap-1.5 text-xs font-medium"
              title={t('acp_sidebar.pending_permission')}>
              <span aria-hidden className="bg-warning-500 h-1.5 w-1.5 shrink-0 rounded-full" />
              <span className="truncate">{t('acp_sidebar.pending_permission')}</span>
            </Span>
          )}
          {missionId && (
            <Span
              className="text-info-800 dark:text-info-300 bg-info-100 dark:bg-info-900/40 mt-1 inline-block truncate rounded px-1.5 py-0.5 text-xs font-medium"
              title={t('acp_sidebar.mission_session_title', { id: missionId })}>
              {t('acp_sidebar.mission_session_badge')}
            </Span>
          )}
          {agentName && (
            <Span
              className="text-text-muted dark:text-dark-text-muted mt-1 block truncate text-xs"
              title={t('acp_chat.agent_label', { name: agentName })}>
              {agentName}
            </Span>
          )}
          {(workspaceName || relative) && (
            <div className="text-text-muted dark:text-dark-text-muted mt-1 flex items-center justify-between gap-2 text-xs">
              {workspaceName ? (
                <span
                  className="flex min-w-0 items-center gap-1"
                  title={t('acp_sidebar.workspace_label', { path: session.cwd ?? '' })}>
                  <Folder className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{workspaceName}</span>
                </span>
              ) : (
                <span />
              )}
              {relative && <span className="shrink-0">{relative}</span>}
            </div>
          )}
        </Link>
        {!adopted && (
          <Button
            aria-label={t('acp_sidebar.delete_label', { name: label })}
            className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
            onClick={() => handleDelete(session)}
            size="icon"
            type="button"
            variant="ghost">
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    );
  };

  const sessionGroups: { name: string; items: SessionInfo[] }[] = [];
  const groupIndexByName = new Map<string, number>();
  for (const session of workspace.sessions) {
    const name = projectLabelFor(session);
    let gi = groupIndexByName.get(name);
    if (gi === undefined) {
      gi = sessionGroups.length;
      groupIndexByName.set(name, gi);
      sessionGroups.push({ name, items: [] });
    }
    sessionGroups[gi].items.push(session);
  }
  const useGroups = sessionGroups.length > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-surface-300 dark:border-dark-surface-700 flex shrink-0 items-center gap-1 border-b p-3">
        <Button
          variant="primary"
          size="sm"
          className="min-w-0 flex-1"
          onClick={() => startNew(null)}>
          <span className="truncate">{t('acp_sidebar.new_session')}</span>
        </Button>

        <AgentPicker
          value={null}
          onSelect={startNew}
          trigger={
            <Button
              type="button"
              variant="outline"
              palette="neutral"
              size="icon"
              aria-label={t('acp_sidebar.new_session_with_agent')}
              title={t('acp_sidebar.new_session_with_agent')}>
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
          }
        />
      </div>
      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3"
        aria-label={t('acp_sidebar.title')}>
        {isInitialLoad ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Spinner size="md" />
            <Span className="text-text-muted text-sm">{t('acp_sidebar.loading')}</Span>
          </div>
        ) : workspace.sessions.length === 0 ? (
          <Span className="text-text-muted text-sm">{t('acp_sidebar.empty_hint')}</Span>
        ) : useGroups ? (
          sessionGroups.map(group => (
            <div key={group.name} className="space-y-1">
              <div className="text-text-muted dark:text-dark-text-muted flex items-center gap-1.5 px-1 pt-2 pb-0.5 text-xs font-medium">
                <Folder className="h-3 w-3 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{group.name}</span>
                <span className="text-text-muted/70 dark:text-dark-text-muted/70 shrink-0">
                  {group.items.length}
                </span>
              </div>
              {group.items.map(session => renderSessionRow(session, false))}
            </div>
          ))
        ) : (
          workspace.sessions.map(session => renderSessionRow(session, true))
        )}
      </nav>
    </div>
  );
}
