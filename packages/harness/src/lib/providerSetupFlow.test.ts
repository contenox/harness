import { describe, expect, it, vi } from 'vitest';
import { getCloudProviderSetup } from './providerCatalog';
import {
  initialSetupState,
  isSetupBusy,
  runSetup,
  setupReducer,
  verifyConnection,
  type SetupDeps,
  type SetupEvent,
  type SetupState,
} from './providerSetupFlow';
import { ApiError } from './fetch';
import type { Connection } from './types';

const conn = (patch: Partial<Connection> = {}): Connection => ({
  id: 'c1',
  name: 'anthropic',
  providerType: 'anthropic',
  baseUrl: 'https://api.anthropic.com',
  configState: 'configured',
  authState: 'not_required',
  health: 'unknown',
  secretSource: 'literal',
  secretConfigured: true,
  secretPresent: true,
  modelCount: 0,
  ...patch,
});

function makeDeps(overrides: Partial<SetupDeps> = {}) {
  let clock = 0;
  const deps: SetupDeps = {
    create: vi.fn(async () => conn()),
    patch: vi.fn(async () => conn()),
    check: vi.fn(async () => conn({ health: 'available', modelCount: 4 })),
    get: vi.fn(async () => conn({ health: 'available' })),
    sleep: vi.fn(async (ms: number) => {
      clock += ms;
    }),
    now: () => clock,
    ...overrides,
  };
  const events: SetupEvent[] = [];
  const common = {
    deps,
    dispatch: (e: SetupEvent) => events.push(e),
    isCancelled: () => false,
  };
  return { deps, events, common };
}

const anthropic = getCloudProviderSetup('anthropic');
const types = (events: SetupEvent[]) => events.map(e => e.type);

describe('setupReducer', () => {
  it('walks idle -> editing -> saving -> verifying -> success', () => {
    let s: SetupState = initialSetupState;
    s = setupReducer(s, { type: 'edit' });
    expect(s.phase).toBe('editing');
    s = setupReducer(s, { type: 'saving' });
    expect(s.phase).toBe('saving');
    s = setupReducer(s, { type: 'verifying', connection: conn() });
    expect(s.phase).toBe('verifying');
    expect(isSetupBusy(s)).toBe(true);
    s = setupReducer(s, { type: 'success', connection: conn({ health: 'available' }) });
    expect(s.phase).toBe('success');
    expect(isSetupBusy(s)).toBe(false);
  });

  it('ignores edits while busy but lets a verified form be edited again', () => {
    const saving = setupReducer(initialSetupState, { type: 'saving' });
    expect(setupReducer(saving, { type: 'edit' })).toBe(saving);
    const done = setupReducer(saving, { type: 'success', connection: conn() });
    expect(setupReducer(done, { type: 'edit' }).phase).toBe('editing');
  });

  it('keeps the saved connection when a verify failure is edited', () => {
    const failed = setupReducer(initialSetupState, {
      type: 'failed',
      connection: conn(),
      error: { stage: 'verify', code: 'unauthorized' },
    });
    expect(failed.phase).toBe('error');
    const editing = setupReducer(failed, { type: 'edit' });
    expect(editing.phase).toBe('editing');
    expect(editing.connection?.id).toBe('c1');
    expect(editing.error).toBeUndefined();
  });

  it('reset returns to idle and drops the connection', () => {
    const failed = setupReducer(initialSetupState, {
      type: 'failed',
      connection: conn(),
      error: { stage: 'verify' },
    });
    expect(setupReducer(failed, { type: 'reset' })).toEqual(initialSetupState);
  });
});

