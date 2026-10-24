import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Transport } from '../lib/acp';
import type { AcpSessionAction, AcpSessionState } from './acpSessionState';
import {
  createAcpWorkspaceController,
  PROMPT_STALL_TIMEOUT_MS,
  type AcpWorkspaceController,
} from './acpWorkspaceController';
import {
  acpSessionsReducer,
  acpWorkspaceReducer,
  initialAcpSessionsState,
  initialAcpWorkspaceState,
  selectFocusedSession,
  type AcpSessionsState,
  type AcpWorkspaceState,
} from './acpWorkspaceState';


class MockTransport implements Transport {
  readonly sentRaw: string[] = [];
  private readonly messageCbs: Array<(text: string) => void> = [];
  private readonly closeCbs: Array<(err?: Error) => void> = [];
  closeCalls = 0;
  private closedFired = false;

  send(text: string): void {
    this.sentRaw.push(text);
  }
  onMessage(cb: (text: string) => void): void {
    this.messageCbs.push(cb);
  }
  onClose(cb: (err?: Error) => void): void {
    this.closeCbs.push(cb);
  }
  close(): void {
    this.closeCalls++;
  }
  feed(msg: unknown): void {
    const text = JSON.stringify(msg);
    for (const cb of this.messageCbs) cb(text);
  }
  fireClose(err?: Error): void {
    if (this.closedFired) return;
    this.closedFired = true;
    for (const cb of this.closeCbs) cb(err);
  }
  get sent(): Array<Record<string, unknown>> {
    return this.sentRaw.map(t => JSON.parse(t) as Record<string, unknown>);
  }
  lastSent(): Record<string, unknown> {
    const raw = this.sentRaw.at(-1);
    if (!raw) throw new Error('MockTransport: nothing sent yet');
    return JSON.parse(raw) as Record<string, unknown>;
  }
}

async function flushMicrotasks(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function makeStore<S, A>(reducer: (s: S, a: A) => S, initial: S) {
  let state = initial;
  return {
    dispatch: (action: A) => {
      state = reducer(state, action);
    },
    get state() {
      return state;
    },
  };
}

interface FocusedSessionStore {
  readonly state: AcpSessionState;
  dispatch: (action: AcpSessionAction) => void;
}

interface Harness {
  controller: AcpWorkspaceController;
  wsStore: ReturnType<typeof makeStore<AcpWorkspaceState, Parameters<typeof acpWorkspaceReducer>[1]>>;
  sessionsStore: ReturnType<typeof makeStore<AcpSessionsState, Parameters<typeof acpSessionsReducer>[1]>>;
  sessStore: FocusedSessionStore;
  sliceOf: (sessionId: string) => AcpSessionState | undefined;
  transports: MockTransport[];
}

function setup(): Harness {
  const transports: MockTransport[] = [];
  const wsStore = makeStore(acpWorkspaceReducer, initialAcpWorkspaceState);
  const sessionsStore = makeStore(acpSessionsReducer, initialAcpSessionsState);
  const controller = createAcpWorkspaceController(
    {
      createTransport: () => {
        const t = new MockTransport();
        transports.push(t);
        return t;
      },
      cwd: '/work',
    },
    wsStore.dispatch,
    sessionsStore.dispatch,
  );
  const sessStore: FocusedSessionStore = {
    get state() {
      return selectFocusedSession(sessionsStore.state);
    },
    dispatch: (action: AcpSessionAction) =>
      sessionsStore.dispatch({ type: 'session_dispatch', key: sessionsStore.state.focusedKey, action }),
  };
  const sliceOf = (sessionId: string) => sessionsStore.state.slices[sessionId];
  return { controller, wsStore, sessionsStore, sessStore, sliceOf, transports };
}

async function connectReady(h: Harness): Promise<void> {
  const p = h.controller.connect();
  await flushMicrotasks();
  const initReq = h.transports[0].lastSent();
  h.transports[0].feed({ jsonrpc: '2.0', id: initReq.id, result: { protocolVersion: 1, agentInfo: { name: 'contenox' } } });
  await flushMicrotasks();
  const listReq = h.transports[0].lastSent();
  h.transports[0].feed({ jsonrpc: '2.0', id: listReq.id, result: { sessions: [] } });
  await p;
}

async function createSession(h: Harness, sessionId: string): Promise<string> {
  const p = h.controller.newSession();
  await flushMicrotasks();
  const req = h.transports[0].lastSent();
  expect(req.method).toBe('session/new');
  h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { sessionId } });
  await p;
  return sessionId;
}

async function openTab(h: Harness, sessionId: string): Promise<void> {
  const p = h.controller.openSessionTab(sessionId);
  await flushMicrotasks();
  const loadReq = h.transports[0].sent.filter(f => f.method === 'session/load').at(-1)!;
  expect((loadReq.params as Record<string, unknown>).sessionId).toBe(sessionId);
  h.transports[0].feed({ jsonrpc: '2.0', id: loadReq.id, result: {} });
  await p;
}

function feedAgentChunk(t: MockTransport, sessionId: string, messageId: string, text: string): void {
  t.feed({
    jsonrpc: '2.0',
    method: 'session/update',
    params: { sessionId, update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text }, messageId } },
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('acpWorkspaceController: connect()', () => {
  it('initializes then lists sessions, transitioning connecting -> ready', async () => {
    const h = setup();
    expect(h.wsStore.state.status).toBe('connecting');
    await connectReady(h);
    expect(h.wsStore.state.status).toBe('ready');
    expect(h.wsStore.state.agentName).toBe('contenox');
    expect(h.wsStore.state.sessions).toEqual([]);
  });

  it('extracts workspace-level config options from the initialize _meta extension and exposes them on ready', async () => {
    const h = setup();
    const workspaceConfigOptions = [
      { id: 'model', name: 'Model', type: 'select', currentValue: 'openai/gpt-5-mini', options: [] },
      { id: 'think', name: 'Think', type: 'select', currentValue: 'high', options: [] },
    ];
    const p = h.controller.connect();
    await flushMicrotasks();
    const initReq = h.transports[0].lastSent();
    h.transports[0].feed({
      jsonrpc: '2.0',
      id: initReq.id,
      result: {
        protocolVersion: 1,
        agentInfo: { name: 'contenox' },
        _meta: { 'contenox.workspaceConfigOptions': workspaceConfigOptions },
      },
    });
    await flushMicrotasks();
    const listReq = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: listReq.id, result: { sessions: [] } });
    await p;

    expect(h.wsStore.state.workspaceConfigOptions).toEqual(workspaceConfigOptions);
  });

  it('leaves workspace config options empty for an agent that advertises no extension (graceful degrade)', async () => {
    const h = setup();
    await connectReady(h);
    expect(h.wsStore.state.workspaceConfigOptions).toEqual([]);
  });

  it('is idempotent: concurrent callers share one initialize call', async () => {
    const h = setup();
    const p1 = h.controller.connect();
    const p2 = h.controller.connect();
    await flushMicrotasks();
    expect(h.transports).toHaveLength(1);
    expect(h.transports[0].sent.filter(f => f.method === 'initialize')).toHaveLength(1);

    const initReq = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: initReq.id, result: { protocolVersion: 1 } });
    await flushMicrotasks();
    const listReq = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: listReq.id, result: { sessions: [] } });
    await Promise.all([p1, p2]);
    expect(h.wsStore.state.status).toBe('ready');
  });

  it('maps a -32000 auth_required error to setup_required (terminal — never mapped to the generic error status)', async () => {
    const h = setup();
    const p = h.controller.connect();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: 'contenox is not configured yet' } });
    await p;
    expect(h.wsStore.state.status).toBe('setup_required');
    expect(h.wsStore.state.error).toContain('not configured');
  });

  it('maps any other error to the generic error status', async () => {
    const h = setup();
    const p = h.controller.connect();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: 'boom' } });
    await p;
    expect(h.wsStore.state.status).toBe('error');
    expect(h.wsStore.state.error).toBe('boom');
  });

  it('paginates session/list to completion', async () => {
    const h = setup();
    const p = h.controller.connect();
    await flushMicrotasks();
    h.transports[0].feed({ jsonrpc: '2.0', id: h.transports[0].lastSent().id, result: { protocolVersion: 1 } });
    await flushMicrotasks();

    const page1 = h.transports[0].lastSent();
    expect(page1.params).toEqual({});
    h.transports[0].feed({ jsonrpc: '2.0', id: page1.id, result: { sessions: [{ sessionId: 'a' }], nextCursor: 'cursor-1' } });
    await flushMicrotasks();

    const page2 = h.transports[0].lastSent();
    expect(page2.params).toEqual({ cursor: 'cursor-1' });
    h.transports[0].feed({ jsonrpc: '2.0', id: page2.id, result: { sessions: [{ sessionId: 'b' }] } });
    await p;

    expect(h.wsStore.state.sessions.map(s => s.sessionId).sort()).toEqual(['a', 'b']);
  });
});

