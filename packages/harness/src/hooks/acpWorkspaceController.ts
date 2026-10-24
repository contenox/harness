import {
  AcpClient,
  AcpError,
  agentMeta,
  createAcpClient,
  JSON_RPC_ERROR_CODES,
  missionAskFromMeta,
  workspaceConfigOptionsFromInit,
  type PromptCapabilities,
  type SessionConfigOption,
  type SessionConfigOptionValue,
  type SessionEventHandlers,
  type SessionId,
  type SessionInfo,
  type Transport,
} from '../lib/acp';
import { adoptMeta, type AdoptRef } from '../lib/adoptMeta';
import type { PendingImageAttachment } from '../pages/chat/lib/imageAttachments';
import { promptBlocksFromDraft, type WorkspaceFileRef } from '../pages/chat/lib/mentions';
import type { AcpSessionAction } from './acpSessionState';
import {
  EMPTY_SESSION_KEY,
  type AcpSessionsAction,
  type AcpWorkspaceAction,
} from './acpWorkspaceState';


export type WorkspaceDispatch = (action: AcpWorkspaceAction) => void;
export type SessionsDispatch = (action: AcpSessionsAction) => void;

export interface AcpWorkspaceControllerDeps {
  createTransport: () => Transport;
  createClient?: (transport: Transport) => AcpClient;
  cwd?: string;
}

export interface AcpWorkspaceController {
  connect(): Promise<void>;
  refreshSessions(): Promise<void>;
  newSession(cwd?: string, agentName?: string | null): Promise<SessionId>;
  adoptSession(ref: AdoptRef, cwd?: string): Promise<SessionId>;
  openSession(id: SessionId): Promise<void>;
  openSessionTab(id: SessionId): Promise<void>;
  closeSessionTab(id: SessionId): void;
  focusSession(id: SessionId): void;
  focusEmptyTab(): void;
  deleteSession(id: SessionId): Promise<void>;
  clearActiveSession(): void;
  sendPrompt(text: string, mentions?: WorkspaceFileRef[], images?: PendingImageAttachment[]): void;
  runTerminal(command: string): Promise<void>;
  respondPermission(optionId: string): void;
  cancel(): void;
  setConfigOption(configId: string, value: SessionConfigOptionValue): Promise<void>;
  applyConfigOptions(
    options: Array<{ configId: string; value: SessionConfigOptionValue }>,
  ): Promise<void>;
  reconnect(): Promise<void>;
  dispose(): void;
}

const MAX_RECONNECT_ATTEMPTS = 8;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

export const PROMPT_STALL_TIMEOUT_MS = 120_000;
const STALLED_TURN_MESSAGE =
  'The agent stopped responding before the turn completed (no result received).';

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isAuthRequired(err: unknown): boolean {
  return err instanceof AcpError && err.code === JSON_RPC_ERROR_CODES.authRequired;
}

function classifySessionOpenFailure(err: unknown): 'not_found' | 'error' {
  if (
    err instanceof AcpError &&
    (err.code === JSON_RPC_ERROR_CODES.resourceNotFound ||
      err.code === JSON_RPC_ERROR_CODES.invalidParams)
  ) {
    return 'not_found';
  }
  return 'error';
}

interface OpenSessionEntry {
  unsubscribe: () => void;
  currentTurnId: string;
  promptInFlight: boolean;
  permissionResolve: ((optionId: string) => void) | null;
  permissionReject: ((err: Error) => void) | null;
  stallTimer: ReturnType<typeof setTimeout> | null;
  turnSettled: boolean;
}

