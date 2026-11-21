import { Button } from '@contenox/ui';
import { Globe } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setActiveChatPaneKey } from '../../../hooks/chatPaneStore';
import { useBrowserRegistration } from '../../../hooks/useConnectors';
import { browserWorkspaceCovers } from '../../../lib/browserWorkspace';
import { SelectionQuote } from '../../../lib/selectionQuote';
import { BrowserPane } from '../../BrowserPage';
import { WorkspaceMediaDialog } from '../../media/WorkspaceMediaDialog';
import { useChatSession } from '../hooks/useChatSession';
import { ChatComposerContainer } from './ChatComposerContainer';
import { ChatSessionView } from './ChatSessionView';
import { ProjectChip } from './ComposerChips';
import { ComposerFooterEnd } from './ComposerFooter';
import { DiffPane } from './DiffPane';
import { FilesPane } from './FilesPane';
import { PaneTabs } from './PaneTabs';
import { SearchPane } from './SearchPane';
import { SessionConnectorsDialog } from './SessionConnectorsDialog';
import { SessionHeaderArea } from './SessionHeaderArea';
import { TerminalPane } from './TerminalPane';
import { TranscriptArea } from './TranscriptArea';
import { WorkspaceColumn } from './WorkspaceColumn';

export interface ChatSessionTabProps {
  sessionId: string | null;
  active?: boolean;
  onSessionCreated: (sessionId: string) => void;
}

/**
 * One chat tab. It wires the session model into the view; draft state is not here (see
 * ChatComposerContainer), so keystrokes never re-render this component or the transcript.
 */
