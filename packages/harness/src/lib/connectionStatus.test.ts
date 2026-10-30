import { describe, expect, it } from 'vitest';
import { connectionStatus, isConnectionBusy } from './connectionStatus';
import type { Connection } from './types';

const base: Connection = {
  id: 'c1',
  name: 'openai',
  providerType: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  configState: 'configured',
  authState: 'not_required',
  health: 'available',
  secretSource: 'literal',
  secretConfigured: true,
  secretPresent: true,
  modelCount: 3,
};
const make = (patch: Partial<Connection>): Connection => ({ ...base, ...patch });

describe('connectionStatus', () => {
  it('shows an available connection', () => {
    expect(connectionStatus(base)).toMatchObject({
      statusDot: 'available',
      attention: false,
      summaryKey: 'connections.status.available',
      configuration: 'configured',
      authentication: 'not_required',
      health: 'available',
    });
  });

  it('shows checking regardless of other state', () => {
    const s = connectionStatus(make({ health: 'checking', errorCode: 'unreachable' }));
    expect(s.statusDot).toBe('checking');
    expect(s.attention).toBe(false);
  });

  it('treats a pending device login as in progress', () => {
    const s = connectionStatus(make({ authState: 'login_pending', health: 'unavailable' }));
    expect(s).toMatchObject({ statusDot: 'checking', attention: false, authentication: 'pending' });
  });

  it('asks for attention when sign-in is required or expired', () => {
    expect(
      connectionStatus(make({ authState: 'login_required', health: 'unavailable' })),
    ).toMatchObject({
      statusDot: 'attention',
      attention: true,
      summaryKey: 'connections.status.login_required',
      authentication: 'required',
    });
    expect(connectionStatus(make({ authState: 'refresh_required' }))).toMatchObject({
      statusDot: 'attention',
      summaryKey: 'connections.status.login_expired',
      authentication: 'expired',
    });
  });

  it('classifies a login_required error code even if authState lags', () => {
    expect(
      connectionStatus(make({ health: 'unavailable', errorCode: 'login_required' })).statusDot,
    ).toBe('attention');
  });

  it('maps error codes to unavailable summaries', () => {
    expect(
      connectionStatus(make({ health: 'unavailable', errorCode: 'unauthorized' })),
    ).toMatchObject({
      statusDot: 'unavailable',
      attention: true,
      summaryKey: 'connections.status.unauthorized',
    });
    expect(
      connectionStatus(make({ health: 'unavailable', errorCode: 'unreachable' })).summaryKey,
    ).toBe('connections.status.unreachable');
    expect(
      connectionStatus(make({ health: 'unavailable', errorCode: 'no_models' })).summaryKey,
    ).toBe('connections.status.no_models');
    expect(connectionStatus(make({ health: 'unavailable' })).summaryKey).toBe(
      'connections.status.unavailable',
    );
    expect(
      connectionStatus(make({ health: 'unavailable', errorCode: 'weird' })).summaryKey,
    ).toBe('connections.status.unavailable');
  });

  it('shows a missing configuration as unknown that needs attention', () => {
    expect(connectionStatus(make({ configState: 'missing', health: 'unknown' }))).toMatchObject({
      statusDot: 'unknown',
      attention: true,
      summaryKey: 'connections.status.not_configured',
    });
  });

  it('shows an invalid configuration as unavailable', () => {
    expect(connectionStatus(make({ configState: 'invalid' }))).toMatchObject({
      statusDot: 'unavailable',
      attention: true,
      summaryKey: 'connections.status.invalid',
    });
  });

  it('shows configured but never checked as unknown without attention', () => {
    expect(connectionStatus(make({ health: 'unknown' }))).toMatchObject({
      statusDot: 'unknown',
      attention: false,
    });
  });
});

describe('isConnectionBusy', () => {
  it('is true while checking or logging in', () => {
    expect(isConnectionBusy(make({ health: 'checking' }))).toBe(true);
    expect(isConnectionBusy(make({ authState: 'login_pending' }))).toBe(true);
    expect(isConnectionBusy(base)).toBe(false);
  });
});
