import type { StatusDotStatus } from '@contenox/ui';
import type { TranslationKey } from '../i18n';
import type { Connection, ConnectionConfigState, ConnectionHealth } from './types';

export type AuthenticationView =
  | 'not_required'
  | 'authenticated'
  | 'required'
  | 'expired'
  | 'pending';

export type ConnectionStatusView = {
  configuration: ConnectionConfigState;
  authentication: AuthenticationView;
  health: ConnectionHealth;
  /** The user has to do something (configure, sign in, fix the key or the service). */
  attention: boolean;
  summaryKey: TranslationKey;
  statusDot: StatusDotStatus;
};

function authenticationOf(connection: Connection): AuthenticationView {
  switch (connection.authState) {
    case 'authenticated':
      return 'authenticated';
    case 'login_required':
      return 'required';
    case 'refresh_required':
      return 'expired';
    case 'login_pending':
      return 'pending';
    default:
      return 'not_required';
  }
}

const UNAVAILABLE_SUMMARY: Record<string, TranslationKey> = {
  unauthorized: 'connections.status.unauthorized',
  unreachable: 'connections.status.unreachable',
  no_models: 'connections.status.no_models',
  model_unavailable: 'connections.status.model_unavailable',
  misconfigured: 'connections.status.invalid',
};

/**
 * Configuration, authentication and health are kept apart; the summary is the single line a
 * row shows. Precedence: in-progress work, then configuration, then sign-in, then health.
 */
export function connectionStatus(connection: Connection): ConnectionStatusView {
  const authentication = authenticationOf(connection);
  const base = {
    configuration: connection.configState,
    authentication,
    health: connection.health,
  };

  if (connection.health === 'checking') {
    return {
      ...base,
      attention: false,
      summaryKey: 'connections.status.checking',
      statusDot: 'checking',
    };
  }
  if (authentication === 'pending') {
    return {
      ...base,
      attention: false,
      summaryKey: 'connections.status.login_pending',
      statusDot: 'checking',
    };
  }
  if (connection.configState === 'missing') {
    return {
      ...base,
      attention: true,
      summaryKey: 'connections.status.not_configured',
      statusDot: 'unknown',
    };
  }
  if (connection.configState === 'invalid') {
    return {
      ...base,
      attention: true,
      summaryKey: 'connections.status.invalid',
      statusDot: 'unavailable',
    };
  }
  if (
    authentication === 'required' ||
    authentication === 'expired' ||
    connection.errorCode === 'login_required'
  ) {
    return {
      ...base,
      attention: true,
      summaryKey:
        authentication === 'expired'
          ? 'connections.status.login_expired'
          : 'connections.status.login_required',
      statusDot: 'attention',
    };
  }
  if (connection.health === 'unavailable' || connection.errorCode) {
    return {
      ...base,
      attention: true,
      summaryKey:
        UNAVAILABLE_SUMMARY[connection.errorCode ?? ''] ?? 'connections.status.unavailable',
      statusDot: 'unavailable',
    };
  }
  if (connection.health === 'available') {
    return {
      ...base,
      attention: false,
      summaryKey: 'connections.status.available',
      statusDot: 'available',
    };
  }
  return {
    ...base,
    attention: false,
    summaryKey: 'connections.status.unknown',
    statusDot: 'unknown',
  };
}

/** True while the runtime is still working on the connection (poll the list until false). */
export function isConnectionBusy(connection: Connection): boolean {
  return connection.health === 'checking' || connection.authState === 'login_pending';
}
