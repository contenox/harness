import { describe, expect, it, vi } from 'vitest';
import { connectionForSignIn, verifyProviderSignIn } from './signInVerify';
import type { Connection } from './types';

const conn = (id: string, name: string, providerType: string): Connection => ({
  id,
  name,
  providerType,
  baseUrl: '',
  configState: 'configured',
  authState: 'authenticated',
  health: 'unknown',
  secretSource: 'none',
  secretConfigured: false,
  secretPresent: false,
  modelCount: 0,
});

describe('connectionForSignIn', () => {
  it('prefers the connection named after the type', () => {
    const list = [
      conn('b', 'openai-codex-2', 'openai-codex'),
      conn('a', 'openai-codex', 'openai-codex'),
    ];
    expect(connectionForSignIn(list, 'openai-codex')?.id).toBe('a');
  });
  it('falls back to the first of the type and ignores other types', () => {
    const list = [conn('x', 'ollama', 'ollama'), conn('b', 'work', 'openai-codex')];
    expect(connectionForSignIn(list, 'openai-codex')?.id).toBe('b');
    expect(connectionForSignIn(list, 'gemini')).toBeUndefined();
  });
});

describe('verifyProviderSignIn', () => {
  it('checks the connection and returns the refreshed one', async () => {
    const checked = { ...conn('a', 'openai-codex', 'openai-codex'), health: 'available' as const };
    const check = vi.fn(async () => checked);
    const list = vi.fn(async () => [conn('a', 'openai-codex', 'openai-codex')]);
    expect(await verifyProviderSignIn({ list, check }, 'openai-codex')).toBe(checked);
    expect(check).toHaveBeenCalledWith('a');
  });
  it('resolves undefined without a connection and does not check', async () => {
    const check = vi.fn();
    expect(
      await verifyProviderSignIn({ list: async () => [], check }, 'openai-codex'),
    ).toBeUndefined();
    expect(check).not.toHaveBeenCalled();
  });
  it('still resolves with the known connection when the check fails', async () => {
    const known = conn('a', 'openai-codex', 'openai-codex');
    const result = await verifyProviderSignIn(
      { list: async () => [known], check: async () => Promise.reject(new Error('boom')) },
      'openai-codex',
    );
    expect(result).toBe(known);
  });
  it('resolves undefined when listing fails', async () => {
    const list = async () => Promise.reject(new Error('down'));
    expect(await verifyProviderSignIn({ list, check: vi.fn() }, 'openai-codex')).toBeUndefined();
  });
});
