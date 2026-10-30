import type { TranslationKey } from '../i18n';
import { connectionStatus } from './connectionStatus';
import type { Connection } from './types';

export type RecoveryAction = 'retry' | 'configure' | 'replaceKey' | 'signIn' | 'chooseModel';
export type RecoveryTone = 'error' | 'warning' | 'info';

export type RecoveryContext = {
  providerTitle: string;
  baseUrl?: string;
  connectionName: string;
};

export type Recovery = {
  tone: RecoveryTone;
  titleKey: TranslationKey;
  textKey: TranslationKey;
  /** Interpolation values for the title and text. */
  values: { provider: string; connection: string; address: string };
  actions: RecoveryAction[];
};

/** "http://127.0.0.1:11434/api" -> "127.0.0.1:11434"; non-URLs (e.g. an AWS region) pass through. */
export function displayAddress(baseUrl: string | undefined): string {
  const raw = (baseUrl ?? '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).host || raw;
  } catch {
    return raw;
  }
}

/**
 * Maps a runtime error code to what the user sees and can do. Unknown or missing codes get a
 * generic message; the raw runtime text belongs under technical details, never in the text.
 */
export function recoveryFor(errorCode: string | undefined, ctx: RecoveryContext): Recovery {
  const address = displayAddress(ctx.baseUrl);
  const values = { provider: ctx.providerTitle, connection: ctx.connectionName, address };

  switch (errorCode) {
    case 'unreachable':
      return {
        tone: 'error',
        titleKey: 'recovery.unreachable.title',
        textKey: address ? 'recovery.unreachable.text' : 'recovery.unreachable.text_no_address',
        values,
        actions: ['retry', 'configure'],
      };
    case 'unauthorized':
      return {
        tone: 'error',
        titleKey: 'recovery.unauthorized.title',
        textKey: 'recovery.unauthorized.text',
        values,
        actions: ['replaceKey', 'retry'],
      };
    case 'login_required':
      return {
        tone: 'warning',
        titleKey: 'recovery.login_required.title',
        textKey: 'recovery.login_required.text',
        values,
        actions: ['signIn'],
      };
    case 'no_models':
      return {
        tone: 'warning',
        titleKey: 'recovery.no_models.title',
        textKey: 'recovery.no_models.text',
        values,
        actions: ['retry', 'configure'],
      };
    case 'model_unavailable':
      return {
        tone: 'warning',
        titleKey: 'recovery.model_unavailable.title',
        textKey: 'recovery.model_unavailable.text',
        values,
        actions: ['chooseModel', 'retry'],
      };
    case 'misconfigured':
      return {
        tone: 'error',
        titleKey: 'recovery.misconfigured.title',
        textKey: 'recovery.misconfigured.text',
        values,
        actions: ['configure'],
      };
    default:
      return {
        tone: 'error',
        titleKey: 'recovery.generic.title',
        textKey: 'recovery.generic.text',
        values,
        actions: ['retry', 'configure'],
      };
  }
}

export const RECOVERY_ACTION_LABEL: Record<RecoveryAction, TranslationKey> = {
  retry: 'recovery.retry',
  configure: 'recovery.configure',
  replaceKey: 'recovery.replace_key',
  signIn: 'recovery.sign_in',
  chooseModel: 'recovery.choose_model',
};

/** Whether a connection should show a recovery card (needs the user, and is not mid-check). */
export function needsRecovery(connection: Connection): boolean {
  return connectionStatus(connection).attention;
}

/** The code recovery is chosen by: the runtime's code, else one inferred from state. */
export function recoveryCodeOf(connection: Connection): string | undefined {
  if (connection.errorCode) return connection.errorCode;
  if (connection.authState === 'login_required' || connection.authState === 'refresh_required') {
    return 'login_required';
  }
  if (connection.configState !== 'configured') return 'misconfigured';
  return undefined;
}
