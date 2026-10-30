import { describe, expect, it } from 'vitest';
import {
  connectionForModelChoice,
  connectionFromBackend,
  fallbackCodeFor,
  isRecoverableFailure,
  pickAffectedConnection,
  withFallbackCode,
} from './chatRecovery';
import type { Backend, Connection, SetupStatus } from './types';

const conn = (over: Partial<Connection> & { id: string }): Connection => ({
  name: over.id,
  providerType: 'ollama',
  baseUrl: '',
  configState: 'configured',
  authState: 'not_required',
  health: 'available',
  secretSource: 'none',
  secretConfigured: false,
  secretPresent: false,
  modelCount: 1,
  ...over,
});

const status = (over: Partial<SetupStatus> = {}): SetupStatus => ({
  defaultModel: '',
  defaultProvider: '',
  defaultChain: '',
  hitlPolicyName: '',
  backendCount: 0,
  reachableBackendCount: 0,
  issues: [],
  backendChecks: [],
  ...over,
});

describe('fallbackCodeFor', () => {
  it('maps failure kinds and model setup issues', () => {
    expect(fallbackCodeFor('backend_unreachable')).toBe('unreachable');
    expect(fallbackCodeFor('model_unavailable')).toBe('model_unavailable');
    expect(fallbackCodeFor('generic')).toBeUndefined();
    expect(fallbackCodeFor('backend_unreachable', 'missing_default_model')).toBe(
      'model_unavailable',
    );
  });
  it('recovers only unreachable and model failures', () => {
    expect(isRecoverableFailure('backend_unreachable')).toBe(true);
    expect(isRecoverableFailure('workspace_required')).toBe(false);
  });
});

describe('withFallbackCode', () => {
  it('keeps the connection own code and fills in only when it has none', () => {
    const own = conn({ id: 'a', health: 'unavailable', errorCode: 'unauthorized' });
    expect(withFallbackCode(own, 'unreachable')).toBe(own);
    expect(withFallbackCode(conn({ id: 'b' }), 'model_unavailable').errorCode).toBe(
      'model_unavailable',
    );
  });
  it('derives login_required from the auth state before the fallback', () => {
    const c = conn({ id: 'c', authState: 'login_required' });
    expect(withFallbackCode(c, 'unreachable').errorCode).toBe('login_required');
  });
});

describe('pickAffectedConnection', () => {
  const ollama = conn({ id: 'o1', name: 'ollama', providerType: 'ollama' });
  const openai = conn({ id: 'a1', name: 'openai', providerType: 'openai' });
  const openai2 = conn({
    id: 'a2',
    name: 'openai-2',
    providerType: 'openai',
    health: 'unavailable',
    errorCode: 'unauthorized',
  });

  it('is undefined without connections', () => {
    expect(pickAffectedConnection([], status({ defaultProvider: 'openai' }))).toBeUndefined();
  });
  it('uses the backend flagged as default provider', () => {
    const s = status({
      defaultProvider: 'openai',
      backendChecks: [
        {
          id: 'a1',
          name: 'openai',
          type: 'openai',
          baseUrl: '',
          status: '',
          reachable: true,
          defaultProvider: true,
          modelCount: 1,
          chatModelCount: 1,
        },
      ],
    });
    expect(pickAffectedConnection([ollama, openai2, openai], s)).toBe(openai);
  });
  it('prefers the failing connection among those of the default provider type', () => {
    expect(pickAffectedConnection([openai, openai2], status({ defaultProvider: 'openai' }))).toBe(
      openai2,
    );
  });
  it('picks a connection named in the failure text', () => {
    expect(
      pickAffectedConnection(
        [ollama, openai],
        status({ defaultProvider: 'openai' }),
        'dial tcp: ollama refused',
      ),
    ).toBe(ollama);
  });
  it('without a default provider takes the only failing connection', () => {
    expect(pickAffectedConnection([ollama, openai2], status())).toBe(openai2);
    expect(pickAffectedConnection([ollama, openai], status())).toBeUndefined();
  });
});

describe('connectionFromBackend', () => {
  const backend: Backend = {
    id: 'b1',
    name: 'vllm',
    baseUrl: 'http://host:8000',
    type: 'vllm',
    models: ['m'],
    pulledModels: [],
    error: 'dial tcp refused',
    errorCode: 'unreachable',
  };
  it('carries the error and marks it unavailable', () => {
    expect(connectionFromBackend(backend)).toMatchObject({
      id: 'b1',
      providerType: 'vllm',
      health: 'unavailable',
      errorCode: 'unreachable',
      modelCount: 1,
    });
  });
  it('is not failing without an error', () => {
    expect(connectionFromBackend({ ...backend, error: '', errorCode: undefined }).health).toBe(
      'unknown',
    );
  });
  it('maps login_required to the auth state', () => {
    expect(connectionFromBackend({ ...backend, errorCode: 'login_required' }).authState).toBe(
      'login_required',
    );
  });
});

describe('connectionForModelChoice', () => {
  it('prefers an available connection, else the first, else nothing', () => {
    const down = conn({ id: 'd', health: 'unavailable' });
    const up = conn({ id: 'u' });
    expect(connectionForModelChoice([down, up])).toBe(up);
    expect(connectionForModelChoice([down])).toBe(down);
    expect(connectionForModelChoice([])).toBeUndefined();
  });
});
