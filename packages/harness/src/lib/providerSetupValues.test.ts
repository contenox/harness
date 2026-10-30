import { describe, expect, it } from 'vitest';
import { ApiError } from './fetch';
import { fieldsFor, getCloudProviderSetup } from './providerCatalog';
import {
  advancedNeedsAttention,
  buildConnectionPayload,
  initialValues,
  mapSetupError,
  validateSetupValues,
} from './providerSetupValues';

const anthropic = getCloudProviderSetup('anthropic');
const ollama = getCloudProviderSetup('ollama');
const vertex = getCloudProviderSetup('vertex-google');

describe('initialValues', () => {
  it('prefills the default address', () => {
    expect(initialValues(ollama).baseUrl).toBe('http://127.0.0.1:11434');
  });
  it('prefers the existing connection when editing, and never holds a secret', () => {
    const v = initialValues(anthropic, { baseUrl: 'https://proxy', apiKeyEnv: 'MY_KEY' });
    expect(v).toMatchObject({ baseUrl: 'https://proxy', apiKeyEnv: 'MY_KEY', apiKey: '' });
  });
});

describe('buildConnectionPayload', () => {
  it('trims and omits blanks', () => {
    expect(
      buildConnectionPayload({ name: ' ', apiKey: ' sk-1 ', apiKeyEnv: '', baseUrl: ' https://x ' }),
    ).toEqual({ apiKey: 'sk-1', baseUrl: 'https://x' });
  });
  it('sends JSON credentials as the secret', () => {
    expect(buildConnectionPayload({ credentialsJson: '{"a":1}', baseUrl: 'us-east-1' })).toEqual({
      apiKey: '{"a":1}',
      baseUrl: 'us-east-1',
    });
  });
  it('sends no secret when none was typed (an edit keeps the stored one)', () => {
    expect(buildConnectionPayload({ apiKey: '', baseUrl: 'https://x' })).toEqual({
      baseUrl: 'https://x',
    });
  });
});

describe('env variable name validation', () => {
  const check = (apiKeyEnv: string) =>
    validateSetupValues(anthropic, { apiKeyEnv }, { secretStored: false }).apiKeyEnv;
  it('accepts plain variable names', () => {
    for (const ok of ['ANTHROPIC_API_KEY', '_X1', 'my_key', 'K']) expect(check(ok)).toBeUndefined();
  });
  it('blocks things that look like keys', () => {
    for (const bad of ['sk-test123', 'sk-ant-abc', 'sk_live', 'AIzaSyAbc', 'gsk_abc', 'xai-abc', 'pk-1', 'sk-or-v1', 'has space', '1ABC', 'A'.repeat(65)]) {
      expect(check(bad)).toBe('cloud_providers.api_key_env_looks_like_key');
    }
  });
});

describe('validateSetupValues', () => {
  it('requires a key unless one is stored or an env var is given', () => {
    expect(validateSetupValues(anthropic, {}, { secretStored: false })).toEqual({
      apiKey: 'providers.field.required',
    });
    expect(validateSetupValues(anthropic, {}, { secretStored: true })).toEqual({});
    expect(validateSetupValues(anthropic, { apiKeyEnv: 'K' }, { secretStored: false })).toEqual({});
  });
  it('rejects a key together with an env var', () => {
    expect(
      validateSetupValues(anthropic, { apiKey: 'a', apiKeyEnv: 'B' }, { secretStored: false }),
    ).toEqual({ apiKeyEnv: 'cloud_providers.secret_source_error' });
  });
  it('requires the Ollama address but not a key', () => {
    expect(validateSetupValues(ollama, { baseUrl: ' ' }, { secretStored: false })).toEqual({
      baseUrl: 'providers.field.required',
    });
    expect(
      validateSetupValues(ollama, { baseUrl: 'http://x' }, { secretStored: false }),
    ).toEqual({});
  });
  it('requires the Vertex URL; the JSON is optional', () => {
    expect(validateSetupValues(vertex, {}, { secretStored: false })).toEqual({
      baseUrl: 'providers.field.required',
    });
  });
});

describe('mapSetupError', () => {
  it('maps 409 to a taken name', () => {
    expect(mapSetupError(new ApiError('exists', 409), anthropic).fieldErrors).toEqual({
      name: 'providers.field.name_taken',
    });
  });
  it('maps 422 by wording', () => {
    expect(mapSetupError(new ApiError('base url is required', 422), vertex).fieldErrors).toEqual({
      baseUrl: 'providers.field.rejected',
    });
    expect(mapSetupError(new ApiError('invalid name', 422), anthropic).fieldErrors).toEqual({
      name: 'providers.field.name_invalid',
    });
    expect(mapSetupError(new ApiError('api key is required', 422), anthropic).fieldErrors).toEqual(
      { apiKey: 'providers.field.rejected' },
    );
    expect(
      mapSetupError(new ApiError('credentials missing', 422), vertex).fieldErrors,
    ).toEqual({ credentialsJson: 'providers.field.rejected' });
  });
  it('keeps unknown failures as a message', () => {
    expect(mapSetupError(new ApiError('boom', 500), anthropic)).toEqual({
      fieldErrors: {},
      message: 'boom',
    });
    expect(mapSetupError(new ApiError('weird', 422), anthropic)).toEqual({
      fieldErrors: {},
      message: 'weird',
    });
  });
});

describe('advancedNeedsAttention', () => {
  const { advanced } = fieldsFor(anthropic);
  const defaults = initialValues(anthropic);

  it('stays closed for untouched defaults', () => {
    expect(advancedNeedsAttention(advanced, defaults, {}, defaults)).toBe(false);
  });
  it('opens for a customised value', () => {
    expect(
      advancedNeedsAttention(advanced, { ...defaults, apiKeyEnv: 'MY_KEY' }, {}, defaults),
    ).toBe(true);
    expect(
      advancedNeedsAttention(advanced, { ...defaults, baseUrl: 'https://proxy' }, {}, defaults),
    ).toBe(true);
  });
  it('opens for an error in an advanced field', () => {
    expect(
      advancedNeedsAttention(advanced, defaults, { baseUrl: 'providers.field.rejected' }, defaults),
    ).toBe(true);
  });
});