export function createAcpWorkspaceController(
  deps: AcpWorkspaceControllerDeps,
  workspaceDispatch: WorkspaceDispatch,
  sessionsDispatch: SessionsDispatch,
): AcpWorkspaceController {
  const cwd = deps.cwd ?? '/';
  const buildClient = deps.createClient ?? ((transport: Transport) => createAcpClient(transport));

  let disposed = false;
  let client: AcpClient | null = null;
  let currentTransport: Transport | null = null;
  let connectPromise: Promise<void> | null = null;

  const openSessions = new Map<SessionId, OpenSessionEntry>();
  let focusedSessionId: SessionId | null = null;

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;


  function keyOf(sid: SessionId | null): string {
    return sid ?? EMPTY_SESSION_KEY;
  }

  function sessionDispatch(sid: SessionId | null, action: AcpSessionAction): void {
    sessionsDispatch({ type: 'session_dispatch', key: keyOf(sid), action });
  }

  function removeSlice(sid: SessionId): void {
    sessionsDispatch({ type: 'session_closed', key: keyOf(sid) });
  }

  function setFocus(sid: SessionId | null): void {
    focusedSessionId = sid;
    sessionsDispatch({ type: 'session_focused', key: keyOf(sid) });
    workspaceDispatch({ type: 'active_session_changed', sessionId: sid });
  }

  function trackSubscription(sid: SessionId, c: AcpClient): OpenSessionEntry {
    const entry: OpenSessionEntry = {
      unsubscribe: () => {},
      currentTurnId: '',
      promptInFlight: false,
      permissionResolve: null,
      permissionReject: null,
      stallTimer: null,
      turnSettled: true,
    };
    openSessions.set(sid, entry);
    entry.unsubscribe = c.subscribe(sid, buildSessionHandlers(sid));
    return entry;
  }

  function teardownSession(sid: SessionId, c: AcpClient | null): void {
    rejectPendingPermission(sid);
    const entry = openSessions.get(sid);
    clearStallTimer(entry);
    entry?.unsubscribe();
    openSessions.delete(sid);
    removeSlice(sid);
    if (c) void c.closeSession(sid).catch(() => {});
  }

  function guardAuthRequired(err: unknown): void {
    if (isAuthRequired(err)) {
      workspaceDispatch({ type: 'setup_required', message: errMessage(err) });
    }
  }

  async function runGuarded<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      guardAuthRequired(err);
      throw err;
    }
  }

  function rejectPendingPermission(sid: SessionId): void {
    const entry = openSessions.get(sid);
    if (!entry) return;
    const reject = entry.permissionReject;
    entry.permissionResolve = null;
    entry.permissionReject = null;
    reject?.(new Error('acp: pending permission request was superseded'));
  }

  function rejectAllPendingPermissions(): void {
    for (const sid of openSessions.keys()) rejectPendingPermission(sid);
  }


  function clearStallTimer(entry: OpenSessionEntry | undefined): void {
    if (entry?.stallTimer) {
      clearTimeout(entry.stallTimer);
      entry.stallTimer = null;
    }
  }

  function armStallTimer(sid: SessionId): void {
    const entry = openSessions.get(sid);
    if (!entry || !entry.promptInFlight || entry.turnSettled) return;
    clearStallTimer(entry);
    entry.stallTimer = setTimeout(() => {
      const e = openSessions.get(sid);
      if (!e || e.turnSettled || !e.promptInFlight) return;
      e.stallTimer = null;
      e.turnSettled = true;
      e.promptInFlight = false;
      sessionDispatch(sid, { type: 'prompt_error', message: STALLED_TURN_MESSAGE });
    }, PROMPT_STALL_TIMEOUT_MS);
  }

  function noteActivity(sid: SessionId): void {
    const entry = openSessions.get(sid);
    if (entry?.promptInFlight && !entry.turnSettled && entry.stallTimer) armStallTimer(sid);
  }

  function buildSessionHandlers(sid: SessionId): SessionEventHandlers {
    const turnId = () => openSessions.get(sid)?.currentTurnId ?? '';
    const active = (fn: () => void) => {
      noteActivity(sid);
      fn();
    };
    return {
      onUserMessageChunk: (text, id, image) =>
        active(() =>
          sessionDispatch(sid, {
            type: 'user_message_chunk',
            id: id ?? nextId('user'),
            text,
            image,
          }),
        ),
      onMessageChunk: (text, id, image, meta) =>
        active(() =>
          sessionDispatch(sid, {
            type: 'message_chunk',
            id: id ?? turnId(),
            text,
            image,
            missionAsk: missionAskFromMeta(meta) ?? undefined,
          }),
        ),
      onThoughtChunk: (text, id) =>
        active(() => sessionDispatch(sid, { type: 'thought_chunk', id: id ?? turnId(), text })),
      onToolCall: event => active(() => sessionDispatch(sid, { type: 'tool_call', event })),
      onPlan: entries => active(() => sessionDispatch(sid, { type: 'plan', entries })),
      onUsage: usage => active(() => sessionDispatch(sid, { type: 'usage', usage })),
      onTerminalOutput: payload =>
        active(() => sessionDispatch(sid, { type: 'terminal_output', payload })),
      onAvailableCommands: commands =>
        sessionDispatch(sid, { type: 'available_commands', commands }),
      onConfigOptions: configOptions =>
        sessionDispatch(sid, { type: 'config_options', configOptions }),
      onSessionInfo: info =>
        workspaceDispatch({
          type: 'session_upserted',
          session: { sessionId: sid, title: info.title, updatedAt: info.updatedAt },
        }),
      onPermissionRequest: request =>
        new Promise<string>((resolve, reject) => {
          const entry = openSessions.get(sid);
          if (entry) {
            entry.permissionResolve = resolve;
            entry.permissionReject = reject;
            clearStallTimer(entry);
          }
          sessionDispatch(sid, { type: 'permission_request', request });
        }),
    };
  }


  async function establishConnection(): Promise<{
    client: AcpClient;
    transport: Transport;
    agentName: string | null;
    workspaceConfigOptions: SessionConfigOption[];
    promptCapabilities: PromptCapabilities;
  }> {
    const transport = deps.createTransport();
    const c = buildClient(transport);
    try {
      const init = await c.initialize();
      return {
        client: c,
        transport,
        agentName: init.agentInfo?.name ?? null,
        workspaceConfigOptions: workspaceConfigOptionsFromInit(init),
        promptCapabilities: init.agentCapabilities?.promptCapabilities ?? {},
      };
    } catch (err) {
      transport.close();
      throw err;
    }
  }

  function adoptClient(c: AcpClient, transport: Transport): void {
    client = c;
    currentTransport = transport;
    transport.onClose(() => handleTransportClose(transport));
  }

  async function refreshSessionsInternal(c: AcpClient): Promise<void> {
    const collected: SessionInfo[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await runGuarded(() => c.listSessions(cursor));
      collected.push(...(page.sessions ?? []));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    if (disposed) return;
    workspaceDispatch({ type: 'sessions_replaced', sessions: collected });
  }

  function connect(): Promise<void> {
    if (disposed) return Promise.reject(new Error('acp: workspace controller disposed'));
    if (!connectPromise) {
      connectPromise = doConnect();
    }
    return connectPromise;
  }

  async function doConnect(): Promise<void> {
    workspaceDispatch({ type: 'connecting' });
    try {
      const established = await establishConnection();
      if (disposed) {
        established.transport.close();
        return;
      }
      adoptClient(established.client, established.transport);
      workspaceDispatch({
        type: 'ready',
        agentName: established.agentName,
        workspaceConfigOptions: established.workspaceConfigOptions,
        promptCapabilities: established.promptCapabilities,
      });
      await refreshSessionsInternal(established.client);
    } catch (err) {
      if (disposed) return;
      guardAuthRequired(err);
      if (!isAuthRequired(err)) {
        workspaceDispatch({ type: 'error', message: errMessage(err) });
      }
    }
  }

  async function restoreOneSession(sid: SessionId, c: AcpClient): Promise<void> {
    try {
      const result = await c.resumeSession(sid, cwd);
      trackSubscription(sid, c);
      if (result.configOptions)
        sessionDispatch(sid, { type: 'config_options', configOptions: result.configOptions });
      sessionDispatch(sid, { type: 'connection_resumed' });
      return;
    } catch {
    }
    sessionDispatch(sid, { type: 'session_reset', sessionId: sid });
    trackSubscription(sid, c);
    try {
      const result = await c.loadSession(sid, cwd);
      if (result.configOptions)
        sessionDispatch(sid, { type: 'config_options', configOptions: result.configOptions });
      sessionDispatch(sid, { type: 'connection_resumed' });
    } catch (err) {
      sessionDispatch(sid, {
        type: 'prompt_error',
        message: `failed to restore session after reconnect: ${errMessage(err)}`,
      });
    }
  }

  async function restoreOpenSessions(c: AcpClient): Promise<void> {
    for (const sid of [...openSessions.keys()]) {
      if (disposed) return;
      await restoreOneSession(sid, c);
    }
  }

  function scheduleReconnectAttempt(attemptIndex: number): void {
    if (disposed) return;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attemptIndex, RECONNECT_MAX_DELAY_MS);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void attemptReconnect(attemptIndex);
    }, delay);
  }

  async function attemptReconnect(attemptIndex: number): Promise<void> {
    if (disposed) return;
    try {
      const established = await establishConnection();
      if (disposed) {
        established.transport.close();
        return;
      }
      adoptClient(established.client, established.transport);
      workspaceDispatch({
        type: 'ready',
        agentName: established.agentName,
        workspaceConfigOptions: established.workspaceConfigOptions,
        promptCapabilities: established.promptCapabilities,
      });
      await restoreOpenSessions(established.client);
      if (disposed) return;
      await refreshSessionsInternal(established.client);
    } catch (err) {
      if (disposed) return;
      if (isAuthRequired(err)) {
        workspaceDispatch({ type: 'setup_required', message: errMessage(err) });
        return;
      }
      const next = attemptIndex + 1;
      if (next >= MAX_RECONNECT_ATTEMPTS) {
        workspaceDispatch({ type: 'disconnected' });
        return;
      }
      scheduleReconnectAttempt(next);
    }
  }

  function reconnect(): Promise<void> {
    if (disposed) return Promise.reject(new Error('acp: workspace controller disposed'));
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    workspaceDispatch({ type: 'reconnecting' });
    return attemptReconnect(0);
  }

  function handleTransportClose(transport: Transport): void {
    if (disposed) return;
    if (transport !== currentTransport) return;
    workspaceDispatch({ type: 'reconnecting' });
    for (const sid of openSessions.keys()) {
      const entry = openSessions.get(sid);
      if (entry) {
        clearStallTimer(entry);
        entry.turnSettled = true;
        entry.promptInFlight = false;
      }
      sessionDispatch(sid, { type: 'connection_lost' });
    }
    scheduleReconnectAttempt(0);
  }


  async function refreshSessions(): Promise<void> {
    if (disposed || !client) return;
    await refreshSessionsInternal(client);
  }

  function focusEmpty(): void {
    sessionDispatch(null, { type: 'session_reset', sessionId: null });
    setFocus(null);
  }

  async function newSession(overrideCwd?: string, agentName?: string | null): Promise<SessionId> {
    if (disposed || !client) throw new Error('acp: workspace controller is not connected');
    const c = client;
    const sessionCwd = overrideCwd && overrideCwd.trim() !== '' ? overrideCwd : cwd;

    const meta = agentName && agentName.trim() !== '' ? agentMeta(agentName.trim()) : undefined;

    const previousId = focusedSessionId;
    if (previousId) rejectPendingPermission(previousId);

    const result = await runGuarded(() => c.newSession(sessionCwd, [], meta)).catch(err => {
      if (!isAuthRequired(err)) {
        sessionDispatch(focusedSessionId, { type: 'prompt_error', message: errMessage(err) });
      }
      throw err;
    });
    const sid = result.sessionId;

    sessionDispatch(sid, { type: 'session_reset', sessionId: sid });
    trackSubscription(sid, c);
    if (result.configOptions)
      sessionDispatch(sid, { type: 'config_options', configOptions: result.configOptions });

    workspaceDispatch({
      type: 'session_upserted',
      session: { sessionId: sid, cwd: sessionCwd, _meta: result._meta },
    });
    setFocus(sid);
    workspaceDispatch({ type: 'session_load_succeeded' });

    if (previousId && previousId !== sid) teardownSession(previousId, c);

    return sid;
  }

  async function adoptSession(ref: AdoptRef, overrideCwd?: string): Promise<SessionId> {
    if (disposed || !client) throw new Error('acp: workspace controller is not connected');
    const c = client;
    const sessionCwd = overrideCwd && overrideCwd.trim() !== '' ? overrideCwd : cwd;
    const meta = adoptMeta(ref.instanceId, ref.sessionId);

    const result = await runGuarded(() => c.newSession(sessionCwd, [], meta)).catch(err => {
      if (!isAuthRequired(err)) {
        sessionDispatch(focusedSessionId, { type: 'prompt_error', message: errMessage(err) });
      }
      throw err;
    });
    const sid = result.sessionId;

    sessionDispatch(sid, { type: 'session_reset', sessionId: sid });
    trackSubscription(sid, c);
    if (result.configOptions)
      sessionDispatch(sid, { type: 'config_options', configOptions: result.configOptions });
    workspaceDispatch({
      type: 'session_upserted',
      session: { sessionId: sid, cwd: sessionCwd, _meta: result._meta },
    });
    setFocus(sid);
    workspaceDispatch({ type: 'session_load_succeeded' });
    return sid;
  }

  async function openSessionTab(id: SessionId): Promise<void> {
    if (disposed || !client) return;
    const c = client;

    if (openSessions.has(id)) {
      setFocus(id);
      workspaceDispatch({ type: 'session_load_succeeded' });
      return;
    }

    workspaceDispatch({ type: 'session_load_start' });
    setFocus(id);
    sessionDispatch(id, { type: 'session_reset', sessionId: id });
    trackSubscription(id, c);

    try {
      const result = await runGuarded(() => c.loadSession(id, cwd));
      if (result.configOptions)
        sessionDispatch(id, { type: 'config_options', configOptions: result.configOptions });
    } catch (err) {
      teardownSession(id, c);
      if (focusedSessionId === id) focusEmpty();
      if (classifySessionOpenFailure(err) === 'not_found') {
        workspaceDispatch({ type: 'session_load_not_found' });
      } else {
        workspaceDispatch({ type: 'session_load_failed', message: errMessage(err) });
      }
      return;
    }

    workspaceDispatch({ type: 'session_load_succeeded' });
  }

  async function openSession(id: SessionId): Promise<void> {
    if (disposed || !client) return;
    if (focusedSessionId === id) return;
    const c = client;
    const previousId = focusedSessionId;
    await openSessionTab(id);
    if (previousId && previousId !== id) teardownSession(previousId, c);
  }

  function closeSessionTab(id: SessionId): void {
    if (disposed || !openSessions.has(id)) return;
    const wasFocused = focusedSessionId === id;
    teardownSession(id, client);
    if (wasFocused) {
      const next = openSessions.keys().next();
      if (next.done) focusEmpty();
      else setFocus(next.value);
    }
  }

  function focusSession(id: SessionId): void {
    if (disposed || !openSessions.has(id)) return;
    setFocus(id);
  }

  function focusEmptyTab(): void {
    if (disposed) return;
    focusEmpty();
  }

  async function deleteSession(id: SessionId): Promise<void> {
    if (disposed || !client) return;
    const c = client;

    if (openSessions.has(id)) {
      const wasFocused = focusedSessionId === id;
      teardownSession(id, c);
      if (wasFocused) focusEmpty();
    }

    await runGuarded(() => c.deleteSession(id));
    workspaceDispatch({ type: 'session_removed', sessionId: id });
  }

  function clearActiveSession(): void {
    if (disposed) return;
    const previousId = focusedSessionId;
    if (!previousId) return;
    teardownSession(previousId, client);
    focusEmpty();
  }


  function sendPrompt(
    text: string,
    mentions: WorkspaceFileRef[] = [],
    images: PendingImageAttachment[] = [],
  ): void {
    if (disposed || !client || !focusedSessionId || !text.trim()) return;
    const sid = focusedSessionId;
    const entry = openSessions.get(sid);
    if (!entry || entry.promptInFlight) return;
    const c = client;
    entry.currentTurnId = nextId('assistant');

    const blocks = promptBlocksFromDraft(text, mentions, images);

    const echoId = nextId('user');
    sessionDispatch(sid, { type: 'user_message_chunk', id: echoId, text });
    for (const image of images) {
      sessionDispatch(sid, {
        type: 'user_message_chunk',
        id: echoId,
        text: '',
        image: { data: image.data, mimeType: image.mimeType },
      });
    }
    sessionDispatch(sid, { type: 'prompt_start' });
    entry.promptInFlight = true;
    entry.turnSettled = false;
    armStallTimer(sid);

    c.prompt(sid, blocks)
      .then(({ stopReason }) => {
        const e = openSessions.get(sid);
        if (!e) return;
        clearStallTimer(e);
        if (e.turnSettled) return;
        e.turnSettled = true;
        e.promptInFlight = false;
        sessionDispatch(sid, { type: 'prompt_end', stopReason });
      })
      .catch((err: unknown) => {
        const e = openSessions.get(sid);
        clearStallTimer(e);
        if (e) e.promptInFlight = false;
        if (!disposed) guardAuthRequired(err);
        if (!e || e.turnSettled) return;
        e.turnSettled = true;
        sessionDispatch(sid, { type: 'prompt_error', message: errMessage(err) });
      });
  }

  async function runTerminal(command: string): Promise<void> {
    if (disposed || !client || !focusedSessionId) return;
    const sid = focusedSessionId;
    const res = await runGuarded(() => client!.runTerminal(sid, command));
    if (openSessions.has(sid)) {
      sessionDispatch(sid, {
        type: 'terminal_card',
        id: nextId('term'),
        command,
        output: res.output ?? '',
      });
    }
  }

  function respondPermission(optionId: string): void {
    if (!focusedSessionId) return;
    const entry = openSessions.get(focusedSessionId);
    const resolve = entry?.permissionResolve;
    if (entry) {
      entry.permissionResolve = null;
      entry.permissionReject = null;
    }
    if (!resolve) return;
    sessionDispatch(focusedSessionId, { type: 'permission_resolved' });
    resolve(optionId);
    armStallTimer(focusedSessionId);
  }

  function cancel(): void {
    if (!client || !focusedSessionId) return;
    client.cancel(focusedSessionId);
  }

  async function setConfigOption(configId: string, value: SessionConfigOptionValue): Promise<void> {
    if (disposed || !client || !focusedSessionId) return;
    const sid = focusedSessionId;
    const result = await runGuarded(() => client!.setConfigOption(sid, configId, value));
    sessionDispatch(sid, { type: 'config_options', configOptions: result.configOptions });
  }

  async function applyConfigOptions(
    options: Array<{ configId: string; value: SessionConfigOptionValue }>,
  ): Promise<void> {
    if (disposed || !client || !focusedSessionId || options.length === 0) return;
    const sid = focusedSessionId;
    try {
      for (const { configId, value } of options) {
        await setConfigOption(configId, value);
      }
    } catch (err) {
      if (openSessions.has(sid))
        sessionDispatch(sid, { type: 'prompt_error', message: errMessage(err) });
      throw err;
    }
  }


  function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    rejectAllPendingPermissions();
    for (const entry of openSessions.values()) clearStallTimer(entry);
    client?.close();
    client = null;
    currentTransport = null;
  }

  return {
    connect,
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
    dispose,
  };
}
