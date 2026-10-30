import { Button } from '@contenox/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CloudProviderSetup } from '../../lib/providerCatalog';
import type { ProviderSetupValues } from '../../lib/providerSetupValues';
import type { Connection } from '../../lib/types';
import { ConnectionList } from './ConnectionList';
import { ProviderSetupForm } from './ProviderSetupForm';

type Props = {
  setup: CloudProviderSetup;
  connections: Connection[];
  values: ProviderSetupValues;
  onValuesChange: (values: ProviderSetupValues) => void;
  /** A connection was saved and verified: the draft can go. */
  onConnected: (connection: Connection) => void;
};

/**
 * Body of an expanded provider row: the setup form when there is nothing connected (or a new
 * connection is being added), otherwise the existing connections with "add another".
 */
export function ProviderBody({ setup, connections, values, onValuesChange, onConnected }: Props) {
  const { t } = useTranslation();
  // Stays open through a failed first attempt so its error is not swapped for the list.
  const [formOpen, setFormOpen] = useState(connections.length === 0);

  if (formOpen || connections.length === 0) {
    return (
      <ProviderSetupForm
        setup={setup}
        values={values}
        onValuesChange={onValuesChange}
        onVerified={connection => {
          setFormOpen(false);
          onConnected(connection);
        }}
        onCancel={connections.length > 0 ? () => setFormOpen(false) : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ConnectionList connections={connections} onVerified={onConnected} />
      <div>
        <Button type="button" variant="text" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" aria-hidden />
          {t('providers.add_connection')}
        </Button>
      </div>
    </div>
  );
}
