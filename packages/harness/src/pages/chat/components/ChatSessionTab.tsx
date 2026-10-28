import {
  Button,
  ChatComposer,
  ChatScrollToLatest,
  ChatThread,
  EmptyState,
  InlineNotice,
  useChatScroll,
} from '@contenox/ui';
import {
  AttachAudioButtons,
  AudioAttachmentNoticeView,
  ComposerAudioAttachments,
  useAudioAttachments,
} from '@contenox/ui/session-ui';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';
import { useWorkspaceFiles } from '../../../hooks/useWorkspaceFiles';
import { initialAcpSessionState } from '../../../hooks/acpSessionState';
import { EMPTY_SESSION_KEY } from '../../../hooks/acpWorkspaceState';
import { externalAgentFromMeta, type SessionConfigOption, type SessionConfigOptionValue } from '../../../lib/acp';
import { adoptResultFromMeta } from '../../../lib/adoptMeta';
import { AdoptedSessionBanner } from '../../../components/AdoptedSessionBanner';
import { useStagedAgent } from '../../../lib/stagedAgent';
import { useStagedRoot } from '../../../lib/stagedRoot';
import { useSetupStatus } from '../../../hooks/useSetupStatus';
import { usePersistentToggle } from '../../../hooks/usePersistentToggle';
import { classifyAcpExecutionError } from '../../../lib/acpFailureKind';
import { canAttachAudio } from '../lib/audioAttachments';
import { canAttachImages } from '../lib/imageAttachments';
import { activeMentions, mentionPreviewPath, type WorkspaceFileRef } from '../lib/mentions';
import { resolveWorkspaceRoot } from '../lib/workspaceRoot';
import { useFilePreview } from '../../../hooks/useFilePreview';
import { parseTerminalPassthrough } from '../lib/terminalPassthrough';
import { ChatSessionToolbar } from './ChatSessionToolbar';
import {
  AttachImageButton,
  ComposerImageAttachments,
  ImageAttachmentNoticeView,
  useImageAttachments,
} from './ComposerImageAttachments';
import { ExecutionErrorBanner, ResumedBanner } from './SessionBanners';
import { MentionMenu, useMentionMenu } from './MentionMenu';
import { PlanPanel } from './PlanPanel';
import { SlashCommandMenu, useSlashCommandMenu } from './SlashCommandMenu';
import { TranscriptItems } from './TranscriptItems';
import { WorkspacePanel } from './WorkspacePanel';
import { CanvasRegion } from './CanvasRegion';
import { useCanvasTabs } from '../../../hooks/useCanvasTabs';
import { fileCanvasTab, TERMINAL_CANVAS_TAB } from '../lib/canvasTabs';

const WORKSPACE_PANEL_TOGGLE_KEY = 'beam_workspace_panel_open';

const WORKSPACE_ROOT_CONFIG_ID = 'workspace-root';

const HITL_POLICY_CONFIG_ID = 'hitl-policy';

function configOptionCurrentValue(options: SessionConfigOption[], id: string): string | undefined {
  return options.find(o => o.id === id)?.currentValue;
}

function overlayStagedValues(
  options: SessionConfigOption[],
  staged: Record<string, SessionConfigOptionValue>,
): SessionConfigOption[] {
  if (options.length === 0 || Object.keys(staged).length === 0) return options;
  return options.map(opt => {
    const value = staged[opt.id];
    return value === undefined ? opt : { ...opt, currentValue: String(value) };
  });
}

export interface ChatSessionTabProps {
  sessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
  onNewSession: () => void;
}

