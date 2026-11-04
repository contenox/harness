import { Button, InlineNotice } from '@contenox/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateConnection } from '../../hooks/useConnections';
import { getCloudProviderSetup, signInAccountName } from '../../lib/providerCatalog';
import type { CloudProviderType, Connection } from '../../lib/types';
import { SignInConnection } from './SignInConnection';

type Props = {
  provider: CloudProviderType;
  connections: Connection[];
  onConnected?: (connection: Connection) => void;
};

export function SignInSection({ provider, connections, onConnected }: Props) {
  const { t } = useTranslation();
  const create = useCreateConnection(provider);
  const [freshId, setFreshId] = useState<string | null>(null);
  const name = signInAccountName(t, provider);
  const unofficial = getCloudProviderSetup(provider).unofficial;

  return (
    <div className="flex flex-col gap-3">
      {unofficial && (
        <InlineNotice variant="warning">{t('connections.sign_in.unofficial')}</InlineNotice>
      )}
      {connections.map(connection => (
        <SignInConnection
          key={connection.id}
          connection={connection}
          autoStart={connection.id === freshId}
          onSignedIn={() => onConnected?.(connection)}
        />
      ))}
      {create.error && (
        <InlineNotice variant="error" role="alert">
          {create.error.message}
        </InlineNotice>
      )}
      <div>
        <Button
          type="button"
          variant={connections.length === 0 ? 'primary' : 'text'}
          size="sm"
          isLoading={create.isPending}
          onClick={() => create.mutate({}, { onSuccess: created => setFreshId(created.id) })}>
          {connections.length === 0 ? (
            t('connections.sign_in.sign_in', { name })
          ) : (
            <>
              <Plus className="size-3.5" aria-hidden />
              {t('connections.sign_in.add', { name })}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
