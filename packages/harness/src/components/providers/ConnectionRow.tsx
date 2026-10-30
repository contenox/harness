import { IconButton, SettingsGroup, SettingsRow, StatusDot } from '@contenox/ui';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { connectionStatus } from '../../lib/connectionStatus';
import type { Connection } from '../../lib/types';
import { ConnectionMenu } from './ConnectionMenu';

export type ConnectionRowProps = {
  connection: Connection;
  onCheck: () => void;
  /** A check requested from this row is running. */
  checking?: boolean;
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/** One connection: name, address, status, and its row actions (check, edit, rename, delete). */
export function ConnectionRow({
  connection,
  onCheck,
  checking,
  onEdit,
  onRename,
  onDelete,
}: ConnectionRowProps) {
  const { t } = useTranslation();
  const status = connectionStatus(connection);
  const busy = checking || status.statusDot === 'checking';

  return (
    <SettingsGroup>
      <SettingsRow
        title={connection.name}
        description={connection.baseUrl || undefined}
        trailing={
          <>
            <StatusDot status={status.statusDot} label={t(status.summaryKey)} />
            <IconButton
              label={t('connections.check')}
              size="xs"
              disabled={busy}
              onClick={onCheck}>
              <RefreshCw className={busy ? 'size-3.5 animate-spin' : 'size-3.5'} aria-hidden />
            </IconButton>
            <ConnectionMenu
              name={connection.name}
              onEdit={onEdit}
              onRename={onRename}
              onDelete={onDelete}
            />
          </>
        }
      />
    </SettingsGroup>
  );
}