describe('acpWorkspaceController: newSession() is lazy (D5)', () => {
  it('connect() never creates a session automatically', async () => {
    const h = setup();
    await connectReady(h);
    expect(h.wsStore.state.activeSessionId).toBeNull();
    expect(h.transports[0].sent.some(f => f.method === 'session/new')).toBe(false);
  });

  it('newSession() creates, subscribes, and activates the new session', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    expect(h.wsStore.state.activeSessionId).toBe('sess-a');
    expect(h.wsStore.state.sessions.map(s => s.sessionId)).toContain('sess-a');
    expect(h.sessStore.state.sessionId).toBe('sess-a');

    h.transports[0].feed({
      jsonrpc: '2.0',
      method: 'session/update',
      params: { sessionId: 'sess-a', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' }, messageId: 'm1' } },
    });
    await flushMicrotasks();
    expect(h.sessStore.state.messages['m1']).toMatchObject({ text: 'hi' });
  });

  it('applies configOptions carried inline on the session/new response (no separate notification arrives for a fresh session)', async () => {
    const h = setup();
    await connectReady(h);

    const p = h.controller.newSession();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    const configOptions = [{ id: 'think', name: 'Think', type: 'boolean', currentValue: 'false', options: [] }];
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { sessionId: 'sess-a', configOptions } });
    await p;

    expect(h.sessStore.state.configOptions).toEqual(configOptions);
  });

  it('newSession(cwd, agentName) binds the session to an external agent via _meta and threads the response echo into the roster', async () => {
    const h = setup();
    await connectReady(h);

    const p = h.controller.newSession(undefined, 'stub-bot');
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    expect(req.method).toBe('session/new');
    expect((req.params as Record<string, unknown>)._meta).toEqual({ 'contenox.agent': 'stub-bot' });

    h.transports[0].feed({
      jsonrpc: '2.0',
      id: req.id,
      result: { sessionId: 'ext-a', _meta: { 'contenox.agent': 'stub-bot' } },
    });
    await p;

    const info = h.wsStore.state.sessions.find(s => s.sessionId === 'ext-a');
    expect(info?._meta).toEqual({ 'contenox.agent': 'stub-bot' });
  });

  it('newSession() with no agent sends no _meta and leaves the roster entry native', async () => {
    const h = setup();
    await connectReady(h);

    const p = h.controller.newSession();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    expect((req.params as Record<string, unknown>)._meta).toBeUndefined();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { sessionId: 'native-a' } });
    await p;

    const info = h.wsStore.state.sessions.find(s => s.sessionId === 'native-a');
    expect(info?._meta).toBeUndefined();
  });

  it('BUG 5: a non-auth failure surfaces via session.error (prompt_error) and still rejects for the caller to handle', async () => {
    const h = setup();
    await connectReady(h);

    const p = h.controller.newSession();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: 'boom' } });

    await expect(p).rejects.toThrow();
    expect(h.sessStore.state.error).toContain('boom');
    expect(h.wsStore.state.status).not.toBe('error');
    expect(h.wsStore.state.status).not.toBe('setup_required');
  });

  it('an auth-required failure surfaces via workspace setup_required instead (no session.error)', async () => {
    const h = setup();
    await connectReady(h);

    const p = h.controller.newSession();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: 'auth required' } });

    await expect(p).rejects.toThrow();
    expect(h.wsStore.state.status).toBe('setup_required');
    expect(h.sessStore.state.error).toBeNull();
  });
});

describe('acpWorkspaceController: openSession() switching', () => {
  it('subscribes BEFORE session/load resolves, so replay notifications land in the reducer before the response settles', async () => {
    const h = setup();
    await connectReady(h);

    const openPromise = h.controller.openSession('sess-b');
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    expect(req.method).toBe('session/load');
    expect((req.params as Record<string, unknown>).sessionId).toBe('sess-b');
    expect((req.params as Record<string, unknown>).cwd).toBe('/work');

    h.transports[0].feed({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'sess-b',
        update: { sessionUpdate: 'user_message_chunk', content: { type: 'text', text: 'hi' }, messageId: 'replay-0' },
      },
    });
    await flushMicrotasks();
    expect(h.sessStore.state.messages['replay-0']).toMatchObject({ role: 'user', text: 'hi' });

    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: {} });
    await openPromise;
    expect(h.sessStore.state.sessionId).toBe('sess-b');
    expect(h.wsStore.state.activeSessionId).toBe('sess-b');
  });

  it('closes the previously open session and rejects its pending permission with outcome cancelled', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.transports[0].feed({
      jsonrpc: '2.0',
      id: 'perm-1',
      method: 'session/request_permission',
      params: { sessionId: 'sess-a', toolCall: { toolCallId: 'tc-1' }, options: [{ optionId: 'x', name: 'X', kind: 'allow_once' }] },
    });
    await flushMicrotasks();
    expect(h.sessStore.state.pendingPermission).not.toBeNull();

    const openPromise = h.controller.openSession('sess-b');
    await flushMicrotasks();
    const loadReq = h.transports[0].sent.find(f => f.method === 'session/load')!;
    expect(loadReq).toBeDefined();
    h.transports[0].feed({ jsonrpc: '2.0', id: loadReq.id, result: {} });
    await openPromise;

    const permResponse = h.transports[0].sent.find(f => f.id === 'perm-1');
    expect(permResponse).toMatchObject({ result: { outcome: { outcome: 'cancelled' } } });

    const closeReq = h.transports[0].sent.find(f => f.method === 'session/close');
    expect(closeReq).toBeDefined();
    expect((closeReq!.params as Record<string, unknown>).sessionId).toBe('sess-a');
  });

  it('is a no-op when opening the session that is already active', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    const sentBefore = h.transports[0].sentRaw.length;

    await h.controller.openSession('sess-a');
    expect(h.transports[0].sentRaw.length).toBe(sentBefore);
  });

  it('applies configOptions carried inline on the session/load response', async () => {
    const h = setup();
    await connectReady(h);

    const openPromise = h.controller.openSession('sess-b');
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    const configOptions = [{ id: 'model', name: 'Model', type: 'string', currentValue: 'openvino/qwen2.5-coder-0.5b-ov', options: [] }];
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { configOptions } });
    await openPromise;

    expect(h.sessStore.state.configOptions).toEqual(configOptions);
  });
});

