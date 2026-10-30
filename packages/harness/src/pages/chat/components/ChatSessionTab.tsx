import { memo, useMemo } from 'react';
import { useChatSession } from '../hooks/useChatSession';
import { ChatComposerContainer } from './ChatComposerContainer';
import { ChatSessionView } from './ChatSessionView';
import { ComposerFooterEnd } from './ComposerFooter';
import { ProjectChip } from './ComposerChips';
import { DiffPane } from './DiffPane';
import { FilesPane } from './FilesPane';
import { SessionHeaderArea } from './SessionHeaderArea';
import { TerminalPane } from './TerminalPane';
import { TranscriptArea } from './TranscriptArea';

export interface ChatSessionTabProps {
  sessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
}

/**
 * One chat tab. It wires the session model into the view; draft state is not here (see
 * ChatComposerContainer), so keystrokes never re-render this component or the transcript.
 */
export const ChatSessionTab = memo(function ChatSessionTab({ sessionId, onSessionCreated }: ChatSessionTabProps) {
  const chat = useChatSession(sessionId, onSessionCreated);
  const { session, workspaceRoot, paneState, closePane } = chat;
  const ready = chat.workspaceStatus === 'ready';

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

  const paneContent =
    paneState.pane === 'terminal' ? (
      <TerminalPane
        sessionId={sessionId}
        cwd={workspaceRoot}
        agentOutputAvailable={(session.terminal?.text?.length ?? 0) > 0}
        onClose={closePane}
      />
    ) : paneState.pane === 'files' ? (
      <FilesPane root={workspaceRoot} files={chat.files} state={paneState} dispatch={chat.dispatchPane} onClose={closePane} />
    ) : paneState.pane === 'diff' ? (
      <DiffPane session={session} onOpenFile={chat.openFile} onClose={closePane} />
    ) : null;

  return (
    <ChatSessionView
      pane={paneState.pane}
      paneContent={paneContent}
      header={
        <SessionHeaderArea
          adopted={chat.adopted}
          agentName={chat.sessionAgentName}
          workspaceStatus={chat.workspaceStatus}
          connectionBanner={session.connectionBanner}
          error={session.error}
          plan={session.plan}
          onOpenSettings={chat.openSettings}
        />
      }
      transcript={
        <TranscriptArea
          session={session}
          agentName={chat.attributionAgentName}
          stagedAgent={chat.stagedExternalAgent}
          onRespondPermission={chat.respondPermission}
          onOpenFile={chat.openFile}
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
        />
      }
    />
  );
});
