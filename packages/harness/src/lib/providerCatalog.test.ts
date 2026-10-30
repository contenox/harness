import { describe, expect, it } from 'vitest';
import {
  CLOUD_PROVIDER_SETUPS,
  fieldsFor,
  getCloudProviderSetup,
  ONBOARDING_PROVIDER_SETUPS,
  providersInGroup,
} from './providerCatalog';

describe('provider catalog', () => {
  it('offers the ChatGPT subscription as a device-login provider with no secret', () => {
    const codex = getCloudProviderSetup('openai-codex');
    expect(codex.provider).toBe('openai-codex');
    expect(codex.loginRequired).toBe(true);
    expect(codex.secretKind).toBe('none');
  });

  it('offers DeepSeek with an API key and its endpoint', () => {
    const deepseek = getCloudProviderSetup('deepseek');
    expect(deepseek.secretKind).toBe('api-key');
    expect(deepseek.defaultBaseUrl).toBe('https://api.deepseek.com');
  });

  it('lists both in the onboarding wizard', () => {
    const providers = ONBOARDING_PROVIDER_SETUPS.map(setup => setup.provider);
    expect(providers).toContain('openai-codex');
    expect(providers).toContain('deepseek');
  });
});

describe('provider groups and metadata', () => {
  const group = (g: 'recommended' | 'cloud' | 'local' | 'more') =>
    CLOUD_PROVIDER_SETUPS.filter(s => s.group === g).map(s => s.provider);

  it('groups providers for the list', () => {
    expect(group('recommended')).toEqual(
      expect.arrayContaining(['deepseek', 'anthropic', 'gemini']),
    );
    expect(group('cloud')).toEqual(['vertex-google', 'bedrock', 'vllm']);
    expect(group('local')).toEqual(['ollama']);
    expect(group('more').sort()).toEqual(
      ['openrouter', 'openai', 'mistral'].sort(),
    );
  });

  it('keeps ChatGPT out of the list groups', () => {
    const listed = (['recommended', 'cloud', 'local', 'more'] as const).flatMap(g =>
      providersInGroup(g).map(s => s.provider),
    );
    expect(listed).not.toContain('openai-codex');
    expect(listed).toHaveLength(10);
  });

  it('knows where to create a key', () => {
    expect(getCloudProviderSetup('anthropic').keyUrl).toBe(
      'https://console.anthropic.com/settings/keys',
    );
    expect(getCloudProviderSetup('openai').keyUrl).toBe('https://platform.openai.com/api-keys');
    expect(getCloudProviderSetup('ollama').keyUrl).toBe('https://ollama.com/settings/keys');
    for (const s of CLOUD_PROVIDER_SETUPS) {
      if (s.keyUrl) expect(s.keyUrl.startsWith('https://')).toBe(true);
    }
  });
});

describe('fieldsFor', () => {
  const ids = (fields: { id: string }[]) => fields.map(f => f.id);

  it('asks only for the key up front for a key provider', () => {
    const { primary, advanced } = fieldsFor(getCloudProviderSetup('anthropic'));
    expect(ids(primary)).toEqual(['apiKey']);
    expect(primary[0]).toMatchObject({ kind: 'secret', required: true });
    expect(ids(advanced)).toEqual(['baseUrl', 'apiKeyEnv']);
    expect(advanced.every(f => !f.required)).toBe(true);
    expect(advanced[1].placeholder).toBe('ANTHROPIC_API_KEY');
  });

  it('shows the prefilled address for Ollama and the cloud key under advanced', () => {
    const setup = getCloudProviderSetup('ollama');
    const { primary, advanced } = fieldsFor(setup);
    expect(ids(primary)).toEqual(['baseUrl']);
    expect(setup.defaultBaseUrl).toBe('http://127.0.0.1:11434');
    expect(ids(advanced)).toEqual(['apiKey', 'apiKeyEnv']);
  });

  it('puts the Vertex URL up front and the JSON under advanced', () => {
    const { primary, advanced } = fieldsFor(getCloudProviderSetup('vertex-google'));
    expect(ids(primary)).toEqual(['baseUrl']);
    expect(primary[0].kind).toBe('url');
    expect(advanced).toEqual([expect.objectContaining({ id: 'credentialsJson', kind: 'file' })]);
  });

  it('puts the Bedrock region up front and the JSON under advanced', () => {
    const { primary, advanced } = fieldsFor(getCloudProviderSetup('bedrock'));
    expect(ids(primary)).toEqual(['baseUrl']);
    expect(primary[0].kind).toBe('text');
    expect(ids(advanced)).toEqual(['credentialsJson']);
  });

  it('asks vLLM for the server address and keeps the key optional', () => {
    const setup = getCloudProviderSetup('vllm');
    const { primary, advanced } = fieldsFor(setup);
    expect(ids(primary)).toEqual(['baseUrl']);
    expect(setup.baseUrlPlaceholder).toBe('http://localhost:8000/v1');
    expect(ids(advanced)).toEqual(['apiKey', 'apiKeyEnv']);
  });

  it('has no fields for the ChatGPT login provider', () => {
    expect(fieldsFor(getCloudProviderSetup('openai-codex'))).toEqual({ primary: [], advanced: [] });
  });

  it('never marks an advanced field as required', () => {
    for (const s of CLOUD_PROVIDER_SETUPS) {
      expect(fieldsFor(s).advanced.some(f => f.required)).toBe(false);
    }
  });
});