describe('acpWorkspaceController: openSession() explicit outcome signal (replaces the deleted notFound heuristic)', () => {
  it('sets sessionLoadState to not_found on an invalidParams failure (acpsvc/session.go maps unknown session to -32602)', async () => {
    const h = setup();
    await connectReady(h);

    expect(h.wsStore.state.sessionLoadState).toBe('ready');
    const openPromise = h.controller.openSession('missing');
    await flushMicrotasks();
    expect(h.wsStore.state.sessionLoadState).toBe('loading');

    const req = h.transports[0].lastSent();
    expect(req.method).toBe('session/load');
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, error: { code: -32602, message: 'load session "missing": not found' } });
    await openPromise;

    expect(h.wsStore.state.sessionLoadState).toBe('not_found');
    expect(h.wsStore.state.sessionLoadError).toBeNull();
    expect(h.wsStore.state.activeSessionId).toBeNull();
    expect(h.sessStore.state.sessionId).toBeNull();
    expect(h.wsStore.state.status).toBe('ready');
  });

  it('sets sessionLoadState to error (with message) on a non-not-found failure', async () => {
    const h = setup();
    await connectReady(h);

    const openPromise = h.controller.openSession('sess-x');
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: 'internal boom' } });
    await openPromise;

    expect(h.wsStore.state.sessionLoadState).toBe('error');
    expect(h.wsStore.state.sessionLoadError).toBe('internal boom');
    expect(h.wsStore.state.status).toBe('ready');
  });

  it('a subsequent successful openSession() resets a stale not_found/error back to ready', async () => {
    const h = setup();
    await connectReady(h);

    const failedOpen = h.controller.openSession('missing');
    await flushMicrotasks();
    h.transports[0].feed({ jsonrpc: '2.0', id: h.transports[0].lastSent().id, error: { code: -32602, message: 'nope' } });
    await failedOpen;
    expect(h.wsStore.state.sessionLoadState).toBe('not_found');

    const openPromise = h.controller.openSession('sess-real');
    await flushMicrotasks();
    h.transports[0].feed({ jsonrpc: '2.0', id: h.transports[0].lastSent().id, result: {} });
    await openPromise;

    expect(h.wsStore.state.sessionLoadState).toBe('ready');
    expect(h.wsStore.state.sessionLoadError).toBeNull();
    expect(h.wsStore.state.activeSessionId).toBe('sess-real');
  });

  it('newSession() also resets a stale not_found/error back to ready', async () => {
    const h = setup();
    await connectReady(h);

    const failedOpen = h.controller.openSession('missing');
    await flushMicrotasks();
    h.transports[0].feed({ jsonrpc: '2.0', id: h.transports[0].lastSent().id, error: { code: -32602, message: 'nope' } });
    await failedOpen;
    expect(h.wsStore.state.sessionLoadState).toBe('not_found');

    await createSession(h, 'sess-fresh');
    expect(h.wsStore.state.sessionLoadState).toBe('ready');
  });
});

describe('acpWorkspaceController: deleteSession()', () => {
  it('removes the session from the roster and, if it was active, clears the active session first', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    expect(h.wsStore.state.activeSessionId).toBe('sess-a');

    const deletePromise = h.controller.deleteSession('sess-a');
    await flushMicrotasks();

    const closeReq = h.transports[0].sent.find(f => f.method === 'session/close');
    expect(closeReq).toBeDefined();

    const delReq = h.transports[0].sent.filter(f => f.method === 'session/delete').at(-1)!;
    h.transports[0].feed({ jsonrpc: '2.0', id: delReq.id, result: {} });
    await deletePromise;

    expect(h.wsStore.state.sessions.find(s => s.sessionId === 'sess-a')).toBeUndefined();
    expect(h.wsStore.state.activeSessionId).toBeNull();
    expect(h.sessStore.state.sessionId).toBeNull();
  });
});

describe('acpWorkspaceController: clearActiveSession() (BUG 1 — "new session" affordances)', () => {
  it('resets activeSessionId and the session reducer client-side, without deleting the session', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    expect(h.wsStore.state.activeSessionId).toBe('sess-a');
    expect(h.sessStore.state.sessionId).toBe('sess-a');

    h.controller.clearActiveSession();

    expect(h.wsStore.state.activeSessionId).toBeNull();
    expect(h.sessStore.state.sessionId).toBeNull();
    await flushMicrotasks();
    expect(h.transports[0].sent.some(f => f.method === 'session/close')).toBe(true);
    expect(h.transports[0].sent.some(f => f.method === 'session/delete')).toBe(false);
    expect(h.wsStore.state.sessions.some(s => s.sessionId === 'sess-a')).toBe(true);
  });

  it('rejects any pending permission for the cleared session with outcome cancelled', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.transports[0].feed({
      jsonrpc: '2.0',
      id: 'perm-1',
      method: 'session/request_permission',
      params: { sessionId: 'sess-a', toolCall: { toolCallId: 'tc-1' }, options: [{ optionId: 'x', name: 'X', kind: 'allow_once' }] },
    });
    await flushMicrotasks();
    expect(h.sessStore.state.pendingPermission).not.toBeNull();

    h.controller.clearActiveSession();
    await flushMicrotasks();

    const permResponse = h.transports[0].sent.find(f => f.id === 'perm-1');
    expect(permResponse).toMatchObject({ result: { outcome: { outcome: 'cancelled' } } });
  });

  it('is a no-op when no session is open', async () => {
    const h = setup();
    await connectReady(h);
    const sentBefore = h.transports[0].sentRaw.length;

    h.controller.clearActiveSession();

    expect(h.wsStore.state.activeSessionId).toBeNull();
    expect(h.transports[0].sentRaw.length).toBe(sentBefore);
  });

  it('the next lazy newSession() call after clearActiveSession() creates a genuinely new session', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    h.controller.clearActiveSession();

    const p = h.controller.newSession();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    expect(req.method).toBe('session/new');
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { sessionId: 'sess-b' } });
    const sid = await p;

    expect(sid).toBe('sess-b');
    expect(h.wsStore.state.activeSessionId).toBe('sess-b');
    expect(h.sessStore.state.sessionId).toBe('sess-b');
  });

  it('a cleared session\'s still-in-flight turn cannot bleed its failure into the next session, nor block its first prompt', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.controller.sendPrompt('slow first prompt');
    const promptReqA = h.transports[0].sent.filter(f => f.method === 'session/prompt').at(-1)!;
    expect(h.sessStore.state.isPrompting).toBe(true);

    h.controller.clearActiveSession();
    expect(h.sessStore.state.isPrompting).toBe(false);

    const p = h.controller.newSession();
    await flushMicrotasks();
    const newReq = h.transports[0].sent.filter(f => f.method === 'session/new').at(-1)!;
    h.transports[0].feed({ jsonrpc: '2.0', id: newReq.id, result: { sessionId: 'sess-b' } });
    await p;

    h.controller.sendPrompt('first prompt in new session');
    const promptReqB = h.transports[0].sent.filter(f => f.method === 'session/prompt').at(-1)!;
    expect(promptReqB.id).not.toBe(promptReqA.id);
    expect((promptReqB.params as Record<string, unknown>).sessionId).toBe('sess-b');
    expect(Object.values(h.sessStore.state.messages).some(m => m.role === 'user' && m.text === 'first prompt in new session')).toBe(true);
    expect(h.sessStore.state.isPrompting).toBe(true);
    expect(h.wsStore.state.activeSessionId).toBe('sess-b');

    h.transports[0].feed({ jsonrpc: '2.0', id: promptReqA.id, error: { code: -32603, message: 'chain execution failed: old turn' } });
    await flushMicrotasks();
    expect(h.sessStore.state.error).toBeNull();
    expect(h.sessStore.state.isPrompting).toBe(true);

    h.transports[0].feed({ jsonrpc: '2.0', id: promptReqB.id, result: { stopReason: 'end_turn' } });
    await flushMicrotasks();
    expect(h.sessStore.state.isPrompting).toBe(false);
    expect(h.sessStore.state.stopReason).toBe('end_turn');
    expect(h.sessStore.state.error).toBeNull();
  });

  it('a cleared session\'s late prompt_end does not bleed a stopReason into the cleared state', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.controller.sendPrompt('slow prompt');
    const promptReq = h.transports[0].sent.filter(f => f.method === 'session/prompt').at(-1)!;

    h.controller.clearActiveSession();
    h.transports[0].feed({ jsonrpc: '2.0', id: promptReq.id, result: { stopReason: 'end_turn' } });
    await flushMicrotasks();

    expect(h.sessStore.state.stopReason).toBeNull();
    expect(h.sessStore.state.error).toBeNull();
    expect(h.sessStore.state.isPrompting).toBe(false);
  });
});

