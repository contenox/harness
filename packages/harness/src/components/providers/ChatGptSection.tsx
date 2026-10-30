import { Button, InlineNotice } from '@contenox/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateConnection } from '../../hooks/useConnections';
import type { Connection } from '../../lib/types';
import { ChatGptConnection } from './ChatGptConnection';

type Props = {
  connections: Connection[];
  onConnected?: (connection: Connection) => void;
};

/** Body of the ChatGPT row: its connections, and a way to add an account and sign in. */
export function ChatGptSection({ connections, onConnected }: Props) {
  const { t } = useTranslation();
  const create = useCreateConnection('openai-codex');
  const [freshId, setFreshId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {connections.map(connection => (
        <ChatGptConnection
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
            t('connections.chatgpt.sign_in')
          ) : (
            <>
              <Plus className="size-3.5" aria-hidden />
              {t('connections.chatgpt.add')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
