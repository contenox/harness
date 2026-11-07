import { Button, RecoveryCard } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import {
  RECOVERY_ACTION_LABEL,
  needsRecovery,
  recoveryCodeOf,
  recoveryFor,
  type RecoveryAction,
} from '../../lib/backendErrors';
import { redactProject } from '../../lib/displayUrl';
import { translateRuntimeText } from '../../lib/runtimeTexts';
import { signInAccountName } from '../../lib/providerCatalog';
import type { Connection } from '../../lib/types';

export type ConnectionRecoveryProps = {
  connection: Connection;
  providerTitle: string;
  /** Actions without a handler are not offered. */
  onRetry?: () => void;
  retrying?: boolean;
  onConfigure?: () => void;
  onReplaceKey?: () => void;
  onSignIn?: () => void;
  onChooseModel?: () => void;
  /** Show the card even when the connection looks healthy (e.g. a failed chat turn). */
  force?: boolean;
  /** Technical details to show instead of the connection's own error text. */
  details?: string;
  className?: string;
};

/**
 * One recovery card for a failing connection: a mapped title and text, the actions that make
 * sense for the error code, and the raw runtime text only under technical details.
 */
export function ConnectionRecovery({
  connection,
  providerTitle,
  onRetry,
  retrying,
  onConfigure,
  onReplaceKey,
  onSignIn,
  onChooseModel,
  force,
  details,
  className,
}: ConnectionRecoveryProps) {
  const { t } = useTranslation();
  if (!force && !needsRecovery(connection)) return null;

  const recovery = recoveryFor(recoveryCodeOf(connection), {
    providerTitle,
    baseUrl: connection.displayUrl || redactProject(connection.baseUrl),
    connectionName: connection.name,
  });

  const handlers: Record<RecoveryAction, (() => void) | undefined> = {
    retry: onRetry,
    configure: onConfigure,
    replaceKey: onReplaceKey,
    signIn: onSignIn,
    chooseModel: onChooseModel,
  };
  const actions = recovery.actions.filter(action => handlers[action]);
  const headline =
    connection.errorCode === 'misconfigured' && connection.error?.trim()
      ? connection.error.trim()
      : undefined;
  const technical = headline ? details || undefined : details || connection.error || undefined;

  return (
    <RecoveryCard
      className={className}
      tone={recovery.tone}
      title={t(recovery.titleKey, recovery.values)}
      details={technical ? redactProject(technical) : undefined}
      detailsLabel={t('recovery.details')}
      actions={
        actions.length > 0 ? (
          <>
            {actions.map((action, index) => (
              <Button
                key={action}
                type="button"
                variant={index === 0 ? 'primary' : 'outline'}
                size="sm"
                isLoading={action === 'retry' && retrying}
                onClick={handlers[action]}>
                {t(RECOVERY_ACTION_LABEL[action], { name: signInAccountName(t, connection.providerType) })}
              </Button>
            ))}
          </>
        ) : undefined
      }>
      {headline ? translateRuntimeText(redactProject(headline), t) : t(recovery.textKey, recovery.values)}
    </RecoveryCard>
  );
}