describe('acpWorkspaceController: focusEmptyTab() (additive empty surface — the sidebar "New session" contract)', () => {
  it('re-points focus to the empty surface WITHOUT tearing down the focused session', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    expect(h.wsStore.state.activeSessionId).toBe('sess-a');
    const sentBefore = h.transports[0].sentRaw.length;

    h.controller.focusEmptyTab();

    expect(h.wsStore.state.activeSessionId).toBeNull();
    expect(h.sessionsStore.state.focusedKey).toBe('');
    expect(h.sliceOf('sess-a')).toBeDefined();
    await flushMicrotasks();
    expect(h.transports[0].sentRaw.length).toBe(sentBefore);
    expect(h.transports[0].sent.some(f => f.method === 'session/close')).toBe(false);
    expect(h.wsStore.state.sessions.some(s => s.sessionId === 'sess-a')).toBe(true);
  });

  it('leaves every already-open tab live when moving to the empty surface', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    await openTab(h, 'sess-b');

    h.controller.focusEmptyTab();

    expect(h.wsStore.state.activeSessionId).toBeNull();
    expect(h.sliceOf('sess-a')).toBeDefined();
    expect(h.sliceOf('sess-b')).toBeDefined();
  });
});

describe('acpWorkspaceController: sendPrompt()', () => {
  it('no-ops with no active session', async () => {
    const h = setup();
    await connectReady(h);
    const sentBefore = h.transports[0].sentRaw.length;
    h.controller.sendPrompt('hello');
    expect(h.transports[0].sentRaw.length).toBe(sentBefore);
  });

  it('no-ops while the SAME session already has a prompt in flight', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.controller.sendPrompt('first');
    const sentAfterFirst = h.transports[0].sentRaw.length;
    h.controller.sendPrompt('second while first is in flight');
    expect(h.transports[0].sentRaw.length).toBe(sentAfterFirst);
  });

  it('sends session/prompt with no per-turn handlers — the standing subscription routes all streamed content', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.controller.sendPrompt('hello there');
    expect(h.sessStore.state.isPrompting).toBe(true);
    expect(Object.values(h.sessStore.state.messages).some(m => m.role === 'user' && m.text === 'hello there')).toBe(true);

    const req = h.transports[0].lastSent();
    expect(req.method).toBe('session/prompt');
    expect(req.params).toMatchObject({ sessionId: 'sess-a' });

    h.transports[0].feed({
      jsonrpc: '2.0',
      method: 'session/update',
      params: { sessionId: 'sess-a', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi!' }, messageId: 'm1' } },
    });
    await flushMicrotasks();
    expect(h.sessStore.state.messages['m1']).toMatchObject({ text: 'hi!' });

    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { stopReason: 'end_turn' } });
    await flushMicrotasks();
    expect(h.sessStore.state.isPrompting).toBe(false);
    expect(h.sessStore.state.stopReason).toBe('end_turn');
  });

  it('BUG 4a: still dispatches prompt_end once the in-flight call settles even after dispose(), so the typing indicator cannot get stuck', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.controller.sendPrompt('hello there');
    const req = h.transports[0].lastSent();
    expect(h.sessStore.state.isPrompting).toBe(true);

    h.controller.dispose();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { stopReason: 'end_turn' } });
    await flushMicrotasks();

    expect(h.sessStore.state.isPrompting).toBe(false);
    expect(h.sessStore.state.stopReason).toBe('end_turn');
  });
});

describe('acpWorkspaceController: dead-turn watchdog (never end silently-dead)', () => {
  it('surfaces a turn that dies with NO terminal event (no stopReason, no error, no close) as a failed turn', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    vi.useFakeTimers();

    h.controller.sendPrompt('go');
    expect(h.sessStore.state.isPrompting).toBe(true);

    await vi.advanceTimersByTimeAsync(PROMPT_STALL_TIMEOUT_MS);

    expect(h.sessStore.state.isPrompting).toBe(false);
    expect(h.sessStore.state.error).toContain('stopped responding');
    expect(h.sessStore.state.items.some(it => it.kind === 'error')).toBe(true);
  });

  it('a slow-but-alive turn keeps resetting the watchdog — streamed activity prevents a false stall', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    vi.useFakeTimers();

    h.controller.sendPrompt('go');
    const req = h.transports[0].sent.filter(f => f.method === 'session/prompt').at(-1)!;

    await vi.advanceTimersByTimeAsync(PROMPT_STALL_TIMEOUT_MS - 1000);
    feedAgentChunk(h.transports[0], 'sess-a', 'm1', 'still working');
    await vi.advanceTimersByTimeAsync(PROMPT_STALL_TIMEOUT_MS - 1000);
    expect(h.sessStore.state.isPrompting).toBe(true);
    expect(h.sessStore.state.error).toBeNull();

    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { stopReason: 'end_turn' } });
    await vi.advanceTimersByTimeAsync(PROMPT_STALL_TIMEOUT_MS);
    expect(h.sessStore.state.isPrompting).toBe(false);
    expect(h.sessStore.state.stopReason).toBe('end_turn');
    expect(h.sessStore.state.error).toBeNull();
  });

  it('a normal settle disarms the watchdog — it never fires afterwards', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    vi.useFakeTimers();

    h.controller.sendPrompt('go');
    const req = h.transports[0].sent.filter(f => f.method === 'session/prompt').at(-1)!;
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { stopReason: 'end_turn' } });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sessStore.state.stopReason).toBe('end_turn');

    await vi.advanceTimersByTimeAsync(PROMPT_STALL_TIMEOUT_MS * 2);
    expect(h.sessStore.state.error).toBeNull();
    expect(h.sessStore.state.items.some(it => it.kind === 'error')).toBe(false);
  });
});

