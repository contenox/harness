import { memo, useEffect, useMemo, useState } from 'react';
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
  const { session, workspaceRoot, paneState, closePane } = chat;
  const ready = chat.workspaceStatus === 'ready';
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  useEffect(() => {
    if (!active) setConnectorsOpen(false);
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
  const footerEnd = useMemo(
    () => (
      <ComposerFooterEnd
        usage={session.usage}
        options={chat.chipOptions}
        onChange={chat.changeConfig}
        onModelOpen={chat.refreshCatalog}
      />
    ),
    [session.usage, chat.chipOptions, chat.changeConfig, chat.refreshCatalog],
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
      <FilesPane
        root={workspaceRoot}
        files={chat.files}
        state={paneState}
        dispatch={chat.dispatchPane}
        onOpenFile={chat.openFile}
        onClose={closePane}
        paneTabs={paneTabs}
      />
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
      <ChatSessionView
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
            files={chat.files}
            availableCommands={chat.availableCommands}
            configOptions={chat.configOptions}
            isPrompting={session.isPrompting}
            disabled={session.pendingPermission != null || (!session.isPrompting && !ready)}
            ready={ready}
            imagesSupported={chat.imagesSupported}
            audioSupported={chat.audioSupported}
            projectChip={projectChip}
            footerEnd={footerEnd}
            onSubmit={chat.submit}
            onCancel={chat.cancel}
            onOpenConnectors={
              chat.sessionAgentName == null ? () => setConnectorsOpen(true) : undefined
            }
          />
        }
      />
      <SessionConnectorsDialog
        open={connectorsOpen && active}
        sessionId={sessionId}
        controller={chat.controller}
        onClose={() => setConnectorsOpen(false)}
      />
    </>
  );
});