export function ChatSessionTab({ sessionId, onSessionCreated, onNewSession }: ChatSessionTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    workspace,
    sessions,
    newSession,
    sendPrompt,
    runTerminal,
    respondPermission,
    cancel,
    setConfigOption,
    applyConfigOptions,
  } = useAcpWorkspace();

  const sessionKey = sessionId ?? EMPTY_SESSION_KEY;
  const session = sessions.slices[sessionKey] ?? initialAcpSessionState;

  const onEmptyChat = sessionId == null;

  const { stagedAgent, setStagedAgent } = useStagedAgent();
  const sessionInfo = workspace.sessions.find(s => s.sessionId === sessionId);
  const sessionAgentName = externalAgentFromMeta(sessionInfo?._meta);
  const adopted = adoptResultFromMeta(sessionInfo?._meta);
  const stagedExternalAgent = onEmptyChat ? stagedAgent : null;
  const attributionAgentName = sessionAgentName ?? workspace.agentName;

  const { refetch: refetchSetupStatus } = useSetupStatus(true);

  const [draft, setDraft] = useState('');
  const [stagedConfig, setStagedConfig] = useState<Record<string, SessionConfigOptionValue>>({});
  const { containerRef, endRef, isNearBottom, scrollToEnd } = useChatScroll({
    deps: [session.items, session.pendingPermission],
  });

  const { stagedRoot: launchRoot, setStagedRoot: setLaunchRoot } = useStagedRoot();
  useEffect(() => {
    if (!onEmptyChat || launchRoot == null) return;
    setStagedConfig(prev => ({ ...prev, [WORKSPACE_ROOT_CONFIG_ID]: launchRoot }));
    setLaunchRoot(null);
  }, [onEmptyChat, launchRoot, setLaunchRoot]);

  const stagedRoot = stagedConfig[WORKSPACE_ROOT_CONFIG_ID];
  const activeSessionCwd = sessionInfo?.cwd ?? null;
  const defaultRoot = configOptionCurrentValue(workspace.workspaceConfigOptions, WORKSPACE_ROOT_CONFIG_ID);
  const workspaceRoot = resolveWorkspaceRoot({
    onEmptyChat,
    stagedRoot: typeof stagedRoot === 'string' ? stagedRoot : undefined,
    defaultRoot,
    activeSessionCwd,
  });

  const currentHitlPolicy = onEmptyChat
    ? configOptionCurrentValue(overlayStagedValues(workspace.workspaceConfigOptions, stagedConfig), HITL_POLICY_CONFIG_ID)
    : configOptionCurrentValue(session.configOptions, HITL_POLICY_CONFIG_ID);

  const files = useWorkspaceFiles(workspaceRoot, currentHitlPolicy);

  const { open: panelOpen, toggle: togglePanel } = usePersistentToggle(WORKSPACE_PANEL_TOGGLE_KEY);

  const canvas = useCanvasTabs();
  const { open: openCanvasTab, close: closeCanvasTab } = canvas;
  const openTerminal = useCallback(() => openCanvasTab(TERMINAL_CANVAS_TAB), [openCanvasTab]);
  const openFile = useCallback((path: string) => openCanvasTab(fileCanvasTab(path)), [openCanvasTab]);
  const activeFileTab = canvas.tabs.find(tab => tab.id === canvas.activeId && tab.kind === 'file');
  const selectedFilePath = activeFileTab?.path ?? null;

  const terminalOpen = canvas.tabs.some(tab => tab.id === TERMINAL_CANVAS_TAB.id);
  const toggleSidecar = useCallback(
    () => (terminalOpen ? closeCanvasTab(TERMINAL_CANVAS_TAB.id) : openTerminal()),
    [terminalOpen, closeCanvasTab, openTerminal],
  );
  const openFileFromDrawer = useCallback(
    (path: string) => {
      openFile(path);
      if (panelOpen) togglePanel();
    },
    [openFile, panelOpen, togglePanel],
  );

  const terminalHasOutput = (session.terminal?.text?.length ?? 0) > 0;
  const autoSurfacedTerminalRef = useRef(false);
  useEffect(() => {
    if (terminalHasOutput && !autoSurfacedTerminalRef.current) {
      autoSurfacedTerminalRef.current = true;
      openCanvasTab(TERMINAL_CANVAS_TAB);
    }
  }, [terminalHasOutput, openCanvasTab]);

  const imagesSupported = canAttachImages(workspace.promptCapabilities);
  const imageAttachments = useImageAttachments(imagesSupported);
  const { takeImages, restoreImages } = imageAttachments;
  const audioSupported = canAttachAudio(workspace.promptCapabilities);
  const audioAttachments = useAudioAttachments(audioSupported, imageAttachments.images);
  const { takeForSend: takeAudio, approveForSend: approveAudio } = audioAttachments;
  const audioClipCount = audioAttachments.clips.length;

  const [mentions, setMentions] = useState<WorkspaceFileRef[]>([]);
  const [caret, setCaret] = useState(0);
  const mentionMenu = useMentionMenu({
    draft,
    caret,
    cache: files.cache,
    ensureLoaded: files.ensureLoaded,
    isLoading: files.isLoading,
    onInsert: (nextDraft, nextCaret, file) => {
      setDraft(nextDraft);
      setCaret(nextCaret);
      setMentions(prev => (prev.some(m => m.path === file.path) ? prev : [...prev, file]));
    },
    onDrill: (nextDraft, nextCaret) => {
      setDraft(nextDraft);
      setCaret(nextCaret);
    },
  });
  const trackCaret = useCallback((e: KeyboardEvent<HTMLTextAreaElement> | MouseEvent<HTMLTextAreaElement>) => {
    setCaret(e.currentTarget.selectionStart ?? 0);
  }, []);

  const previewPath = mentionMenu.open ? mentionPreviewPath(mentionMenu.entries, mentionMenu.activeIndex) : null;
  const filePreview = useFilePreview(previewPath, files.readFile);

  const lastRefetchedErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session.error) {
      lastRefetchedErrorRef.current = null;
      return;
    }
    if (lastRefetchedErrorRef.current === session.error) return;
    const kind = classifyAcpExecutionError(session.error);
    if (kind === 'generic') return;
    lastRefetchedErrorRef.current = session.error;
    void refetchSetupStatus();
  }, [session.error, refetchSetupStatus]);

  const handleOpenSettings = useCallback(() => navigate('/settings'), [navigate]);

  const slashMenu = useSlashCommandMenu({ draft, onDraftChange: setDraft, availableCommands: session.availableCommands });

  const composerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      slashMenu.handleKeyDown(e);
      mentionMenu.handleKeyDown(e);
    },
    [slashMenu, mentionMenu],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (slashMenu.open || mentionMenu.open) return;

      if (session.isPrompting) {
        const submitter = (e.nativeEvent as SubmitEvent).submitter ?? null;
        if (submitter) cancel();
        return;
      }

      const text = draft.trim();
      if (!text) return;

      const shellCommand = parseTerminalPassthrough(draft);
      if (shellCommand) {
        setDraft('');
        setMentions([]);
        openTerminal();
        let shellSid = sessionId;
        if (!shellSid) {
          const rootPick = typeof stagedRoot === 'string' && stagedRoot.trim() !== '' ? stagedRoot : undefined;
          try {
            shellSid = await newSession(rootPick, stagedExternalAgent);
          } catch {
            setDraft(draft);
            return;
          }
          if (stagedExternalAgent) setStagedAgent(null);
          onSessionCreated(shellSid);
        }
        void runTerminal(shellCommand);
        return;
      }

      if (audioClipCount > 0 && !approveAudio(text)) return;

      const turnMentions = activeMentions(draft, mentions);
      const turnImages = takeImages();
      setDraft('');
      setMentions([]);

      let sid = sessionId;
      if (!sid) {
        const rootPick = typeof stagedRoot === 'string' && stagedRoot.trim() !== '' ? stagedRoot : undefined;
        try {
          sid = await newSession(rootPick, stagedExternalAgent);
        } catch {
          setDraft(text);
          setMentions(turnMentions);
          restoreImages(turnImages);
          return;
        }
        if (!stagedExternalAgent) {
          const staged = Object.entries(stagedConfig)
            .filter(([configId]) => configId !== WORKSPACE_ROOT_CONFIG_ID)
            .map(([configId, value]) => ({ configId, value }));
          if (staged.length > 0) {
            try {
              await applyConfigOptions(staged);
            } catch {
              setDraft(text);
              setMentions(turnMentions);
              restoreImages(turnImages);
              return;
            }
          }
        }
        if (stagedExternalAgent) setStagedAgent(null);
        onSessionCreated(sid);
      }
      sendPrompt(text, turnMentions, turnImages, takeAudio());
    },
    [
      slashMenu.open,
      mentionMenu.open,
      session.isPrompting,
      draft,
      mentions,
      takeImages,
      restoreImages,
      takeAudio,
      approveAudio,
      audioClipCount,
      stagedRoot,
      stagedExternalAgent,
      setStagedAgent,
      sessionId,
      stagedConfig,
      newSession,
      applyConfigOptions,
      onSessionCreated,
      sendPrompt,
      runTerminal,
      openTerminal,
      cancel,
    ],
  );

  const handleConfigChange = useCallback(
    (configId: string, value: SessionConfigOptionValue) => {
      if (sessionId == null) {
        setStagedConfig(prev => ({ ...prev, [configId]: value }));
      } else {
        setConfigOption(configId, value);
      }
    },
    [sessionId, setConfigOption],
  );

  const hasContent = session.items.length > 0;
  const composerDisabled = session.pendingPermission != null || (!session.isPrompting && workspace.status !== 'ready');

  const headerConfigOptions = onEmptyChat
    ? stagedExternalAgent
      ? []
      : overlayStagedValues(workspace.workspaceConfigOptions, stagedConfig)
    : session.configOptions.filter(o => o.id !== WORKSPACE_ROOT_CONFIG_ID);

  return (
    <div className="bg-surface dark:bg-dark-surface flex h-full min-h-0 flex-col">
      <ChatSessionToolbar
        usage={session.usage}
        configOptions={headerConfigOptions}
        onConfigChange={handleConfigChange}
        showNewSession={!onEmptyChat}
        onNewSession={onNewSession}
        showFilesToggle={!!workspaceRoot}
        filesOpen={panelOpen}
        onToggleFiles={togglePanel}
        sidecarOpen={terminalOpen}
        onToggleSidecar={toggleSidecar}
      />

      {adopted && (
        <AdoptedSessionBanner
          instanceId={adopted.instanceId}
          controller={adopted.controller}
          agentName={sessionAgentName}
        />
      )}

      {workspace.status === 'reconnecting' && <InlineNotice variant="warning">{t('acp_chat.banner_reconnecting')}</InlineNotice>}
      {session.connectionBanner === 'disconnected' && (
        <InlineNotice variant="warning">{t('acp_chat.banner_disconnected')}</InlineNotice>
      )}
      {session.connectionBanner === 'resumed' && <ResumedBanner />}
      {session.error && <ExecutionErrorBanner message={session.error} onOpenSettings={handleOpenSettings} />}

      <PlanPanel entries={session.plan} />

      <div className="flex min-h-0 flex-1">
        {workspaceRoot && (
          <div className="border-surface-200 dark:border-dark-surface-600 hidden shrink-0 flex-col items-center gap-1 border-r px-1 py-2 sm:flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-pressed={panelOpen}
              aria-label={t('workspace.toggle_label')}
              title={t('workspace.show_files')}
              onClick={togglePanel}>
              {panelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>
        )}
        {panelOpen && workspaceRoot && (
          <div className="hidden sm:flex">
            <WorkspacePanel
              root={workspaceRoot}
              files={files}
              onOpenFile={openFile}
              selectedFilePath={selectedFilePath}
            />
          </div>
        )}

        {panelOpen && workspaceRoot && (
          <div
            className="fixed inset-x-0 top-16 bottom-0 z-40 flex sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t('workspace.panel_title')}>
            <div className="absolute inset-0 bg-black/50" onClick={togglePanel} aria-hidden />
            <div className="relative z-10 flex h-full max-w-[85vw]">
              <WorkspacePanel
                root={workspaceRoot}
                files={files}
                onOpenFile={openFileFromDrawer}
                selectedFilePath={selectedFilePath}
              />
            </div>
          </div>
        )}
        <CanvasRegion
          sessionId={sessionId}
          canvas={canvas}
          readFile={files.readFile}
          className="flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!hasContent && !session.pendingPermission ? (
            <div className="m-auto">
              <EmptyState
                title={t('acp_chat.empty_title')}
                description={
                  stagedExternalAgent
                    ? t('acp_chat.empty_description_agent', { name: stagedExternalAgent })
                    : t('acp_chat.empty_description')
                }
              />
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <ChatThread containerRef={containerRef} endRef={endRef}>
                <TranscriptItems
                  session={session}
                  agentName={attributionAgentName}
                  onRespondPermission={respondPermission}
                  onOpenFile={openFile}
                />
              </ChatThread>
              <ChatScrollToLatest
                visible={!isNearBottom}
                onClick={scrollToEnd}
                label={t('acp_chat.scroll_to_latest')}
              />
            </div>
          )}

          <div
            className="relative flex min-h-0 flex-col px-3 pb-3 sm:px-4"
            onDrop={imageAttachments.handleDrop}
            onDragOver={imageAttachments.handleDragOver}>
            {slashMenu.open ? (
              <SlashCommandMenu
                entries={slashMenu.entries}
                activeIndex={slashMenu.activeIndex}
                onPick={slashMenu.pick}
                onHoverIndex={slashMenu.setActiveIndex}
              />
            ) : mentionMenu.open ? (
              <MentionMenu
                entries={mentionMenu.entries}
                scope={mentionMenu.scope}
                loading={mentionMenu.loading}
                activeIndex={mentionMenu.activeIndex}
                onPick={mentionMenu.pick}
                onHoverIndex={mentionMenu.setActiveIndex}
                preview={filePreview}
              />
            ) : null}
            <div className="shrink-0">
              <ImageAttachmentNoticeView notice={imageAttachments.notice} />
              <AudioAttachmentNoticeView notice={audioAttachments.notice} />
              <ChatComposer
                value={draft}
                onChange={setDraft}
                onSubmit={handleSubmit}
                isPending={false}
                disabled={composerDisabled}
                canSubmit={workspace.status === 'ready' || session.isPrompting}
                allowEmptyMessage={session.isPrompting}
                submitLabel={session.isPrompting ? t('acp_chat.composer_stop') : t('acp_chat.composer_send')}
                placeholder={workspace.status === 'ready' ? t('acp_chat.composer_placeholder') : t('acp_chat.composer_placeholder_connecting')}
                attachments={
                  <>
                    <ComposerImageAttachments images={imageAttachments.images} onRemove={imageAttachments.removeImage} />
                    <ComposerAudioAttachments clips={audioAttachments.clips} onRemove={audioAttachments.removeClip} />
                  </>
                }
                footerStart={
                  imagesSupported || audioSupported ? (
                    <>
                      {imagesSupported && (
                        <AttachImageButton
                          onFiles={files => void imageAttachments.addFiles(files)}
                          disabled={composerDisabled}
                        />
                      )}
                      {audioSupported && (
                        <AttachAudioButtons
                          onFiles={files => void audioAttachments.addFiles(files)}
                          disabled={composerDisabled}
                          recording={audioAttachments.recording}
                          onStartRecording={() => void audioAttachments.startRecording()}
                          onStopRecording={audioAttachments.stopRecording}
                          onCancelRecording={audioAttachments.cancelRecording}
                        />
                      )}
                    </>
                  ) : undefined
                }
                textareaProps={{
                  onKeyDown: composerKeyDown,
                  onKeyUp: trackCaret,
                  onClick: trackCaret,
                  onSelect: trackCaret,
                  onPaste: imageAttachments.handlePaste,
                }}
              />
            </div>
          </div>
          </div>
        </CanvasRegion>
      </div>
    </div>
  );
}
