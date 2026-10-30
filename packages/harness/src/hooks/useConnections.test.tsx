import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionKeys, providerKeys, setupKeys } from '../lib/queryKeys';
import type { Connection } from '../lib/types';
import {
  connectionsRefetchInterval,
  useCancelConnectionLogin,
  useCheckConnection,
  useConnectionLogout,
  useCreateConnection,
  useDeleteConnection,
  usePatchConnection,
} from './useConnections';
import { useCancelProviderLogin } from './useProviders';

vi.mock('../lib/api', () => ({
  api: {
    createConnection: vi.fn(async () => ({ id: 'c1' })),
    patchConnection: vi.fn(async () => ({ id: 'c1' })),
    deleteConnection: vi.fn(async () => 'deleted'),
    checkConnection: vi.fn(async () => ({ id: 'c1', health: 'available' })),
    cancelConnectionLogin: vi.fn(async () => ({ provider: 'openai-codex', state: 'login_required' })),
    cancelProviderLogin: vi.fn(async () => ({ provider: 'openai-codex', state: 'login_required' })),
    logoutConnection: vi.fn(async () => 'ok'),
    logoutProvider: vi.fn(async () => 'ok'),
  },
}));

const { api } = await import('../lib/api');

function mountHook<T>(client: QueryClient, hook: () => T): T {
  let captured: T | undefined;
  const Probe = (): ReactNode => {
    captured = hook();
    return null;
  };
  renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(Probe)));
  if (captured === undefined) throw new Error('hook did not run');
  return captured;
}

const makeClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('connection mutations', () => {
  it('create posts by provider type and refreshes the list and setup status', async () => {
    const client = makeClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const create = mountHook(client, () => useCreateConnection('anthropic'));
    await create.mutateAsync({ apiKey: 'k' });
    expect(api.createConnection).toHaveBeenCalledWith('anthropic', { apiKey: 'k' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: connectionKeys.list() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: setupKeys.status() });
  });

  it('patch sends the id separately from the body', async () => {
    const patch = mountHook(makeClient(), () => usePatchConnection());
    await patch.mutateAsync({ id: 'c1', name: 'work', clearSecret: true });
    expect(api.patchConnection).toHaveBeenCalledWith('c1', { name: 'work', clearSecret: true });
  });

  it('delete and check call the connection endpoints', async () => {
    const client = makeClient();
    const del = mountHook(client, () => useDeleteConnection());
    await del.mutateAsync('c1');
    expect(api.deleteConnection).toHaveBeenCalledWith('c1');
    const check = mountHook(client, () => useCheckConnection());
    await expect(check.mutateAsync('c1')).resolves.toMatchObject({ health: 'available' });
    expect(api.checkConnection).toHaveBeenCalledWith('c1');
  });

  it('refreshes the list even when the check call fails', async () => {
    const client = makeClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(api.checkConnection).mockRejectedValueOnce(new Error('timeout'));
    const check = mountHook(client, () => useCheckConnection());
    await expect(check.mutateAsync('c1')).rejects.toThrow('timeout');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: connectionKeys.list() });
  });
});

describe('login cancel wiring', () => {
  it('connection cancel hits the cancel endpoint, never logout, and stores the status', async () => {
    const client = makeClient();
    const cancel = mountHook(client, () => useCancelConnectionLogin('c1'));
    await cancel.mutateAsync();
    expect(api.cancelConnectionLogin).toHaveBeenCalledWith('c1');
    expect(api.logoutConnection).not.toHaveBeenCalled();
    expect(client.getQueryData(connectionKeys.login('c1'))).toMatchObject({
      state: 'login_required',
    });
  });

  it('provider cancel hits the per-type cancel endpoint, never logout', async () => {
    const client = makeClient();
    const cancel = mountHook(client, () => useCancelProviderLogin('openai-codex'));
    await cancel.mutateAsync();
    expect(api.cancelProviderLogin).toHaveBeenCalledWith('openai-codex');
    expect(api.logoutProvider).not.toHaveBeenCalled();
    expect(client.getQueryData(providerKeys.login('openai-codex'))).toMatchObject({
      state: 'login_required',
    });
  });

  it('logout is a separate, explicit mutation', async () => {
    const logout = mountHook(makeClient(), () => useConnectionLogout('c1'));
    await logout.mutateAsync();
    expect(api.logoutConnection).toHaveBeenCalledWith('c1');
    expect(api.cancelConnectionLogin).not.toHaveBeenCalled();
  });
});

describe('connectionsRefetchInterval', () => {
  const c = (patch: Partial<Connection>) => ({ health: 'available', authState: 'not_required', ...patch }) as Connection;
  it('polls while a connection is checking or signing in', () => {
    expect(connectionsRefetchInterval([c({}), c({ health: 'checking' })])).toBe(2000);
    expect(connectionsRefetchInterval([c({ authState: 'login_pending' })])).toBe(2000);
  });
  it('stops polling when everything is settled or unknown', () => {
    expect(connectionsRefetchInterval([c({}), c({ health: 'unavailable' })])).toBe(false);
    expect(connectionsRefetchInterval(undefined)).toBe(false);
  });
});
