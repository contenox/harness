import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialAcpSessionState } from '../../../hooks/acpSessionState';
import { EMPTY_SESSION_KEY } from '../../../hooks/acpWorkspaceState';
import { useChatPane } from '../../../hooks/chatPaneStore';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';
import { useSetupStatus } from '../../../hooks/useSetupStatus';
import { useWorkspaceFiles } from '../../../hooks/useWorkspaceFiles';
import {
  externalAgentFromMeta,
  type SessionConfigOption,
  type SessionConfigOptionValue,
} from '../../../lib/acp';
import { classifyAcpExecutionError } from '../../../lib/acpFailureKind';
import { adoptResultFromMeta } from '../../../lib/adoptMeta';
import { useStagedAgent } from '../../../lib/stagedAgent';
import { useStagedRoot } from '../../../lib/stagedRoot';
import { splitComposerOptions, WORKSPACE_ROOT_CONFIG_ID } from '../lib/composerChips';
import { canAttachAudio } from '../lib/audioAttachments';
import { canAttachImages } from '../lib/imageAttachments';
import { submitChatTurn, type SubmitPayload } from '../lib/submitTurn';
import { mostRecentProjectRoot, resolveWorkspaceRoot } from '../lib/workspaceRoot';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { selectAvailableCommands } from '../lib/slashMenuState';

const HITL_POLICY_CONFIG_ID = 'hitl-policy';

function configOptionCurrentValue(options: SessionConfigOption[], id: string): string | undefined {
  return options.find(o => o.id === id)?.currentValue;
}

export function overlayStagedValues(
  options: SessionConfigOption[],
  staged: Record<string, SessionConfigOptionValue>,
): SessionConfigOption[] {
  if (options.length === 0 || Object.keys(staged).length === 0) return options;
  return options.map(opt => {
    const value = staged[opt.id];
    return value === undefined ? opt : { ...opt, currentValue: String(value) };
  });
}

/**
 * Orchestration for one chat tab: which session / root / agent it shows, staged (pre-session)
 * config, the right pane, and the submit / cancel / config actions. Holds no composer state, so
 * typing never re-renders whatever consumes this hook.
 */
