import { Button, InlineNotice } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useDeleteConnection } from '../../hooks/useConnections';
import type { Connection } from '../../lib/types';

type Props = {
  connection: Connection;
  onDone: () => void;
};

/** Inline confirmation before a connection (and its stored credentials) is removed. */
export function ConnectionDeleteConfirm({ connection, onDone }: Props) {
  const { t } = useTranslation();
  const remove = useDeleteConnection();

  return (
    <InlineNotice variant="warning" className="flex flex-col gap-3">
      <span>{t('connections.delete_confirm', { name: connection.name })}</span>
      {remove.error && <span role="alert">{remove.error.message}</span>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {t('connections.cancel')}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          isLoading={remove.isPending}
          onClick={() => remove.mutate(connection.id, { onSuccess: onDone })}>
          {t('connections.delete_confirm_action')}
        </Button>
      </div>
    </InlineNotice>
  );
}
