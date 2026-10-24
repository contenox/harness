import { Button, Card, KeyValue, P, Page, Small } from '@contenox/ui';
import { useState } from 'react';
import { ConfirmDialog, Consequence } from '../ConfirmDialog';
import { ScreenError, ScreenLoading } from '../ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type { Account, ConsentRecord } from '../../lib/api/types';
import { formatDate } from '../../lib/relativeTime';


const DOCUMENT_LABELS: Record<string, string> = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
  withdrawal_waiver: 'Withdrawal waiver',
};

export default function DataPage() {
  const { routes, useAccount, useAuth } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const { data, isPending, error, refetch, isFetching } = useAccount(accountID);

  return (
    <Page header={<ScreenHeader title="Your data" />}>
      <ScreenBody width="band">
        <BackTo to={routes.account} label="Account" />
        <ExportCard />
        {isPending && <ScreenLoading label="Loading your account" />}
        {error && (
          <ScreenError error={error} onRetry={() => void refetch()} retrying={isFetching} />
        )}
        {data && <ConsentCard consents={data.consents} />}
        {data && <DeleteAccountCard account={data} />}
        <DeleteMeCard />
      </ScreenBody>
    </Page>
  );
}


function ExportCard() {
  const { useExportMyData } = useProductPorts();
  const exportData = useExportMyData();
  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <P className="font-medium">Download your data</P>
      <P className="text-sm">
        Everything the relay holds about you: your identity, your sign-in methods, every session
        ever issued to you, and each account you belong to with its machines, its acceptance records
        and its control-plane log. It arrives as one JSON file.
      </P>
      <Button
        variant="outline"
        onClick={() => exportData.mutate()}
        isLoading={exportData.isPending}>
        Download
      </Button>
      {exportData.error && <ScreenError error={exportData.error} />}
      {exportData.isSuccess && <Small>Saved to your downloads.</Small>}
    </Card>
  );
}


function ConsentCard({ consents }: { consents: ConsentRecord[] }) {
  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <P className="font-medium">What you accepted</P>
      {consents.length === 0 ? (
        <Small>
          Nothing is recorded for this account. It was created before acceptances were kept, which
          is the absence of a record rather than a record of refusal.
        </Small>
      ) : (
        consents.map(consent => (
          <div key={`${consent.document}:${consent.version}`} className="flex flex-col">
            <KeyValue
              label={DOCUMENT_LABELS[consent.document] ?? consent.document}
              value={consent.version}
            />
            <Small>Accepted {formatDate(consent.accepted_at)}</Small>
          </div>
        ))
      )}
    </Card>
  );
}


function DeleteAccountCard({ account }: { account: Account }) {
  const { useDeleteAccount, useMembers } = useProductPorts();
  const members = useMembers(account.id);
  const remove = useDeleteAccount(account.id);
  const [confirming, setConfirming] = useState(false);

  const active = (members.data ?? []).filter(member => member.is_active).length;

  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <P className="font-medium">Delete this account</P>
      <P className="text-sm">
        Ends <strong>{account.name}</strong> and everything attached to it. Everybody on it keeps
        their own sign-in; nobody is deleted.
      </P>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete this account
      </Button>


      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${account.name}?`}
        confirmLabel="Delete the account"
        confirmPhrase={account.slug}
        confirmPhraseLabel={`Type ${account.slug} to confirm`}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(undefined, { onSuccess: () => setConfirming(false) })}>
        <P className="text-sm">This cannot be undone. It deletes:</P>
        <Consequence count={account.active_instances} one="paired machine" many="paired machines" />
        <Consequence count={active} one="membership" many="memberships" />
        <P className="text-sm">
          Every machine's credential stops working and its live connection is dropped — a deleted
          account has no next dial to be refused at. The invitations, the acceptance records and the
          whole event log go with it.
        </P>
        <P className="text-sm">
          The people survive as identities, including you. Deleting yourself is the separate action
          below.
        </P>
      </ConfirmDialog>
    </Card>
  );
}


function DeleteMeCard() {
  const { useAuth, useDeleteMe } = useProductPorts();
  const { user, accounts } = useAuth();
  const remove = useDeleteMe();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <P className="font-medium">Delete everything about you</P>
      <P className="text-sm">
        Ends <strong>{user?.email}</strong> everywhere. Any account left with nobody in it is
        deleted with you; an account with other people on it survives.
      </P>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete my data
      </Button>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete everything about you?"
        confirmLabel="Delete everything"
        confirmPhrase={user?.email}
        confirmPhraseLabel="Type your email address to confirm"
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate()}>
        <P className="text-sm">This cannot be undone. You are a member of:</P>
        <Consequence count={accounts.length} one="account" many="accounts" />
        <P className="text-sm">
          Each of those that has nobody else on it is deleted with you, along with its machines,
          their live connections, its invitations, its acceptance records and its event log. One
          that has other members is kept and you are simply removed from it.
        </P>
        <P className="text-sm">
          Two things stop this. An account with a subscription still at the payment processor is
          refused, because deleting our side while it keeps billing is the one outcome that costs
          you money — cancel it in the billing portal first. Being the last owner of an account with
          other people on it is refused too: make somebody else an owner, then come back.
        </P>
      </ConfirmDialog>
    </Card>
  );
}
