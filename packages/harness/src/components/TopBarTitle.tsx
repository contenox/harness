import { Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useMatch, useLocation } from 'react-router-dom';
import { isChatPath, pageTitleKey } from '../config/pageTitles';
import { useAcpWorkspace } from '../hooks/useAcpWorkspace';
import { useWorkspaceRoots } from '../hooks/useWorkspaceRoots';
import { meaningfulTitle } from '../pages/chat/lib/sessionLabel';
import { projectForCwd, projectName } from '../lib/workspaceRoots';

const TITLE_CLASS = 'truncate text-sm font-semibold text-text';

/** Chat routes show the current session (project name beside it); other pages their nav label. */
export function ChatTopBarTitle() {
  const { t } = useTranslation();
  const match = useMatch('/chat/:sessionId');
  const sessionId = match?.params.sessionId;
  const { workspace } = useAcpWorkspace();
  const { roots } = useWorkspaceRoots();

  const info = sessionId ? workspace.sessions.find(s => s.sessionId === sessionId) : undefined;
  const project = info?.cwd ? projectForCwd(info.cwd, roots) : null;
  const projectLabel = project ? projectName(project) : null;
  const title = (info && meaningfulTitle(info)) ?? projectLabel ?? t('acp_sidebar.new_session');

  return (
    <>
      <Span className={TITLE_CLASS} title={title}>
        {title}
      </Span>
      {projectLabel && projectLabel !== title && (
        <Span variant="muted" className="ml-2 hidden truncate text-xs sm:inline">
          {projectLabel}
        </Span>
      )}
    </>
  );
}

export function TopBarTitle({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  if (signedIn && isChatPath(pathname)) return <ChatTopBarTitle />;
  const key = pageTitleKey(pathname);
  return key ? <Span className={TITLE_CLASS}>{t(key)}</Span> : null;
}
