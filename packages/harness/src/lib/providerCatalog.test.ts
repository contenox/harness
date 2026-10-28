import { describe, expect, it } from 'vitest';
import { getCloudProviderSetup, ONBOARDING_PROVIDER_SETUPS } from './providerCatalog';

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