describe('acpWorkspaceController: refreshSessions()', () => {
  it('re-pages session/list to completion and replaces the roster', async () => {
    const h = setup();
    await connectReady(h);

    const p = h.controller.refreshSessions();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    expect(req.method).toBe('session/list');
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { sessions: [{ sessionId: 'a' }, { sessionId: 'b' }] } });
    await p;

    expect(h.wsStore.state.sessions.map(s => s.sessionId).sort()).toEqual(['a', 'b']);
  });
});

describe('acpWorkspaceController: setConfigOption()', () => {
  it('sends session/set_config_option for the open session and applies the returned configOptions', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    const p = h.controller.setConfigOption('think', true);
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    expect(req.method).toBe('session/set_config_option');
    expect(req.params).toMatchObject({ sessionId: 'sess-a', configId: 'think', value: true });

    const configOptions = [{ id: 'think', name: 'Think', type: 'boolean', currentValue: 'true', options: [] }];
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { configOptions } });
    await p;

    expect(h.sessStore.state.configOptions).toEqual(configOptions);
  });
});

describe('acpWorkspaceController: applyConfigOptions() — empty-chat staged flush', () => {
  it('flushes staged options to the active session sequentially, awaiting each set_config_option', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    const p = h.controller.applyConfigOptions([
      { configId: 'model', value: 'openai/gpt-5-mini' },
      { configId: 'think', value: 'high' },
    ]);

    await flushMicrotasks();
    let req = h.transports[0].lastSent();
    expect(req.method).toBe('session/set_config_option');
    expect(req.params).toMatchObject({ sessionId: 'sess-a', configId: 'model', value: 'openai/gpt-5-mini' });
    expect(h.transports[0].sent.filter(f => f.method === 'session/set_config_option')).toHaveLength(1);

    h.transports[0].feed({
      jsonrpc: '2.0',
      id: req.id,
      result: { configOptions: [{ id: 'model', name: 'Model', type: 'select', currentValue: 'openai/gpt-5-mini', options: [] }] },
    });
    await flushMicrotasks();
    req = h.transports[0].lastSent();
    expect(req.params).toMatchObject({ configId: 'think', value: 'high' });
    expect(h.transports[0].sent.filter(f => f.method === 'session/set_config_option')).toHaveLength(2);

    const finalOptions = [{ id: 'think', name: 'Think', type: 'select', currentValue: 'high', options: [] }];
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { configOptions: finalOptions } });
    await p;
    expect(h.sessStore.state.configOptions).toEqual(finalOptions);
  });

  it('surfaces a failure on the session error banner and rejects so the caller can hold the turn back', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    const p = h.controller.applyConfigOptions([{ configId: 'model', value: 'broken/model' }]);
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, error: { code: -32602, message: 'unknown model option "broken/model"' } });

    await expect(p).rejects.toThrow(/unknown model option/);
    expect(h.sessStore.state.error).toContain('unknown model option');
  });

  it('no-ops with no open session and with an empty batch', async () => {
    const h = setup();
    await connectReady(h);

    await h.controller.applyConfigOptions([{ configId: 'model', value: 'x' }]);
    expect(h.transports[0].sent.some(f => f.method === 'session/set_config_option')).toBe(false);

    await createSession(h, 'sess-a');
    await h.controller.applyConfigOptions([]);
    expect(h.transports[0].sent.some(f => f.method === 'session/set_config_option')).toBe(false);
  });
});

describe('acpWorkspaceController: reconnect supervisor (D2)', () => {
  it('does not attempt reconnection before the 1s backoff elapses, then does', async () => {
    const h = setup();
    await connectReady(h);
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.wsStore.state.status).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(999);
    expect(h.transports).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(h.transports).toHaveLength(2);
    expect(h.transports[1].sent.some(f => f.method === 'initialize')).toBe(true);
  });

  it('gives up after 8 failed attempts with exponential backoff capped at 30s, then goes disconnected', async () => {
    const h = setup();
    await connectReady(h);
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);

    const expectedDelays = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000];
    for (let i = 0; i < expectedDelays.length; i++) {
      await vi.advanceTimersByTimeAsync(expectedDelays[i]);
      expect(h.transports).toHaveLength(i + 2);
      h.transports[i + 1].fireClose();
      await vi.advanceTimersByTimeAsync(0);
    }

    expect(h.wsStore.state.status).toBe('disconnected');
  });

  it('resumes the active session (transcript kept client-side) when session/resume succeeds', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    h.sessStore.dispatch({ type: 'message_chunk', id: 'a1', text: 'before the drop' });
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sessStore.state.connectionBanner).toBe('disconnected');

    await vi.advanceTimersByTimeAsync(1000);
    expect(h.transports).toHaveLength(2);
    const initReq = h.transports[1].lastSent();
    h.transports[1].feed({ jsonrpc: '2.0', id: initReq.id, result: { protocolVersion: 1, agentInfo: { name: 'contenox' } } });
    await vi.advanceTimersByTimeAsync(0);

    const resumeReq = h.transports[1].lastSent();
    expect(resumeReq.method).toBe('session/resume');
    expect((resumeReq.params as Record<string, unknown>).sessionId).toBe('sess-a');
    const configOptions = [{ id: 'think', name: 'Think', type: 'boolean', currentValue: 'true', options: [] }];
    h.transports[1].feed({ jsonrpc: '2.0', id: resumeReq.id, result: { configOptions } });
    await vi.advanceTimersByTimeAsync(0);

    expect(h.sessStore.state.messages['a1']).toMatchObject({ text: 'before the drop' });
    expect(h.sessStore.state.connectionBanner).toBe('resumed');
    expect(h.wsStore.state.status).toBe('ready');
    expect(h.sessStore.state.configOptions).toEqual(configOptions);

    const listReq = h.transports[1].lastSent();
    expect(listReq.method).toBe('session/list');
    h.transports[1].feed({ jsonrpc: '2.0', id: listReq.id, result: { sessions: [{ sessionId: 'sess-a' }] } });
    await vi.advanceTimersByTimeAsync(0);
  });

  it('falls back to a full session/load replay when session/resume fails', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    h.sessStore.dispatch({ type: 'message_chunk', id: 'a1', text: 'before the drop' });
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);

    const initReq = h.transports[1].lastSent();
    h.transports[1].feed({ jsonrpc: '2.0', id: initReq.id, result: { protocolVersion: 1, agentInfo: { name: 'contenox' } } });
    await vi.advanceTimersByTimeAsync(0);

    const resumeReq = h.transports[1].lastSent();
    expect(resumeReq.method).toBe('session/resume');
    h.transports[1].feed({ jsonrpc: '2.0', id: resumeReq.id, error: { code: -32602, message: 'unknown session' } });
    await vi.advanceTimersByTimeAsync(0);

    expect(h.sessStore.state.messages['a1']).toBeUndefined();
    const loadReq = h.transports[1].lastSent();
    expect(loadReq.method).toBe('session/load');
    expect((loadReq.params as Record<string, unknown>).sessionId).toBe('sess-a');

    h.transports[1].feed({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'sess-a',
        update: { sessionUpdate: 'user_message_chunk', content: { type: 'text', text: 'replayed' }, messageId: 'replay-0' },
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sessStore.state.messages['replay-0']).toMatchObject({ text: 'replayed' });

    h.transports[1].feed({ jsonrpc: '2.0', id: loadReq.id, result: {} });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sessStore.state.connectionBanner).toBe('resumed');

    const listReq = h.transports[1].lastSent();
    h.transports[1].feed({ jsonrpc: '2.0', id: listReq.id, result: { sessions: [{ sessionId: 'sess-a' }] } });
    await vi.advanceTimersByTimeAsync(0);
  });

  it('maps -32000 auth_required during reconnect to setup_required and stops retrying', async () => {
    const h = setup();
    await connectReady(h);
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);

    const initReq = h.transports[1].lastSent();
    h.transports[1].feed({ jsonrpc: '2.0', id: initReq.id, error: { code: -32000, message: 'contenox is not configured yet' } });
    await vi.advanceTimersByTimeAsync(0);

    expect(h.wsStore.state.status).toBe('setup_required');

    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.transports).toHaveLength(2);
  });

  it('does not reconnect after dispose()', async () => {
    const h = setup();
    await connectReady(h);
    vi.useFakeTimers();

    h.controller.dispose();
    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(h.transports).toHaveLength(1);
    expect(h.wsStore.state.status).toBe('ready');
  });
});

