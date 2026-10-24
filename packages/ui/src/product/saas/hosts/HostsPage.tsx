import { Button, Dialog, P, Page, Small } from '@contenox/ui';
import { useState } from 'react';
import { TextField } from '@contenox/ui';
import { HostStateBadge } from '../HostStateBadge';
import { ListCard } from '@contenox/ui';
import { ListSkeleton, ScreenError } from '../ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { useProductPorts } from '../../ports';
import type { Instance } from '../../lib/api/types';
import { hostDetail } from '../../lib/hostState';
import { FirstMachineCard } from './FirstMachineCard';
import { PairingKeyPanel } from './PairingKeyPanel';

export default function HostsPage() {
  const { useAuth, useHosts } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const { data, isPending, error, refetch, isFetching } = useHosts(accountID);

  return (
    <Page header={<ScreenHeader title="Hosts" />}>
      <ScreenBody width="band">
        <PairingKeyPanel accountID={accountID} />

        {isPending && <ListSkeleton label="Loading your machines" />}
        {error && (
          <ScreenError error={error} onRetry={() => void refetch()} retrying={isFetching} />
        )}

        {data?.length === 0 && <FirstMachineCard />}
        {data?.map(host => (
          <HostCard key={host.id} host={host} accountID={accountID} />
        ))}
      </ScreenBody>
    </Page>
  );
}


function HostCard({ host, accountID }: { host: Instance; accountID: string }) {
  const { useRevokeHost } = useProductPorts();
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const revoke = useRevokeHost(accountID);
  const revoked = host.revoked_at !== null;

  return (
    <ListCard
      title={host.name}
      meta={<Small>{hostDetail(host)}</Small>}
      trailing={<HostStateBadge host={host} />}>
      {!revoked && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setRenaming(true)}>
            Rename
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            Revoke
          </Button>
        </div>
      )}

      {revoke.error && (
        <ScreenError
          error={revoke.error}
          onRetry={() => revoke.mutate(host.id)}
          retrying={revoke.isPending}
        />
      )}

      <RenameDialog
        host={host}
        accountID={accountID}
        open={renaming}
        onClose={() => setRenaming(false)}
      />


      <Dialog open={confirming} onClose={() => setConfirming(false)} title={`Revoke ${host.name}?`}>
        <div className="flex flex-col gap-4">
          <P className="text-sm">
            Its credential stops working immediately and, if it is connected right now, the
            connection is dropped. The slot is freed, so you can pair a replacement. Pairing this
            machine again means running <code className="font-mono">/pair</code> on it with a new
            key.
          </P>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              variant="danger"
              className="flex-1"
              isLoading={revoke.isPending}
              onClick={() => revoke.mutate(host.id, { onSuccess: () => setConfirming(false) })}>
              Revoke
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </div>
        </div>
      </Dialog>
    </ListCard>
  );
}


function RenameDialog({
  host,
  accountID,
  open,
  onClose,
}: {
  host: Instance;
  accountID: string;
  open: boolean;
  onClose: () => void;
}) {
  const { useRenameHost } = useProductPorts();
  const rename = useRenameHost(accountID);
  const [name, setName] = useState(host.name);
  const trimmed = name.trim();
  const canSubmit = trimmed !== '' && trimmed !== host.name;

  const close = () => {
    setName(host.name);
    rename.reset?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={`Rename ${host.name}`}>
      <div className="flex flex-col gap-4">
        <TextField
          label="Name"
          required
          value={name}
          onChange={event => setName(event.target.value)}
          disabled={rename.isPending}
          autoCapitalize="none"
          autoCorrect="off"
          hint="Unique within this account."
        />
        {rename.error && <ScreenError error={rename.error} />}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            variant="primary"
            className="flex-1"
            isLoading={rename.isPending}
            disabled={!canSubmit}
            onClick={() =>
              rename.mutate({ instanceID: host.id, name: trimmed }, { onSuccess: close })
            }>
            Save
          </Button>
          <Button variant="outline" className="flex-1" onClick={close} disabled={rename.isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
