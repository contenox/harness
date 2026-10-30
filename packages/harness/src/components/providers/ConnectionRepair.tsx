import { Dialog } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCheckConnection, useConnections } from '../../hooks/useConnections';
import { withFallbackCode } from '../../lib/chatRecovery';
import { getCloudProviderSetup, isCloudProviderType } from '../../lib/providerCatalog';
import type { Connection } from '../../lib/types';
import { ChatGptConnection } from './ChatGptConnection';
import { ConnectionRecovery } from './ConnectionRecovery';
import { ProviderSetupForm } from './ProviderSetupForm';

type Dialogs = 'configure' | 'signIn' | null;

export type ConnectionRepairProps = {
  connection: Connection;
  /** Show the card even when the connection looks healthy (a failed chat turn). */
  force?: boolean;
  /** Error code to use when the connection carries none. */
  fallbackCode?: string;
  /** Raw failure text for "Technical details". */
  details?: string;
  /** "Modell wählen": the caller decides where the default model is chosen. */
  onChooseModel?: () => void;
  /** The connection was re-checked, saved or signed in again: the caller may retry. */
  onResolved?: () => void;
  className?: string;
};

/**
 * A recovery card that can fix things where it stands: "Erneut prüfen" runs the connection
 * check, "Konfigurieren" / "Schlüssel ersetzen" open the setup form for that connection in a
 * dialog, "Bei ChatGPT anmelden" opens the device-code steps. Never leaves the current page.
 */
export function ConnectionRepair({
  connection,
  force,
  fallbackCode,
  details,
  onChooseModel,
  onResolved,
  className,
}: ConnectionRepairProps) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<Dialogs>(null);
  const check = useCheckConnection();
  const { data } = useConnections();
  // The list entry has the real secret/auth state; a raw backend or a stale copy may not.
  const live = data?.find(c => c.id === connection.id) ?? connection;

  const setup = isCloudProviderType(connection.providerType)
    ? getCloudProviderSetup(connection.providerType)
    : undefined;
  const configurable = !!setup && !setup.loginRequired;
  const canSignIn = !!setup?.loginRequired;
  const providerTitle = setup ? t(setup.nameKey ?? setup.titleKey) : connection.providerType;
  const close = () => setDialog(null);
  const open = () => setDialog('configure');
  const resolved = () => {
    close();
    onResolved?.();
  };

  return (
    <>
      <ConnectionRecovery
        className={className}
        connection={withFallbackCode(connection, fallbackCode)}
        providerTitle={providerTitle}
        force={force}
        details={details}
        retrying={check.isPending}
        onRetry={() => check.mutate(connection.id, { onSuccess: () => onResolved?.() })}
        onConfigure={configurable ? open : undefined}
        onReplaceKey={configurable ? open : undefined}
        onSignIn={canSignIn ? () => setDialog('signIn') : undefined}
        onChooseModel={onChooseModel}
      />
      <Dialog
        open={dialog === 'configure' && configurable}
        onClose={close}
        title={t('recovery.dialog_configure', { name: connection.name })}
        closeLabel={t('common.close')}
        className="w-[min(32rem,calc(100vw-2rem))]">
        {setup && (
          <ProviderSetupForm
            setup={setup}
            connection={live}
            onVerified={resolved}
            onCancel={close}
          />
        )}
      </Dialog>
      <Dialog
        open={dialog === 'signIn' && canSignIn}
        onClose={close}
        title={t('recovery.dialog_sign_in')}
        closeLabel={t('common.close')}
        className="w-[min(32rem,calc(100vw-2rem))]">
        <ChatGptConnection
          connection={live}
          autoStart
          onSignedIn={() => check.mutate(connection.id, { onSettled: resolved })}
        />
      </Dialog>
    </>
  );
}