describe('acpWorkspaceController: reconnect() (manual retry, D2 follow-up)', () => {
  it('retries immediately (no backoff wait) from disconnected, and succeeds', async () => {
    const h = setup();
    await connectReady(h);
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);
    const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000];
    for (let i = 0; i < delays.length; i++) {
      await vi.advanceTimersByTimeAsync(delays[i]);
      h.transports[i + 1].fireClose();
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(h.wsStore.state.status).toBe('disconnected');
    const transportCountBeforeManualRetry = h.transports.length;

    const reconnectPromise = h.controller.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.transports).toHaveLength(transportCountBeforeManualRetry + 1);
    expect(h.wsStore.state.status).toBe('reconnecting');

    const latest = h.transports.at(-1)!;
    const initReq = latest.lastSent();
    expect(initReq.method).toBe('initialize');
    latest.feed({ jsonrpc: '2.0', id: initReq.id, result: { protocolVersion: 1, agentInfo: { name: 'contenox' } } });
    await vi.advanceTimersByTimeAsync(0);
    const listReq = latest.lastSent();
    expect(listReq.method).toBe('session/list');
    latest.feed({ jsonrpc: '2.0', id: listReq.id, result: { sessions: [] } });
    await reconnectPromise;

    expect(h.wsStore.state.status).toBe('ready');
  });

  it('cancels a pending automatic backoff timer and retries right away', async () => {
    const h = setup();
    await connectReady(h);
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.wsStore.state.status).toBe('reconnecting');

    const reconnectPromise = h.controller.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.transports).toHaveLength(2);

    const latest = h.transports[1];
    latest.feed({ jsonrpc: '2.0', id: latest.lastSent().id, result: { protocolVersion: 1 } });
    await vi.advanceTimersByTimeAsync(0);
    latest.feed({ jsonrpc: '2.0', id: latest.lastSent().id, result: { sessions: [] } });
    await reconnectPromise;
    expect(h.wsStore.state.status).toBe('ready');

    await vi.advanceTimersByTimeAsync(30_000);
    expect(h.transports).toHaveLength(2);
  });

  it('re-enters the exponential backoff supervisor if the manual attempt itself fails', async () => {
    const h = setup();
    await connectReady(h);
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);

    void h.controller.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.transports).toHaveLength(2);
    h.transports[1].fireClose();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(1999);
    expect(h.transports).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.transports).toHaveLength(3);
  });

  it('rejects when called after dispose()', async () => {
    const h = setup();
    await connectReady(h);
    h.controller.dispose();
    await expect(h.controller.reconnect()).rejects.toThrow('disposed');
  });
});

