import { describe, expect, it } from 'vitest';
import { displayAddress, needsRecovery, recoveryCodeOf, recoveryFor } from './backendErrors';
import type { Connection } from './types';

const ctx = {
  providerTitle: 'Ollama',
  connectionName: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
};

describe('displayAddress', () => {
  it('shows host and port without scheme or path', () => {
    expect(displayAddress('http://127.0.0.1:11434/api')).toBe('127.0.0.1:11434');
    expect(displayAddress('https://ollama.com/api')).toBe('ollama.com');
  });
  it('passes non-URLs through and handles empty', () => {
    expect(displayAddress('us-east-1')).toBe('us-east-1');
    expect(displayAddress(undefined)).toBe('');
    expect(displayAddress('  ')).toBe('');
  });
});

describe('recoveryFor', () => {
  it('maps an unreachable service with the address in the values', () => {
    const r = recoveryFor('unreachable', ctx);
    expect(r).toMatchObject({
      tone: 'error',
      titleKey: 'recovery.unreachable.title',
      textKey: 'recovery.unreachable.text',
      actions: ['retry', 'configure'],
      values: { provider: 'Ollama', connection: 'ollama', address: '127.0.0.1:11434' },
    });
  });

  it('uses the address-less text when there is no base URL', () => {
    expect(recoveryFor('unreachable', { ...ctx, baseUrl: undefined }).textKey).toBe(
      'recovery.unreachable.text_no_address',
    );
  });

  it('offers key replacement for an unauthorized key', () => {
    expect(recoveryFor('unauthorized', ctx)).toMatchObject({
      tone: 'error',
      actions: ['replaceKey', 'retry'],
    });
  });

  it('offers sign-in when login is required', () => {
    expect(recoveryFor('login_required', ctx)).toMatchObject({
      tone: 'warning',
      actions: ['signIn'],
    });
  });

  it('offers retry and configure when no models are found', () => {
    expect(recoveryFor('no_models', ctx).actions).toEqual(['retry', 'configure']);
  });

  it('offers choosing another model when the default model is gone', () => {
    expect(recoveryFor('model_unavailable', ctx)).toMatchObject({
      tone: 'warning',
      actions: ['chooseModel', 'retry'],
    });
  });

  it('sends a misconfigured connection straight to configuration', () => {
    expect(recoveryFor('misconfigured', ctx).actions).toEqual(['configure']);
  });

  it('falls back to a generic message for unknown or missing codes', () => {
    for (const code of [undefined, '', 'something_new']) {
      expect(recoveryFor(code, ctx)).toMatchObject({
        tone: 'error',
        titleKey: 'recovery.generic.title',
        textKey: 'recovery.generic.text',
        actions: ['retry', 'configure'],
      });
    }
  });

  it('keeps raw runtime text out of the result', () => {
    const r = recoveryFor('weird', ctx);
    expect(JSON.stringify(r)).not.toContain('dial tcp');
  });
});

const baseConnection: Connection = {
  id: 'c1',
  name: 'ollama',
  providerType: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  configState: 'configured',
  authState: 'not_required',
  health: 'available',
  secretSource: 'none',
  secretConfigured: false,
  secretPresent: false,
  modelCount: 2,
};

describe('recoveryCodeOf / needsRecovery', () => {
  it('prefers the runtime code', () => {
    expect(recoveryCodeOf({ ...baseConnection, errorCode: 'unreachable' })).toBe('unreachable');
  });
  it('infers login_required and misconfigured from state', () => {
    expect(recoveryCodeOf({ ...baseConnection, authState: 'refresh_required' })).toBe(
      'login_required',
    );
    expect(recoveryCodeOf({ ...baseConnection, configState: 'missing' })).toBe('misconfigured');
    expect(recoveryCodeOf(baseConnection)).toBeUndefined();
  });
  it('shows recovery only for connections that need the user', () => {
    expect(needsRecovery(baseConnection)).toBe(false);
    expect(needsRecovery({ ...baseConnection, health: 'checking', errorCode: 'unreachable' })).toBe(
      false,
    );
    expect(needsRecovery({ ...baseConnection, health: 'unavailable', errorCode: 'unreachable' })).toBe(
      true,
    );
  });
});