export const ChatSessionTab = memo(function ChatSessionTab({
  sessionId,
  active = true,
  onSessionCreated,
}: ChatSessionTabProps) {
  const chat = useChatSession(sessionId, onSessionCreated);
  const appendQuote = useRef<((value: string) => void) | null>(null);
  const quote = useCallback((path: string, first: number, last: number, text: string) => {
    appendQuote.current?.(
      path +
        ' (' +
        first +
        '–' +
        last +
        ')\n' +
        text
          .split('\n')
          .map(line => '> ' + line)
          .join('\n') +
        '\n\n',
    );
  }, []);
  useEffect(() => {
    if (active) setActiveChatPaneKey(chat.paneKey);
  }, [active, chat.paneKey]);
  const { session, workspaceRoot, paneState, closePane } = chat;
  const [search, setSearch] = useSearchParams();
  const { data: browser } = useBrowserRegistration(active);
  const browserId = browserWorkspaceCovers(
    browser?.workspace,
    workspaceRoot,
    globalThis.window?.contenoxDesktop?.platform,
  )
    ? browser?.id
    : undefined;
  const showingBrowser = active && !!browserId && search.get('browser') === browserId;
  const ready = chat.workspaceStatus === 'ready';
  const [mediaRoot, setMediaRoot] = useState<string | null>(null);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  useEffect(() => {
    if (!active) {
      setConnectorsOpen(false);
      setMediaRoot(null);
    }
  }, [active]);

  const projectChip = useMemo(
    () => (
      <ProjectChip
        root={workspaceRoot}
        editable={chat.onEmptyChat && !chat.stagedExternalAgent}
        onSelect={chat.selectProject}
      />
    ),
    [workspaceRoot, chat.onEmptyChat, chat.stagedExternalAgent, chat.selectProject],
  );
  function showChat() {
    setSearch(
      params => {
        params.delete('browser');
        return params;
      },
      { replace: true },
    );
  }
  const footerEnd = useMemo(
    () => (
      <ComposerFooterEnd
        usage={session.usage}
        userMessages={session.userMessages}
        options={chat.chipOptions}
        onChange={chat.changeConfig}
        onModelOpen={chat.refreshCatalog}
      />
    ),
    [session.usage, session.userMessages, chat.chipOptions, chat.changeConfig, chat.refreshCatalog],
  );

  const paneTabs = paneState.pane ? (
    <PaneTabs
      active={paneState.pane}
      onSelect={pane => chat.dispatchPane({ type: 'show', pane })}
    />
  ) : null;

  const paneContent =
    paneState.pane === 'terminal' ? (
      <TerminalPane
        sessionId={sessionId}
        cwd={workspaceRoot}
        agentOutputAvailable={(session.terminal?.text?.length ?? 0) > 0}
        onClose={closePane}
        paneTabs={paneTabs}
      />
    ) : paneState.pane === 'files' ? (
      <SelectionQuote.Provider value={quote}>
        <FilesPane
          root={workspaceRoot}
          files={chat.files}
          state={paneState}
          dispatch={chat.dispatchPane}
          onOpenFile={chat.openFile}
          onClose={closePane}
          paneTabs={paneTabs}
        />
      </SelectionQuote.Provider>
    ) : paneState.pane === 'search' ? (
      <SearchPane
        root={workspaceRoot}
        files={chat.files}
        onOpenFile={chat.openFile}
        onClose={closePane}
        paneTabs={paneTabs}
      />
    ) : paneState.pane === 'diff' ? (
      <DiffPane
        session={session}
        onOpenFile={chat.openFile}
        canOpenFile={chat.canOpenFile}
        onClose={closePane}
        paneTabs={paneTabs}
      />
    ) : null;

  return (
    <>
      {showingBrowser && <BrowserPane id={browserId} onChat={showChat} onClosed={showChat} />}
      <ChatSessionView
        hidden={showingBrowser}
        pane={paneState.pane}
        paneContent={paneContent}
        workspaceTree={
          <WorkspaceColumn
            root={workspaceRoot}
            files={chat.files}
            selectedFilePath={paneState.activeFile}
            onOpenFile={chat.openFile}
            onPathMoved={(from, to) => chat.dispatchPane({ type: 'movePath', from, to })}
            onPathDeleted={path => chat.dispatchPane({ type: 'closeUnder', path })}
          />
        }
        header={
          <SessionHeaderArea
            adopted={chat.adopted}
            agentName={chat.sessionAgentTitle}
            workspaceStatus={chat.workspaceStatus}
            connectionBanner={session.connectionBanner}
            plan={session.plan}
          />
        }
        transcript={
          <TranscriptArea
            session={session}
            agentName={chat.attributionAgentName}
            stagedAgent={chat.stagedAgentTitle}
            onRespondPermission={chat.respondPermission}
            onOpenFile={chat.openFile}
            canOpenFile={chat.canOpenFile}
            onOpenSettings={chat.openSettings}
          />
        }
        composer={
          <ChatComposerContainer
            appendQuote={appendQuote}
            files={chat.files}
            availableCommands={chat.availableCommands}
            configOptions={chat.configOptions}
            isPrompting={session.isPrompting}
            disabled={session.pendingPermission != null || (!session.isPrompting && !ready)}
            ready={ready}
            imagesSupported={chat.imagesSupported}
            audioSupported={chat.audioSupported}
            projectChip={
              <>
                {projectChip}
                {browserId && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      setSearch(
                        params => {
                          params.set('browser', browserId);
                          return params;
                        },
                        { replace: true },
                      );
                    }}>
                    <Globe size={14} aria-hidden /> Browser
                  </Button>
                )}
              </>
            }
            footerEnd={footerEnd}
            onSubmit={chat.submit}
            onCancel={chat.cancel}
            onOpenMedia={workspaceRoot ? () => setMediaRoot(workspaceRoot) : undefined}
            onOpenConnectors={
              chat.sessionAgentName == null ? () => setConnectorsOpen(true) : undefined
            }
          />
        }
      />
      {active && mediaRoot && mediaRoot === workspaceRoot && (
        <WorkspaceMediaDialog
          key={mediaRoot}
          root={mediaRoot}
          onClose={() => setMediaRoot(null)}
          onOpen={file => {
            chat.files.refresh();
            chat.openFile(file);
          }}
        />
      )}
      <SessionConnectorsDialog
        open={connectorsOpen && active}
        sessionId={sessionId}
        controller={chat.controller}
        onClose={() => setConnectorsOpen(false)}
      />
    </>
  );
});
