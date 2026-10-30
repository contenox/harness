import type { SessionConfigOptionValue } from '../../../lib/acp';
import type { PendingAudioAttachment } from './audioAttachments';
import type { PendingImageAttachment } from './imageAttachments';
import type { WorkspaceFileRef } from './mentions';
import { WORKSPACE_ROOT_CONFIG_ID } from './composerChips';

/** What the composer hands over on submit. Draft / attachment state stays inside the composer. */
export type SubmitPayload =
  | { kind: 'shell'; command: string }
  | {
      kind: 'prompt';
      text: string;
      mentions: WorkspaceFileRef[];
      images: PendingImageAttachment[];
      /** Audio is only drained once the session exists, so a failed start leaves the clips staged. */
      takeAudio: () => PendingAudioAttachment[];
    };

export interface SubmitTurnDeps {
  /** Null on the empty (new chat) surface. */
  sessionId: string | null;
  /** Staged root, else the default root. Never '/', which is not absolute on Windows. */
  workspaceRoot: string | null;
  stagedExternalAgent: string | null;
  stagedConfig: Record<string, SessionConfigOptionValue>;
  newSession: (cwd?: string, agentName?: string | null) => Promise<string>;
  applyConfigOptions: (options: Array<{ configId: string; value: SessionConfigOptionValue }>) => Promise<void>;
  sendPrompt: (
    text: string,
    mentions: WorkspaceFileRef[],
    images: PendingImageAttachment[],
    audio: PendingAudioAttachment[],
  ) => void;
  runTerminal: (command: string) => Promise<void>;
  openTerminal: () => void;
  clearStagedAgent: () => void;
  onSessionCreated: (sessionId: string) => void;
}

async function ensureSession(deps: SubmitTurnDeps, applyStagedConfig: boolean): Promise<string> {
  if (deps.sessionId) return deps.sessionId;
  const cwd = deps.workspaceRoot ?? undefined;
  const sid = await deps.newSession(cwd, deps.stagedExternalAgent);
  if (applyStagedConfig && !deps.stagedExternalAgent) {
    const staged = Object.entries(deps.stagedConfig)
      .filter(([configId]) => configId !== WORKSPACE_ROOT_CONFIG_ID)
      .map(([configId, value]) => ({ configId, value }));
    if (staged.length > 0) await deps.applyConfigOptions(staged);
  }
  if (deps.stagedExternalAgent) deps.clearStagedAgent();
  deps.onSessionCreated(sid);
  return sid;
}

/**
 * Starts the session if needed, then sends the turn. Rejects when the session could not be
 * created or configured; the caller restores the user's input in that case.
 */
export async function submitChatTurn(deps: SubmitTurnDeps, payload: SubmitPayload): Promise<void> {
  if (payload.kind === 'shell') {
    deps.openTerminal();
    await ensureSession(deps, false);
    void deps.runTerminal(payload.command);
    return;
  }
  await ensureSession(deps, true);
  deps.sendPrompt(payload.text, payload.mentions, payload.images, payload.takeAudio());
}