describe('runSetup', () => {
  it('creates, verifies, and only then reports success', async () => {
    const { deps, events, common } = makeDeps();
    const result = await runSetup({
      ...common,
      setup: anthropic,
      values: { apiKey: 'sk-ant-1', baseUrl: 'https://api.anthropic.com' },
    });
    expect(deps.create).toHaveBeenCalledWith('anthropic', {
      apiKey: 'sk-ant-1',
      baseUrl: 'https://api.anthropic.com',
    });
    expect(deps.check).toHaveBeenCalledWith('c1');
    expect(types(events)).toEqual(['saving', 'verifying', 'success']);
    expect(result?.health).toBe('available');
  });

  it('patches instead of creating when a connection id is given', async () => {
    const { deps, common } = makeDeps();
    await runSetup({
      ...common,
      setup: anthropic,
      connectionId: 'c9',
      secretStored: true,
      values: { baseUrl: 'https://proxy.example' },
    });
    expect(deps.patch).toHaveBeenCalledWith('c9', { baseUrl: 'https://proxy.example' });
    expect(deps.create).not.toHaveBeenCalled();
  });

  it('never reports success when the check says unavailable, and keeps the error code', async () => {
    const { events, common } = makeDeps({
      check: vi.fn(async () =>
        conn({ health: 'unavailable', errorCode: 'unauthorized', error: '401 invalid x-api-key' }),
      ),
    });
    const result = await runSetup({ ...common, setup: anthropic, values: { apiKey: 'bad' } });
    expect(result).toBeUndefined();
    expect(types(events)).toEqual(['saving', 'verifying', 'failed']);
    expect(events[2]).toMatchObject({
      type: 'failed',
      error: { stage: 'verify', code: 'unauthorized', message: '401 invalid x-api-key' },
      connection: { id: 'c1' },
    });
  });

  it('polls while the connection is still checking, then succeeds', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(conn({ health: 'checking' }))
      .mockResolvedValueOnce(conn({ health: 'available' }));
    const { events, deps, common } = makeDeps({
      check: vi.fn(async () => conn({ health: 'checking' })),
      get,
    });
    await runSetup({ ...common, setup: anthropic, values: { apiKey: 'k' } });
    expect(get).toHaveBeenCalledTimes(2);
    expect(deps.sleep).toHaveBeenCalledTimes(2);
    expect(types(events).at(-1)).toBe('success');
  });

  it('times out after 30s as unreachable', async () => {
    const { events, common } = makeDeps({
      check: vi.fn(async () => conn({ health: 'checking' })),
      get: vi.fn(async () => conn({ health: 'checking' })),
    });
    await runSetup({ ...common, setup: anthropic, values: { apiKey: 'k' } });
    expect(events.at(-1)).toMatchObject({
      type: 'failed',
      error: { stage: 'verify', code: 'unreachable' },
    });
  });

  it('treats a login-required auth state as a login_required failure', async () => {
    const { events, common } = makeDeps({
      check: vi.fn(async () => conn({ authState: 'login_required', health: 'unknown' })),
    });
    await runSetup({ ...common, setup: anthropic, values: { apiKey: 'k' } });
    expect(events.at(-1)).toMatchObject({ error: { stage: 'verify', code: 'login_required' } });
  });

  it('keeps the connection when the check call itself fails', async () => {
    const { events, common } = makeDeps({
      check: vi.fn(async () => {
        throw new ApiError('timed out', 0);
      }),
    });
    await runSetup({ ...common, setup: anthropic, values: { apiKey: 'k' } });
    expect(events.at(-1)).toMatchObject({
      type: 'failed',
      connection: { id: 'c1' },
      error: { stage: 'verify', message: 'timed out' },
    });
  });

  it('does not call the runtime when client validation fails', async () => {
    const { deps, events, common } = makeDeps();
    await runSetup({ ...common, setup: anthropic, values: {} });
    expect(deps.create).not.toHaveBeenCalled();
    expect(events).toEqual([
      {
        type: 'failed',
        fieldErrors: { apiKey: 'providers.field.required' },
        error: { stage: 'save' },
      },
    ]);
  });

  it('maps a 409 on create to a name field error', async () => {
    const { events, common } = makeDeps({
      create: vi.fn(async () => {
        throw new ApiError('backend name already exists', 409);
      }),
    });
    await runSetup({ ...common, setup: anthropic, values: { apiKey: 'k', name: 'dup' } });
    expect(events.at(-1)).toMatchObject({
      type: 'failed',
      fieldErrors: { name: 'providers.field.name_taken' },
      error: { stage: 'save' },
    });
  });

  it('maps a 422 about the key to the key field', async () => {
    const { events, common } = makeDeps({
      create: vi.fn(async () => {
        throw new ApiError('api key and api key env are mutually exclusive', 422);
      }),
    });
    await runSetup({ ...common, setup: anthropic, values: { apiKey: 'k' } });
    expect(events.at(-1)).toMatchObject({ fieldErrors: { apiKeyEnv: 'providers.field.rejected' } });
  });

  it('keeps an unmappable save error as a form-level message', async () => {
    const { events, common } = makeDeps({
      create: vi.fn(async () => {
        throw new ApiError('database is locked', 500);
      }),
    });
    await runSetup({ ...common, setup: anthropic, values: { apiKey: 'k' } });
    expect(events.at(-1)).toMatchObject({
      fieldErrors: {},
      error: { stage: 'save', message: 'database is locked' },
    });
  });

  it('dispatches nothing once cancelled', async () => {
    const { events, deps, common } = makeDeps();
    let cancelled = false;
    deps.create = vi.fn(async () => {
      cancelled = true;
      return conn();
    });
    await runSetup({
      ...common,
      isCancelled: () => cancelled,
      setup: anthropic,
      values: { apiKey: 'k' },
    });
    expect(types(events)).toEqual(['saving']);
    expect(deps.check).not.toHaveBeenCalled();
  });
});

describe('verifyConnection', () => {
  it('re-verifies an existing connection without saving (retry)', async () => {
    const { deps, events, common } = makeDeps();
    await verifyConnection({ ...common, connection: conn() });
    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.patch).not.toHaveBeenCalled();
    expect(types(events)).toEqual(['verifying', 'success']);
  });
});
