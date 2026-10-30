import { useCallback, useEffect } from 'react';
import type { SessionConfigOptionValue } from '../lib/acp';
import type { AdoptRef } from '../lib/adoptMeta';
import type { PendingAudioAttachment } from '../pages/chat/lib/audioAttachments';
import type { PendingImageAttachment } from '../pages/chat/lib/imageAttachments';
import type { WorkspaceFileRef } from '../pages/chat/lib/mentions';
import type { AcpWorkspaceController } from './acpWorkspaceController';
import { useAcpWorkspaceContext } from '../lib/acp/AcpWorkspaceProvider';
import type { AcpSessionState } from './acpSessionState';
import { selectOpenSessionIds, type AcpSessionsState, type AcpWorkspaceState } from './acpWorkspaceState';

export interface UseAcpWorkspaceResult {
  /** The controller behind this workspace, for extension calls the page needs (agents view). */
  controller: AcpWorkspaceController;
  workspace: AcpWorkspaceState;
  session: AcpSessionState;
  sessions: AcpSessionsState;
  openSessionIds: string[];
  refreshSessions: () => void;
  newSession: (cwd?: string, agentName?: string | null) => Promise<string>;
  adoptSession: (ref: AdoptRef, cwd?: string) => Promise<string>;
  openSession: (id: string) => void;
  openSessionTab: (id: string) => Promise<void>;
  closeSessionTab: (id: string) => void;
  focusSession: (id: string) => void;
  focusEmptyTab: () => void;
  deleteSession: (id: string) => void;
  clearActiveSession: () => void;
  sendPrompt: (
    text: string,
    mentions?: WorkspaceFileRef[],
    images?: PendingImageAttachment[],
    audio?: PendingAudioAttachment[],
  ) => void;
  runTerminal: (command: string) => Promise<void>;
  respondPermission: (optionId: string) => void;
  cancel: () => void;
  setConfigOption: (configId: string, value: string | boolean) => void;
  applyConfigOptions: (options: Array<{ configId: string; value: SessionConfigOptionValue }>) => Promise<void>;
  reconnect: () => void;
}

export function useAcpWorkspace(): UseAcpWorkspaceResult {
  const { workspace, session, sessions, controller } = useAcpWorkspaceContext();

  useEffect(() => {
    void controller.connect();
  }, [controller]);

  const openSessionIds = selectOpenSessionIds(sessions);

  const refreshSessions = useCallback(() => {
    void controller.refreshSessions();
  }, [controller]);

  const newSession = useCallback(
    (cwd?: string, agentName?: string | null) => controller.newSession(cwd, agentName),
    [controller],
  );

  const adoptSession = useCallback(
    (ref: AdoptRef, cwd?: string) => controller.adoptSession(ref, cwd),
    [controller],
  );

  const openSession = useCallback(
    (id: string) => {
      void controller.openSession(id);
    },
    [controller],
  );

  const openSessionTab = useCallback((id: string) => controller.openSessionTab(id), [controller]);

  const closeSessionTab = useCallback(
    (id: string) => {
      controller.closeSessionTab(id);
    },
    [controller],
  );

  const focusSession = useCallback(
    (id: string) => {
      controller.focusSession(id);
    },
    [controller],
  );

  const focusEmptyTab = useCallback(() => {
    controller.focusEmptyTab();
  }, [controller]);

  const deleteSession = useCallback(
    (id: string) => {
      void controller.deleteSession(id);
    },
    [controller],
  );

  const clearActiveSession = useCallback(() => {
    controller.clearActiveSession();
  }, [controller]);

  const sendPrompt = useCallback(
    (
      text: string,
      mentions?: WorkspaceFileRef[],
      images?: PendingImageAttachment[],
      audio?: PendingAudioAttachment[],
    ) => {
      controller.sendPrompt(text, mentions, images, audio);
    },
    [controller],
  );

  const runTerminal = useCallback(
    (command: string) => controller.runTerminal(command),
    [controller],
  );

  const respondPermission = useCallback(
    (optionId: string) => {
      controller.respondPermission(optionId);
    },
    [controller],
  );

  const cancel = useCallback(() => {
    controller.cancel();
  }, [controller]);

  const setConfigOption = useCallback(
    (configId: string, value: string | boolean) => {
      void controller.setConfigOption(configId, value);
    },
    [controller],
  );

  const applyConfigOptions = useCallback(
    (options: Array<{ configId: string; value: SessionConfigOptionValue }>) =>
      controller.applyConfigOptions(options),
    [controller],
  );

  const reconnect = useCallback(() => {
    void controller.reconnect();
  }, [controller]);

  return {
    controller,
    workspace,
    session,
    sessions,
    openSessionIds,
    refreshSessions,
    newSession,
    adoptSession,
    openSession,
    openSessionTab,
    closeSessionTab,
    focusSession,
    focusEmptyTab,
    deleteSession,
    clearActiveSession,
    sendPrompt,
    runTerminal,
    respondPermission,
    cancel,
    setConfigOption,
    applyConfigOptions,
    reconnect,
  };
}
