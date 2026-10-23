import { Button, Card, KeyValue, Page, P, ScreenBody, Small } from '@contenox/ui';
import { useState } from 'react';
import type { ProductMutation, ProductQuery } from '../../ports';
import { ConfirmDialog, Consequence } from '../ConfirmDialog';
import { ScreenError, ScreenLoading } from '../ScreenState';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';

/**
 * One recorded acceptance, as the account and the person each report it.
 */
export interface AcceptanceRecord {
  document: string;
  version: string;
  acceptedAt: string;
}

/**
 * The account a person is ending or leaving, as much of it as this screen needs.
 */
export interface DataSubjectAccount {
  id: string;
  slug: string;
  name: string;
}


const DOCUMENT_LABELS: Record<string, string> = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
  withdrawal_waiver: 'Withdrawal waiver',
};

/**
 * The data rights: read what was agreed to, take a copy of everything, or make it stop existing.
 */
export function TenantDataScreen({
  account,
  email,
  memberCount,
  accountConsents,
  myConsents,
  exportData,
  deleteAccount,
  deleteMe,
  backTo,
  backLabel = 'Account',
}: {
  account: DataSubjectAccount;
  email: string;
  memberCount: number;

  accountConsents: ProductQuery<AcceptanceRecord[]>;

  myConsents: ProductQuery<AcceptanceRecord[]>;
  exportData: ProductMutation<void>;
  deleteAccount: ProductMutation<void>;
  deleteMe: ProductMutation<void>;
  backTo: string;
  backLabel?: string;
}) {
  return (
    <Page header={<ScreenHeader title="Your data" />}>
      <ScreenBody width="band">
        <BackTo to={backTo} label={backLabel} />
        <ExportCard exportData={exportData} />
        <AcceptanceCard title="What you accepted" records={myConsents} empty="Nothing is recorded against your identity." />
        <AcceptanceCard
          title={`What ${account.name} accepted`}
          records={accountConsents}
          empty="Nothing is recorded for this account. It was created before acceptances were kept, which is the absence of a record rather than a record of refusal."
        />
        <DeleteAccountCard account={account} memberCount={memberCount} remove={deleteAccount} />
        <DeleteMeCard email={email} remove={deleteMe} />
      </ScreenBody>
    </Page>
  );
}


function ExportCard({ exportData }: { exportData: ProductMutation<void> }) {
  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <P className="font-medium">Download your data</P>
      <P className="text-sm">
        Everything held about you: your identity, every browser session issued to you, each account
        you belong to with its invitations and acceptance records, and every acceptance you have
        given. Credential material is not included. It arrives as one JSON file.
      </P>
      <Button variant="outline" onClick={() => exportData.mutate()} isLoading={exportData.isPending}>
        Download
      </Button>
      {exportData.error && <ScreenError error={exportData.error} />}
      {exportData.isSuccess && <Small>Saved to your downloads.</Small>}
    </Card>
  );
}


function AcceptanceCard({
  title,
  records,
  empty,
}: {
  title: string;
  records: ProductQuery<AcceptanceRecord[]>;
  empty: string;
}) {
  if (records.isPending) return <ScreenLoading label="Loading acceptance records" />;
  if (records.error) return <ScreenError error={records.error} onRetry={() => void records.refetch()} retrying={records.isFetching} />;
  const list = records.data ?? [];
  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <P className="font-medium">{title}</P>
      {list.length === 0 ? (
        <Small>{empty}</Small>
      ) : (
        list.map(record => (
          <div key={`${record.document}:${record.version}`} className="flex flex-col">
            <KeyValue
              label={DOCUMENT_LABELS[record.document] ?? record.document}
              value={record.version}
            />
            <Small>Accepted {new Date(record.acceptedAt).toLocaleString()}</Small>
          </div>
        ))
      )}
    </Card>
  );
}


function DeleteAccountCard({
  account,
  memberCount,
  remove,
}: {
  account: DataSubjectAccount;
  memberCount: number;
  remove: ProductMutation<void>;
}) {
  const [confirming, setConfirming] = useState(false);
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

      {/* The dialog's verb differs from the button that opened it, and that is not
          decoration: two controls reading "Delete this account" on one screen are
          two controls a test cannot tell apart, and neither can anybody reading a
          screenshot of a half-open dialog. */}
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
        <Consequence count={memberCount} one="membership" many="memberships" />
        <P className="text-sm">
          The account's files and their access grants, its invitations, its acceptance records and
          its billing record go with it. The account's subscription is not cancelled here: if one is
          still being billed, this is refused until it is cancelled in the billing portal.
        </P>
        <P className="text-sm">
          The people survive as identities, including you. Deleting yourself is the separate action
          below.
        </P>
      </ConfirmDialog>
    </Card>
  );
}


function DeleteMeCard({ email, remove }: { email: string; remove: ProductMutation<void> }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <P className="font-medium">Delete everything about you</P>
      <P className="text-sm">
        Ends <strong>{email}</strong> everywhere. Any account left with nobody in it is deleted with
        you; an account with other people on it survives.
      </P>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete my data
      </Button>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete everything about you?"
        confirmLabel="Delete everything"
        confirmPhrase={email}
        confirmPhraseLabel="Type your email address to confirm"
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate()}>
        <P className="text-sm">This cannot be undone.</P>
        <P className="text-sm">
          Your identity, your sign-in credentials, every browser session you hold, and every
          membership you have go. Each account left with nobody else on it is deleted with you, along
          with its files, its invitations and its acceptance records. One that has other members is
          kept and you are simply removed from it.
        </P>
        <P className="text-sm">
          Two things stop this. An account whose subscription is still being billed is refused,
          because deleting this side while the provider keeps charging is the one outcome that costs
          you money — cancel it in the billing portal first. Being the last owner of an account with
          other people on it is refused too: hand ownership to somebody else, then come back.
        </P>
      </ConfirmDialog>
    </Card>
  );
}