describe('acpWorkspaceController: multiplexing (workspace-tabs Slice 1)', () => {
  it('holds two sessions subscribed concurrently, each accumulating its OWN session/update traffic', async () => {
    const h = setup();
    await connectReady(h);
    await openTab(h, 'sess-a');
    await openTab(h, 'sess-b');

    expect(h.wsStore.state.activeSessionId).toBe('sess-b');
    expect(h.controller  && h.sliceOf('sess-a')).toBeDefined();
    expect(h.sliceOf('sess-b')).toBeDefined();

    feedAgentChunk(h.transports[0], 'sess-a', 'ma', 'hello A');
    feedAgentChunk(h.transports[0], 'sess-b', 'mb', 'hello B');
    await flushMicrotasks();

    expect(h.sliceOf('sess-a')!.messages['ma']).toMatchObject({ text: 'hello A' });
    expect(h.sliceOf('sess-b')!.messages['mb']).toMatchObject({ text: 'hello B' });
    expect(h.sliceOf('sess-a')!.messages['mb']).toBeUndefined();
    expect(h.sliceOf('sess-b')!.messages['ma']).toBeUndefined();
    expect(h.sessStore.state.messages['mb']).toMatchObject({ text: 'hello B' });
    expect(h.sessStore.state.messages['ma']).toBeUndefined();
  });

  it('a turn that began while focused keeps streaming and settles into its OWN slice after focus switches away', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.controller.sendPrompt('long running');
    const promptA = h.transports[0].sent.filter(f => f.method === 'session/prompt').at(-1)!;
    expect(h.sliceOf('sess-a')!.isPrompting).toBe(true);

    await openTab(h, 'sess-b');
    expect(h.wsStore.state.activeSessionId).toBe('sess-b');
    expect(h.sliceOf('sess-a')!.isPrompting).toBe(true);
    expect(h.sliceOf('sess-b')!.isPrompting).toBe(false);

    feedAgentChunk(h.transports[0], 'sess-a', 'am', 'streamed while backgrounded');
    await flushMicrotasks();
    expect(h.sliceOf('sess-a')!.messages['am']).toMatchObject({ text: 'streamed while backgrounded' });
    expect(h.sessStore.state.messages['am']).toBeUndefined();

    h.transports[0].feed({ jsonrpc: '2.0', id: promptA.id, result: { stopReason: 'end_turn' } });
    await flushMicrotasks();
    expect(h.sliceOf('sess-a')!.isPrompting).toBe(false);
    expect(h.sliceOf('sess-a')!.stopReason).toBe('end_turn');
    expect(h.sliceOf('sess-b')!.stopReason).toBeNull();
  });

  it('two open sessions can prompt concurrently — same-session re-prompt is a no-op, a different session is not', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    await openTab(h, 'sess-b');

    h.controller.sendPrompt('prompt B');
    const promptB = h.transports[0].sent.filter(f => f.method === 'session/prompt').at(-1)!;
    expect((promptB.params as Record<string, unknown>).sessionId).toBe('sess-b');
    expect(h.sliceOf('sess-b')!.isPrompting).toBe(true);

    const sentAfterB = h.transports[0].sentRaw.length;
    h.controller.sendPrompt('second B while first in flight');
    expect(h.transports[0].sentRaw.length).toBe(sentAfterB);

    h.controller.focusSession('sess-a');
    h.controller.sendPrompt('prompt A');
    const promptA = h.transports[0].sent.filter(f => f.method === 'session/prompt').at(-1)!;
    expect((promptA.params as Record<string, unknown>).sessionId).toBe('sess-a');
    expect(promptA.id).not.toBe(promptB.id);
    expect(h.sliceOf('sess-a')!.isPrompting).toBe(true);
    expect(h.sliceOf('sess-b')!.isPrompting).toBe(true);
  });

  it('closeSessionTab closes ONE session (session/close, not delete) and leaves the other live', async () => {
    const h = setup();
    await connectReady(h);
    await openTab(h, 'sess-a');
    await openTab(h, 'sess-b');

    h.controller.closeSessionTab('sess-a');
    await flushMicrotasks();

    const closeReq = h.transports[0].sent.find(f => f.method === 'session/close' && (f.params as Record<string, unknown>).sessionId === 'sess-a');
    expect(closeReq).toBeDefined();
    expect(h.transports[0].sent.some(f => f.method === 'session/delete')).toBe(false);
    expect(h.sliceOf('sess-a')).toBeUndefined();
    expect(h.wsStore.state.activeSessionId).toBe('sess-b');

    feedAgentChunk(h.transports[0], 'sess-b', 'bm', 'still here');
    await flushMicrotasks();
    expect(h.sliceOf('sess-b')!.messages['bm']).toMatchObject({ text: 'still here' });
  });

  it('closing the FOCUSED tab moves focus to a remaining open session', async () => {
    const h = setup();
    await connectReady(h);
    await openTab(h, 'sess-a');
    await openTab(h, 'sess-b');

    h.controller.closeSessionTab('sess-b');
    await flushMicrotasks();

    expect(h.sliceOf('sess-b')).toBeUndefined();
    expect(h.wsStore.state.activeSessionId).toBe('sess-a');
    expect(h.sessStore.state.sessionId).toBe('sess-a');
  });

  it('focusSession re-points the rendered session with no wire traffic; unopened ids are a no-op', async () => {
    const h = setup();
    await connectReady(h);
    await openTab(h, 'sess-a');
    await openTab(h, 'sess-b');

    const sentBefore = h.transports[0].sentRaw.length;
    h.controller.focusSession('sess-a');
    expect(h.transports[0].sentRaw.length).toBe(sentBefore);
    expect(h.wsStore.state.activeSessionId).toBe('sess-a');
    expect(h.sessStore.state.sessionId).toBe('sess-a');

    h.controller.focusSession('never-opened');
    expect(h.wsStore.state.activeSessionId).toBe('sess-a');
  });

  it('openSessionTab on an already-open session just focuses it (dedup by identity, no second load)', async () => {
    const h = setup();
    await connectReady(h);
    await openTab(h, 'sess-a');
    await openTab(h, 'sess-b');

    const loadsBefore = h.transports[0].sent.filter(f => f.method === 'session/load').length;
    await h.controller.openSessionTab('sess-a');
    expect(h.transports[0].sent.filter(f => f.method === 'session/load').length).toBe(loadsBefore);
    expect(h.wsStore.state.activeSessionId).toBe('sess-a');
  });

  it('reconnect resubscribes EVERY open session, not just the focused one', async () => {
    const h = setup();
    await connectReady(h);
    await openTab(h, 'sess-a');
    await openTab(h, 'sess-b');
    h.sessionsStore.dispatch({ type: 'session_dispatch', key: 'sess-a', action: { type: 'message_chunk', id: 'a1', text: 'A pre-drop' } });
    h.sessionsStore.dispatch({ type: 'session_dispatch', key: 'sess-b', action: { type: 'message_chunk', id: 'b1', text: 'B pre-drop' } });
    vi.useFakeTimers();

    h.transports[0].fireClose();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sliceOf('sess-a')!.connectionBanner).toBe('disconnected');
    expect(h.sliceOf('sess-b')!.connectionBanner).toBe('disconnected');

    await vi.advanceTimersByTimeAsync(1000);
    const t1 = h.transports[1];
    t1.feed({ jsonrpc: '2.0', id: t1.lastSent().id, result: { protocolVersion: 1, agentInfo: { name: 'contenox' } } });
    await vi.advanceTimersByTimeAsync(0);

    const resumeA = t1.lastSent();
    expect(resumeA.method).toBe('session/resume');
    expect((resumeA.params as Record<string, unknown>).sessionId).toBe('sess-a');
    t1.feed({ jsonrpc: '2.0', id: resumeA.id, result: {} });
    await vi.advanceTimersByTimeAsync(0);

    const resumeB = t1.lastSent();
    expect(resumeB.method).toBe('session/resume');
    expect((resumeB.params as Record<string, unknown>).sessionId).toBe('sess-b');
    t1.feed({ jsonrpc: '2.0', id: resumeB.id, result: {} });
    await vi.advanceTimersByTimeAsync(0);

    expect(h.sliceOf('sess-a')!.connectionBanner).toBe('resumed');
    expect(h.sliceOf('sess-b')!.connectionBanner).toBe('resumed');
    expect(h.sliceOf('sess-a')!.messages['a1']).toMatchObject({ text: 'A pre-drop' });
    expect(h.sliceOf('sess-b')!.messages['b1']).toMatchObject({ text: 'B pre-drop' });

    const listReq = t1.lastSent();
    expect(listReq.method).toBe('session/list');
    t1.feed({ jsonrpc: '2.0', id: listReq.id, result: { sessions: [{ sessionId: 'sess-a' }, { sessionId: 'sess-b' }] } });
    await vi.advanceTimersByTimeAsync(0);

    feedAgentChunk(t1, 'sess-a', 'a2', 'A after');
    feedAgentChunk(t1, 'sess-b', 'b2', 'B after');
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sliceOf('sess-a')!.messages['a2']).toMatchObject({ text: 'A after' });
    expect(h.sliceOf('sess-b')!.messages['b2']).toMatchObject({ text: 'B after' });
    expect(h.sliceOf('sess-a')!.messages['b2']).toBeUndefined();
  });
});

describe('acpWorkspaceController: session_info_update-derived title (tab-strip/sidebar pinning)', () => {
  it('a title pushed via session_info_update lands on the roster entry for that session (not the raw-id fallback)', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.transports[0].feed({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'sess-a',
        update: { sessionUpdate: 'session_info_update', title: 'Read README.md, then update its title' },
      },
    });
    await flushMicrotasks();

    const entry = h.wsStore.state.sessions.find(s => s.sessionId === 'sess-a');
    expect(entry?.title).toBe('Read README.md, then update its title');
    expect(entry?.title).not.toBe(entry?.sessionId);
  });

  it('a roster refresh (session/list, e.g. after a reconnect) does not regress an already-known title back to titleless', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.transports[0].feed({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'sess-a',
        update: { sessionUpdate: 'session_info_update', title: 'Read README.md, then update its title' },
      },
    });
    await flushMicrotasks();
    expect(h.wsStore.state.sessions.find(s => s.sessionId === 'sess-a')?.title).toBe(
      'Read README.md, then update its title',
    );

    const p = h.controller.refreshSessions();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { sessions: [{ sessionId: 'sess-a' }] } });
    await p;

    expect(h.wsStore.state.sessions.find(s => s.sessionId === 'sess-a')?.title).toBe(
      'Read README.md, then update its title',
    );
  });

  it('a roster refresh still drops a session genuinely absent from the new session/list snapshot', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    const p = h.controller.refreshSessions();
    await flushMicrotasks();
    const req = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: req.id, result: { sessions: [] } });
    await p;

    expect(h.wsStore.state.sessions.find(s => s.sessionId === 'sess-a')).toBeUndefined();
  });
});

