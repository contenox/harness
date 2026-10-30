import { describe, expect, it } from 'vitest';
import {
  chatModelsFor,
  onlyDefaultsMissing,
  pickDefaultModel,
  planDefaultSelection,
} from './defaultModel';
import type { SetupBackendCheck, SetupStatus } from './types';

function backend(type: string, chatModels: string[]): SetupBackendCheck {
  return {
    id: type,
    name: type,
    type,
    baseUrl: '',
    status: 'ok',
    reachable: true,
    defaultProvider: false,
    modelCount: chatModels.length,
    chatModelCount: chatModels.length,
    chatModels,
  };
}

function status(checks: SetupBackendCheck[], issues: SetupStatus['issues'] = []): SetupStatus {
  return {
    defaultModel: '',
    defaultProvider: '',
    defaultChain: '',
    hitlPolicyName: '',
    backendCount: checks.length,
    reachableBackendCount: checks.length,
    issues,
    backendChecks: checks,
  };
}

describe('pickDefaultModel', () => {
  it('prefers gpt-5.4', () => {
    expect(pickDefaultModel(['gpt-5', 'gpt-5.4'])).toBe('gpt-5.4');
  });
  it('falls back to the first model', () => {
    expect(pickDefaultModel(['a', 'b'])).toBe('a');
  });
  it('returns null for an empty list', () => {
    expect(pickDefaultModel([])).toBeNull();
  });
});

describe('planDefaultSelection', () => {
  it('returns null while no models are visible', () => {
    expect(planDefaultSelection(status([backend('openai-codex', [])]), 'openai-codex')).toBeNull();
    expect(planDefaultSelection(undefined)).toBeNull();
  });
  it('prefers the hinted provider', () => {
    const s = status([backend('ollama', ['llama3']), backend('openai-codex', ['gpt-5.4'])]);
    expect(planDefaultSelection(s, 'openai-codex')).toEqual({
      provider: 'openai-codex',
      model: 'gpt-5.4',
    });
  });
  it('prefers the models of the backend that was just connected', () => {
    const first = { ...backend('openai', ['gpt-4o']), id: 'openai' };
    const second = { ...backend('openai', ['gpt-5.4', 'o3']), id: 'openai-2' };
    const s = status([first, second]);
    expect(planDefaultSelection(s, 'openai', 'openai-2')).toEqual({
      provider: 'openai',
      model: 'gpt-5.4',
    });
  });
  it('falls back to any backend with models', () => {
    const s = status([backend('openai-codex', []), backend('ollama', ['llama3'])]);
    expect(planDefaultSelection(s, 'openai-codex')).toEqual({ provider: 'ollama', model: 'llama3' });
  });
});

describe('chatModelsFor', () => {
  it('dedupes and filters by provider', () => {
    const s = status([backend('a', ['x', 'y']), backend('b', ['y', 'z'])]);
    expect(chatModelsFor(s, 'b')).toEqual(['y', 'z']);
    expect(chatModelsFor(s)).toEqual(['x', 'y', 'z']);
  });
});

describe('onlyDefaultsMissing', () => {
  const issue = (code: string) =>
    ({ code, severity: 'error', category: 'defaults', message: '' }) as SetupStatus['issues'][number];
  it('is true when only default keys are missing', () => {
    expect(
      onlyDefaultsMissing(status([backend('openai-codex', ['gpt-5.4'])], [issue('missing_default_model')])),
    ).toBe(true);
  });
  it('is false when no backend is reachable yet (fresh install)', () => {
    expect(onlyDefaultsMissing(status([], [issue('missing_default_model')]))).toBe(false);
  });
  it('is false with other errors or no errors', () => {
    expect(
      onlyDefaultsMissing(
        status([], [issue('missing_default_model'), issue('runtime_state_empty')]),
      ),
    ).toBe(false);
    expect(onlyDefaultsMissing(status([]))).toBe(false);
  });
});
