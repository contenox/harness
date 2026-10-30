import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  api: {
    getWorkspaceRoots: vi.fn(async () => ({ roots: [{ path: '/proj/a', default: false }, { path: '/home/u/Contenox', default: true }] })),
  },
}));

import {
  acpWsUrl,
  cwdRawFetch,
  ensureProjectPrefix,
  isRuntimeNotRunning,
  prefixForCwd,
  resetProjectRuntimeCaches,
  withPrefix,
} from './projectRuntime';

type Ensure = (p: string) => Promise<{ ok: true; key: string; prefix: string } | { ok: false; error: string }>;

function installBridge(ensure: Ensure) {
  (globalThis as { window?: unknown }).window = {
    contenoxDesktop: { ensureProjectRuntime: ensure },
  };
}

beforeEach(() => {
  resetProjectRuntimeCaches();
  (globalThis as { window?: unknown }).window = {};
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  vi.unstubAllGlobals();
});

describe('projectRuntime', () => {
  it('returns the same origin prefix without a bridge', async () => {
    expect(await ensureProjectPrefix('/proj/a')).toBe('');
    expect(await prefixForCwd('/proj/a')).toBe('');
  });

  it('caches the ensured prefix per normalized path', async () => {
    const ensure = vi.fn<Ensure>(async () => ({ ok: true, key: 'k', prefix: '/rt/k' }));
    installBridge(ensure);
    expect(await ensureProjectPrefix('/proj/a')).toBe('/rt/k');
    expect(await ensureProjectPrefix('/proj/a/')).toBe('/rt/k');
    expect(ensure).toHaveBeenCalledTimes(1);
    expect(await ensureProjectPrefix('/proj/a', { force: true })).toBe('/rt/k');
    expect(ensure).toHaveBeenCalledTimes(2);
  });

  it('falls back to same origin and does not cache a failed ensure', async () => {
    const ensure = vi
      .fn<Ensure>()
      .mockResolvedValueOnce({ ok: false, error: 'dev' })
      .mockResolvedValueOnce({ ok: true, key: 'k', prefix: '/rt/k' });
    installBridge(ensure);
    expect(await ensureProjectPrefix('/proj/a')).toBe('');
    expect(await ensureProjectPrefix('/proj/a')).toBe('/rt/k');
  });

  it('maps a cwd inside a project to that project prefix, others to default', async () => {
    installBridge(async () => ({ ok: true, key: 'k', prefix: '/rt/k' }));
    expect(await prefixForCwd('/proj/a/sub')).toBe('/rt/k');
    expect(await prefixForCwd('/other')).toBe('');
  });

  it('maps the default root to the default runtime without ensuring a project runtime', async () => {
    const ensure = vi.fn<Ensure>(async () => ({ ok: true, key: 'k', prefix: '/rt/k' }));
    installBridge(ensure);
    expect(await prefixForCwd('/home/u/Contenox')).toBe('');
    expect(await prefixForCwd('/home/u/Contenox/sub')).toBe('');
    expect(ensure).not.toHaveBeenCalled();
  });

  it('re-ensures once and retries on 503 runtime_not_running', async () => {
    const ensure = vi.fn<Ensure>(async () => ({ ok: true, key: 'k', prefix: '/rt/k' }));
    installBridge(ensure);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'runtime_not_running' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await cwdRawFetch('/proj/a', '/api/files?x=1');
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual(['/rt/k/api/files?x=1', '/rt/k/api/files?x=1']);
    expect(ensure).toHaveBeenCalledTimes(2);
  });

  it('helpers', () => {
    expect(withPrefix('', '/api/x')).toBe('/api/x');
    expect(withPrefix('/rt/k', '/api/x')).toBe('/rt/k/api/x');
    expect(acpWsUrl('/rt/k', { protocol: 'http:', host: 'h:1' })).toBe('ws://h:1/rt/k/acp');
    expect(acpWsUrl('', { protocol: 'https:', host: 'h' })).toBe('wss://h/acp');
    expect(isRuntimeNotRunning(503, { error: 'runtime_not_running' })).toBe(true);
    expect(isRuntimeNotRunning(500, { error: 'runtime_not_running' })).toBe(false);
    expect(isRuntimeNotRunning(503, { error: 'other' })).toBe(false);
  });
});