describe('acpWorkspaceController: inline permission card responses (explicit-only)', () => {
  function feedPermissionRequest(t: MockTransport, rpcId: string, sessionId: string, toolCallId: string): void {
    t.feed({
      jsonrpc: '2.0',
      id: rpcId,
      method: 'session/request_permission',
      params: {
        sessionId,
        toolCall: { toolCallId, title: 'Edit config' },
        options: [
          { optionId: 'allow-1', name: 'Allow once', kind: 'allow_once' },
          { optionId: 'deny-1', name: 'Deny once', kind: 'reject_once' },
        ],
      },
    });
  }

  it('respondPermission answers exactly once with the chosen optionId and clears the pending request', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    feedPermissionRequest(h.transports[0], 'perm-c', 'sess-a', 'tc-1');
    await flushMicrotasks();
    expect(h.sessStore.state.pendingPermission).not.toBeNull();
    expect(h.transports[0].sent.filter(f => f.id === 'perm-c')).toHaveLength(0);

    h.controller.respondPermission('allow-1');
    await flushMicrotasks();

    const responses = h.transports[0].sent.filter(f => f.id === 'perm-c');
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ result: { outcome: { outcome: 'selected', optionId: 'allow-1' } } });
    expect(h.sessStore.state.pendingPermission).toBeNull();

    h.controller.respondPermission('deny-1');
    await flushMicrotasks();
    const after = h.transports[0].sent.filter(f => f.id === 'perm-c');
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ result: { outcome: { outcome: 'selected', optionId: 'allow-1' } } });
  });

  it('leaves an unanswered request pending and sends NO response when unrelated events arrive (no implicit deny on dismiss)', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    feedPermissionRequest(h.transports[0], 'perm-b', 'sess-a', 'tc-1');
    await flushMicrotasks();
    expect(h.sessStore.state.pendingPermission).not.toBeNull();

    feedAgentChunk(h.transports[0], 'sess-a', 'm-1', 'still working…');
    h.controller.focusEmptyTab();
    h.controller.focusSession('sess-a');
    await flushMicrotasks();

    expect(h.transports[0].sent.filter(f => f.id === 'perm-b')).toHaveLength(0);
    expect(h.sliceOf('sess-a')?.pendingPermission).not.toBeNull();

    h.controller.respondPermission('deny-1');
    await flushMicrotasks();
    expect(h.transports[0].sent.filter(f => f.id === 'perm-b')).toHaveLength(1);
    expect(h.sliceOf('sess-a')?.pendingPermission).toBeNull();
  });

  it('keeps two concurrent open sessions each holding their own pending request; answering one leaves the other pending', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');
    await openTab(h, 'sess-b');

    feedPermissionRequest(h.transports[0], 'perm-a', 'sess-a', 'tc-a');
    feedPermissionRequest(h.transports[0], 'perm-b', 'sess-b', 'tc-b');
    await flushMicrotasks();

    expect(h.sliceOf('sess-a')?.pendingPermission?.toolCall.toolCallId).toBe('tc-a');
    expect(h.sliceOf('sess-b')?.pendingPermission?.toolCall.toolCallId).toBe('tc-b');

    h.controller.respondPermission('allow-1');
    await flushMicrotasks();
    expect(h.transports[0].sent.filter(f => f.id === 'perm-b')).toMatchObject([
      { result: { outcome: { outcome: 'selected', optionId: 'allow-1' } } },
    ]);
    expect(h.sliceOf('sess-b')?.pendingPermission).toBeNull();
    expect(h.sliceOf('sess-a')?.pendingPermission?.toolCall.toolCallId).toBe('tc-a');
    expect(h.transports[0].sent.filter(f => f.id === 'perm-a')).toHaveLength(0);

    h.controller.focusSession('sess-a');
    h.controller.respondPermission('deny-1');
    await flushMicrotasks();
    expect(h.transports[0].sent.filter(f => f.id === 'perm-a')).toMatchObject([
      { result: { outcome: { outcome: 'selected', optionId: 'deny-1' } } },
    ]);
    expect(h.sliceOf('sess-a')?.pendingPermission).toBeNull();
  });
});

describe('acpWorkspaceController: image prompt capability + image blocks', () => {
  it('exposes the initialize agentCapabilities.promptCapabilities on ready (image gating source)', async () => {
    const h = setup();
    const p = h.controller.connect();
    await flushMicrotasks();
    const initReq = h.transports[0].lastSent();
    h.transports[0].feed({
      jsonrpc: '2.0',
      id: initReq.id,
      result: {
        protocolVersion: 1,
        agentInfo: { name: 'contenox' },
        agentCapabilities: { promptCapabilities: { image: true } },
      },
    });
    await flushMicrotasks();
    const listReq = h.transports[0].lastSent();
    h.transports[0].feed({ jsonrpc: '2.0', id: listReq.id, result: { sessions: [] } });
    await p;

    expect(h.wsStore.state.promptCapabilities).toEqual({ image: true });
  });

  it('defaults promptCapabilities to {} for an agent that advertises none (no attach affordance)', async () => {
    const h = setup();
    await connectReady(h);
    expect(h.wsStore.state.promptCapabilities).toEqual({});
  });

  it('sendPrompt with images appends image content blocks to session/prompt and echoes them on the local user message', async () => {
    const h = setup();
    await connectReady(h);
    await createSession(h, 'sess-a');

    h.controller.sendPrompt(
      'what is on this screenshot?',
      [],
      [{ id: 'img-1', name: 'shot.png', data: 'aGVsbG8=', mimeType: 'image/png' }],
    );

    const req = h.transports[0].lastSent();
    expect(req.method).toBe('session/prompt');
    expect((req.params as Record<string, unknown>).prompt).toEqual([
      { type: 'text', text: 'what is on this screenshot?' },
      { type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' },
    ]);

    const user = Object.values(h.sessStore.state.messages).find(m => m.role === 'user');
    expect(user).toMatchObject({
      text: 'what is on this screenshot?',
      images: [{ data: 'aGVsbG8=', mimeType: 'image/png' }],
    });
  });

  it('routes an inbound user_message_chunk image (session/load replay of an image prompt) into the slice', async () => {
    const h = setup();
    await connectReady(h);
    await openTab(h, 'sess-r');

    h.transports[0].feed({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'sess-r',
        update: {
          sessionUpdate: 'user_message_chunk',
          content: { type: 'image', data: 'aW1n', mimeType: 'image/jpeg' },
          messageId: 'replay-0',
        },
      },
    });
    await flushMicrotasks();

    expect(h.sliceOf('sess-r')?.messages['replay-0']).toMatchObject({
      role: 'user',
      images: [{ data: 'aW1n', mimeType: 'image/jpeg' }],
    });
  });
});
