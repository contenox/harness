import { Tabs, TabPanel, TabPanels, type Tab } from '@contenox/ui';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';
import { useWorkspaceTabs } from '../../../hooks/useWorkspaceTabs';
import { useAdoptIntent } from '../../../lib/adoptIntent';
import { meaningfulTitle } from '../lib/sessionLabel';
import { routeForActiveTab } from '../lib/workspaceTabs';
import { ChatSessionTab } from './ChatSessionTab';

const EMPTY_PANEL_ID = '__empty__';

export function WorkspaceTabs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams<{ sessionId?: string }>();
  const { workspace, adoptSession } = useAcpWorkspace();
  const tabModel = useWorkspaceTabs();
  const { tabs, activeId, open, close, focus, openEmpty } = tabModel;

  const { adoptIntent, setAdoptIntent } = useAdoptIntent();
  const adoptingRef = useRef(false);
  useEffect(() => {
    if (!adoptIntent || workspace.status !== 'ready' || adoptingRef.current) return;
    adoptingRef.current = true;
    const intent = adoptIntent;
    setAdoptIntent(null);
    void adoptSession({ instanceId: intent.instanceId, sessionId: intent.sessionId }, intent.cwd)
      .then(sid => {
        open(sid);
      })
      .catch(() => {
      })
      .finally(() => {
        adoptingRef.current = false;
      });
  }, [adoptIntent, workspace.status, adoptSession, open, setAdoptIntent]);

  const emptyKeyRef = useRef(0);

  const intentToEmptyRef = useRef(false);

  useEffect(() => {
    if (paramSessionId) open(paramSessionId);
    else openEmpty();
  }, [paramSessionId, open, openEmpty]);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const intentionalEmpty = intentToEmptyRef.current;
    if (activeId === null) intentToEmptyRef.current = false;
    const target = routeForActiveTab(activeId, intentionalEmpty);
    if (target !== null) navigateRef.current(target, { replace: true });
  }, [activeId]);

  const handleSessionCreated = useCallback(
    (sid: string) => {
      emptyKeyRef.current += 1;
      open(sid);
    },
    [open],
  );

  const handleNewSession = useCallback(() => {
    intentToEmptyRef.current = true;
    openEmpty();
  }, [openEmpty]);

  const handleClose = useCallback(
    (id: string) => {
      if (tabs.length === 1 && tabs[0] === id) intentToEmptyRef.current = true;
      close(id);
    },
    [tabs, close],
  );

  const sessionLabelFor = useCallback(
    (id: string): string => {
      const info = workspace.sessions.find(s => s.sessionId === id);
      const title = info ? meaningfulTitle(info) : null;
      return title ?? t('acp_sidebar.session_fallback_label', { shortId: id.slice(0, 8) });
    },
    [workspace.sessions, t],
  );

  if (tabs.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatSessionTab
          key={`empty-${emptyKeyRef.current}`}
          sessionId={null}
          onSessionCreated={handleSessionCreated}
          onNewSession={handleNewSession}
        />
      </div>
    );
  }

  const stripTabs: Tab[] = tabs.map(id => {
    const label = sessionLabelFor(id);
    return {
      id,
      label: <span className="max-w-[12rem] truncate">{label}</span>,
      closable: true,
      closeLabel: t('acp_chat.tab_close_label', { name: label }),
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 items-center gap-1 border-b px-2">
        <Tabs
          tabs={stripTabs}
          activeTab={activeId ?? EMPTY_PANEL_ID}
          onTabChange={id => focus(id)}
          onClose={handleClose}
          className="min-w-0 flex-1 flex-nowrap"
        />
      </div>

      <TabPanels>
        {tabs.map(id => (
          <TabPanel key={id} tabId={id} activeTab={activeId ?? EMPTY_PANEL_ID}>
            <ChatSessionTab
              sessionId={id}
              onSessionCreated={handleSessionCreated}
              onNewSession={handleNewSession}
            />
          </TabPanel>
        ))}
        <TabPanel key={`empty-${emptyKeyRef.current}`} tabId={EMPTY_PANEL_ID} activeTab={activeId ?? EMPTY_PANEL_ID}>
          <ChatSessionTab
            sessionId={null}
            onSessionCreated={handleSessionCreated}
            onNewSession={handleNewSession}
          />
        </TabPanel>
      </TabPanels>
    </div>
  );
}
