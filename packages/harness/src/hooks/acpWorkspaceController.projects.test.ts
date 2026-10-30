import { describe, expect, it } from 'vitest';
import type { Transport } from '../lib/acp';
import { createAcpWorkspaceController } from './acpWorkspaceController';
import {
  acpSessionsReducer,
  acpWorkspaceReducer,
  initialAcpSessionsState,
  initialAcpWorkspaceState,
  type AcpSessionsState,
  type AcpWorkspaceState,
} from './acpWorkspaceState';

class MockTransport implements Transport {
  readonly sentRaw: string[] = [];
  private readonly messageCbs: Array<(text: string) => void> = [];
  private readonly closeCbs: Array<() => void> = [];
  closeCalls = 0;
  constructor(readonly target: string) {}
  send(text: string): void {
    this.sentRaw.push(text);
  }
  onMessage(cb: (text: string) => void): void {
    this.messageCbs.push(cb);
  }
  onClose(cb: () => void): void {
    this.closeCbs.push(cb);
  }
  close(): void {
    this.closeCalls++;
  }
  feed(msg: unknown): void {
    for (const cb of this.messageCbs) cb(JSON.stringify(msg));
  }
  fireClose(): void {
    for (const cb of this.closeCbs) cb();
  }
  requests(method?: string): Array<Record<string, unknown>> {
    const all = this.sentRaw.map(t => JSON.parse(t) as Record<string, unknown>);
    return method ? all.filter(f => f.method === method) : all;
  }
}

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function setup(listed: unknown[] = []) {
  const transports: MockTransport[] = [];
  let ws: AcpWorkspaceState = initialAcpWorkspaceState;
  let sessions: AcpSessionsState = initialAcpSessionsState;
  const attempts: Array<[string, number]> = [];
  const controller = createAcpWorkspaceController(
    {
      createTransport: (target, attempt) => {
        attempts.push([target, attempt]);
        const t = new MockTransport(target);
        transports.push(t);
        return t;
      },
      resolveProject: async cwd => (cwd.startsWith('/proj/a') ? '/proj/a' : ''),
      cwd: '/work',
    },
    a => {
      ws = acpWorkspaceReducer(ws, a);
    },
    a => {
      sessions = acpSessionsReducer(sessions, a);
    },
  );
  // Auto-answer every request on every transport so the tests only assert routing.
  const seen = new Set<string>();
  const timer = setInterval(() => {
    for (const t of transports) {
      for (const req of t.requests()) {
        const key = `${transports.indexOf(t)}|${String(req.id)}`;
        if (seen.has(key) || req.id === undefined) continue;
        seen.add(key);
        let result: unknown = {};
        if (req.method === 'initialize') result = { protocolVersion: 1, agentInfo: { name: 'c' } };
        if (req.method === 'session/list') result = { sessions: listed };
        if (req.method === 'session/new') result = { sessionId: `s-${t.target || 'default'}` };
        t.feed({ jsonrpc: '2.0', id: req.id, result });
      }
    }
  }, 1);
  return {
    controller,
    transports,
    attempts,
    stop: () => clearInterval(timer),
    state: () => ({ ws, sessions }),
  };
}

describe('acpWorkspaceController: per-project connections', () => {
  it('routes a project session to its own connection and leaves default for listing', async () => {
    const h = setup([{ sessionId: 'old', cwd: '/proj/a/sub' }]);
    await h.controller.connect();
    expect(h.attempts).toEqual([['', 0]]);
    expect(h.state().ws.sessions.map(s => s.sessionId)).toEqual(['old']);

    const sid = await h.controller.newSession('/proj/a');
    expect(sid).toBe('s-/proj/a');
    expect(h.attempts).toEqual([
      ['', 0],
      ['/proj/a', 0],
    ]);
    expect(h.transports[0].requests('session/new')).toHaveLength(0);
    expect(h.transports[1].requests('session/new')).toHaveLength(1);

    h.controller.sendPrompt('hello');
    await tick();
    expect(h.transports[1].requests('session/prompt')).toHaveLength(1);
    expect(h.transports[0].requests('session/prompt')).toHaveLength(0);
    h.controller.dispose();
    h.stop();
  });

  it('keeps non-project sessions on the default connection', async () => {
    const h = setup();
    await h.controller.connect();
    const sid = await h.controller.newSession('/elsewhere');
    expect(sid).toBe('s-default');
    expect(h.transports).toHaveLength(1);
    h.controller.dispose();
    h.stop();
  });

  it('opens a listed session through the connection of its project', async () => {
    const h = setup([{ sessionId: 'old', cwd: '/proj/a/sub' }]);
    await h.controller.connect();
    await h.controller.openSessionTab('old');
    expect(h.transports[1].requests('session/load')).toHaveLength(1);
    expect(h.transports[0].requests('session/load')).toHaveLength(0);
    h.controller.dispose();
    h.stop();
  });

  it('closes an idle project connection once its last session is closed', async () => {
    const h = setup();
    await h.controller.connect();
    const sid = await h.controller.newSession('/proj/a');
    h.controller.closeSessionTab(sid);
    expect(h.transports[1].closeCalls).toBeGreaterThan(0);
    h.controller.dispose();
    h.stop();
  });

  it('re-ensures the project runtime (attempt > 0) when its connection drops', async () => {
    const h = setup();
    await h.controller.connect();
    await h.controller.newSession('/proj/a');
    const before = h.attempts.length;
    h.transports[1].fireClose();
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(h.attempts.slice(before)).toEqual([['/proj/a', 1]]);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(h.transports[2].requests('session/resume').length).toBeGreaterThan(0);
    h.controller.dispose();
    h.stop();
  });
});
