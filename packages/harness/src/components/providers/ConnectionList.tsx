import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCheckConnection } from '../../hooks/useConnections';
import { getCloudProviderSetup, isCloudProviderType } from '../../lib/providerCatalog';
import type { Connection } from '../../lib/types';
import { ConnectionDeleteConfirm } from './ConnectionDeleteConfirm';
import { ConnectionRecovery } from './ConnectionRecovery';
import { ConnectionRename } from './ConnectionRename';
import { ConnectionRow } from './ConnectionRow';
import { ProviderSetupForm } from './ProviderSetupForm';

type Mode = { id: string; kind: 'edit' | 'rename' | 'delete' };

type Props = {
  connections: Connection[];
  /** Called when an edited connection was saved and verified. */
  onVerified?: (connection: Connection) => void;
};

/** Connections of one provider: status, actions, inline edit / rename / delete, recovery. */
export function ConnectionList({ connections, onVerified }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode | null>(null);
  const check = useCheckConnection();
  const close = () => setMode(null);

  return (
    <div className="flex flex-col gap-3" role="list" aria-label={t('connections.list_label')}>
      {connections.map(connection => {
        const setup = isCloudProviderType(connection.providerType)
          ? getCloudProviderSetup(connection.providerType)
          : undefined;
        const supported = !!setup;
        const providerTitle = setup ? t(setup.nameKey ?? setup.titleKey) : connection.providerType;
        const active = mode?.id === connection.id ? mode.kind : null;
        const checking = check.isPending && check.variables === connection.id;
        const edit = () => setMode({ id: connection.id, kind: 'edit' });

        return (
          <div key={connection.id} role="listitem" className="flex flex-col gap-2">
            <ConnectionRow
              connection={connection}
              checking={checking}
              onCheck={() => check.mutate(connection.id)}
              onEdit={edit}
              onRename={() => setMode({ id: connection.id, kind: 'rename' })}
              onDelete={() => setMode({ id: connection.id, kind: 'delete' })}
            />
            {active === 'rename' && <ConnectionRename connection={connection} onDone={close} />}
            {active === 'delete' && (
              <ConnectionDeleteConfirm connection={connection} onDone={close} />
            )}
            {active === 'edit' && setup && (
              <ProviderSetupForm
                setup={setup}
                connection={connection}
                onVerified={saved => {
                  close();
                  onVerified?.(saved);
                }}
                onCancel={close}
              />
            )}
            {active === null && (
              <ConnectionRecovery
                connection={connection}
                providerTitle={providerTitle}
                retrying={checking}
                onRetry={() => check.mutate(connection.id)}
                onConfigure={supported ? edit : undefined}
                onReplaceKey={supported ? edit : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
