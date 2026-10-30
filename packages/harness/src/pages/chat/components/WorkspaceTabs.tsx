import { TabPanel, TabPanels } from '@contenox/ui';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';
import { setActiveChatPaneKey } from '../../../hooks/chatPaneStore';
import { EMPTY_SESSION_KEY } from '../../../hooks/acpWorkspaceState';
import { useWorkspaceTabs } from '../../../hooks/useWorkspaceTabs';
import { useAdoptIntent } from '../../../lib/adoptIntent';
import { routeForActiveTab } from '../lib/workspaceTabs';
import { ChatSessionTab } from './ChatSessionTab';

const EMPTY_PANEL_ID = '__empty__';

export function WorkspaceTabs() {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams<{ sessionId?: string }>();
  const { workspace, adoptSession } = useAcpWorkspace();
  const tabModel = useWorkspaceTabs();
  const { tabs, activeId, open, openEmpty } = tabModel;

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

  useEffect(() => {
    setActiveChatPaneKey(activeId ?? EMPTY_SESSION_KEY);
  }, [activeId]);

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

  if (tabs.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatSessionTab
          key={`empty-${emptyKeyRef.current}`}
          sessionId={null}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      <TabPanels>
        {tabs.map(id => (
          <TabPanel key={id} tabId={id} activeTab={activeId ?? EMPTY_PANEL_ID}>
            <ChatSessionTab
              sessionId={id}
              onSessionCreated={handleSessionCreated}
                />
          </TabPanel>
        ))}
        <TabPanel key={`empty-${emptyKeyRef.current}`} tabId={EMPTY_PANEL_ID} activeTab={activeId ?? EMPTY_PANEL_ID}>
          <ChatSessionTab
            sessionId={null}
            onSessionCreated={handleSessionCreated}
            />
        </TabPanel>
      </TabPanels>
    </div>
  );
}