export function useChatSession(sessionId: string | null, onSessionCreated: (sessionId: string) => void) {
  const navigate = useNavigate();
  const acp = useAcpWorkspace();
  const { workspace, sessions, newSession, sendPrompt, runTerminal, cancel, setConfigOption, applyConfigOptions } =
    acp;

  const sessionKey = sessionId ?? EMPTY_SESSION_KEY;
  const session = sessions.slices[sessionKey] ?? initialAcpSessionState;
  const onEmptyChat = sessionId == null;

  const { stagedAgent, setStagedAgent } = useStagedAgent();
  const sessionInfo = workspace.sessions.find(s => s.sessionId === sessionId);
  const sessionAgentName = externalAgentFromMeta(sessionInfo?._meta);
  const adopted = adoptResultFromMeta(sessionInfo?._meta);
  const stagedExternalAgent = onEmptyChat ? stagedAgent : null;
  const attributionAgentName = sessionAgentName ?? workspace.agentName;

  const [stagedConfig, setStagedConfig] = useState<Record<string, SessionConfigOptionValue>>({});
  const { stagedRoot: launchRoot, setStagedRoot: setLaunchRoot } = useStagedRoot();
  useEffect(() => {
    if (!onEmptyChat || launchRoot == null) return;
    setStagedConfig(prev => ({ ...prev, [WORKSPACE_ROOT_CONFIG_ID]: launchRoot }));
    setLaunchRoot(null);
  }, [onEmptyChat, launchRoot, setLaunchRoot]);

  const stagedRoot = stagedConfig[WORKSPACE_ROOT_CONFIG_ID];
  const defaultRoot = configOptionCurrentValue(workspace.workspaceConfigOptions, WORKSPACE_ROOT_CONFIG_ID);
  const { roots: projectRoots } = useWorkspaceRoots();
  const recentRoot = useMemo(
    () => mostRecentProjectRoot(workspace.sessions, projectRoots),
    [workspace.sessions, projectRoots],
  );
  const workspaceRoot = resolveWorkspaceRoot({
    onEmptyChat,
    stagedRoot: typeof stagedRoot === 'string' ? stagedRoot : undefined,
    recentRoot,
    defaultRoot,
    activeSessionCwd: sessionInfo?.cwd ?? null,
  });

  const currentHitlPolicy = onEmptyChat
    ? configOptionCurrentValue(overlayStagedValues(workspace.workspaceConfigOptions, stagedConfig), HITL_POLICY_CONFIG_ID)
    : configOptionCurrentValue(session.configOptions, HITL_POLICY_CONFIG_ID);
  const files = useWorkspaceFiles(workspaceRoot, currentHitlPolicy);

  const { state: paneState, dispatch: dispatchPane } = useChatPane(sessionKey);
  const openFile = useCallback((path: string) => dispatchPane({ type: 'openFile', path }), [dispatchPane]);
  const openTerminal = useCallback(() => dispatchPane({ type: 'show', pane: 'terminal' }), [dispatchPane]);
  const closePane = useCallback(() => dispatchPane({ type: 'close' }), [dispatchPane]);

  const { refetch: refetchSetupStatus } = useSetupStatus(true);
  const lastRefetchedErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session.error) {
      lastRefetchedErrorRef.current = null;
      return;
    }
    if (lastRefetchedErrorRef.current === session.error) return;
    if (classifyAcpExecutionError(session.error) === 'generic') return;
    lastRefetchedErrorRef.current = session.error;
    void refetchSetupStatus();
  }, [session.error, refetchSetupStatus]);

  const openSettings = useCallback(() => navigate('/settings'), [navigate]);

  const submit = useCallback(
    (payload: SubmitPayload) =>
      submitChatTurn(
        {
          sessionId,
          workspaceRoot,
          stagedExternalAgent,
          stagedConfig,
          newSession,
          applyConfigOptions,
          sendPrompt,
          runTerminal,
          openTerminal,
          clearStagedAgent: () => setStagedAgent(null),
          onSessionCreated,
        },
        payload,
      ),
    [
      sessionId,
      workspaceRoot,
      stagedExternalAgent,
      stagedConfig,
      newSession,
      applyConfigOptions,
      sendPrompt,
      runTerminal,
      openTerminal,
      setStagedAgent,
      onSessionCreated,
    ],
  );

  const changeConfig = useCallback(
    (configId: string, value: SessionConfigOptionValue) => {
      if (sessionId == null) setStagedConfig(prev => ({ ...prev, [configId]: value }));
      else setConfigOption(configId, value);
    },
    [sessionId, setConfigOption],
  );
  const selectProject = useCallback(
    (path: string) => setStagedConfig(prev => ({ ...prev, [WORKSPACE_ROOT_CONFIG_ID]: path })),
    [],
  );

  const sourceOptions = onEmptyChat
    ? stagedExternalAgent
      ? undefined
      : overlayStagedValues(workspace.workspaceConfigOptions, stagedConfig)
    : session.configOptions;
  const chipOptions = useMemo(() => splitComposerOptions(sourceOptions ?? []), [sourceOptions]);

  return {
    sessionId,
    onEmptyChat,
    session,
    workspaceStatus: workspace.status,
    attributionAgentName,
    sessionAgentName,
    adopted,
    stagedExternalAgent,
    workspaceRoot,
    files,
    paneState,
    dispatchPane,
    openFile,
    closePane,
    openSettings,
    respondPermission: acp.respondPermission,
    cancel,
    submit,
    changeConfig,
    selectProject,
    chipOptions,
    imagesSupported: canAttachImages(workspace.promptCapabilities),
    audioSupported: canAttachAudio(workspace.promptCapabilities),
    availableCommands: selectAvailableCommands(session.availableCommands, workspace.workspaceAvailableCommands),
  };
}

export type ChatSessionModel = ReturnType<typeof useChatSession>;
