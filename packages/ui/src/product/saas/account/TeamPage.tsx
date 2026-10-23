import { Badge, Button, Card, EmptyState, InlineNotice, P, Page, Small } from '@contenox/ui';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import { EmailField, SectionForm, SelectField, TextField } from '@contenox/ui';
import { RefusalCta } from '../RefusalCta';
import { ListCard } from '@contenox/ui';
import { ListSkeleton, ScreenError } from '../ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type { Account, Invite, InviteDelivery, Member, MembershipRole } from '../../lib/api/types';
import { partitionFormError, type FormErrors } from './lib/formErrors';
import { formatDate, relativeTime } from '../../lib/relativeTime';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../lib/roles';

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as MembershipRole[]).map(role => ({
  value: role,
  label: ROLE_LABELS[role],
}));


const INVITE_FIELDS = ['email', 'role'] as const;



function alone(members: Member[]): boolean {
  return members.filter(member => member.is_active).length <= 1;
}


function hasExpired(invite: Invite, now: number): boolean {
  return new Date(invite.expires_at).getTime() <= now;
}

export default function TeamPage() {
  const { routes, useAccount, useAuth, useInvites, useMembers } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const members = useMembers(accountID);
  const invites = useInvites(accountID);
  const account = useAccount(accountID);

  const now = Date.now();
  const unspent = (invites.data ?? []).filter(invite => invite.used_at === null);
  const open = unspent.filter(invite => !hasExpired(invite, now));
  const dead = unspent.filter(invite => hasExpired(invite, now));

  return (
    <Page header={<ScreenHeader title="Team" />}>
      <ScreenBody width="band">
        <BackTo to={routes.account} label="Account" />
        <InviteForm accountID={accountID} account={account.data} />

        {invites.error && (
          <ScreenError
            error={invites.error}
            onRetry={() => void invites.refetch()}
            retrying={invites.isFetching}
          />
        )}
        {open.length > 0 && (
          <>
            <Small>Invited, not yet joined</Small>
            {open.map(invite => (
              <InviteCard key={invite.id} invite={invite} accountID={accountID} />
            ))}
          </>
        )}
        {dead.length > 0 && (
          <>
            <Small>Expired</Small>
            {dead.map(invite => (
              <ExpiredInviteCard key={invite.id} invite={invite} />
            ))}
          </>
        )}

        <Small>On this account</Small>
        {members.isPending && <ListSkeleton label="Loading the team" />}
        {members.error && (
          <ScreenError
            error={members.error}
            onRetry={() => void members.refetch()}
            retrying={members.isFetching}
          />
        )}
        {members.data?.map(member => (
          <MemberCard key={member.user_id} member={member} accountID={accountID} />
        ))}
        {/* Not an EmptyState: the listing always contains the person reading
            it, so it is never empty. What can be absent is anybody ELSE, and
            that is what a solo operator is looking at this screen to confirm. */}
        {members.data !== undefined && alone(members.data) && (
          <EmptyState
            icon={<Users aria-hidden />}
            title="Nobody else"
            description="Invite somebody above and they will appear here once they accept."
          />
        )}

        <RolesCard />
      </ScreenBody>
    </Page>
  );
}


function RolesCard() {
  return (
    <>
      <Small>What each role can do</Small>
      <Card variant="filled" className="flex flex-col gap-3">
        {(Object.keys(ROLE_LABELS) as MembershipRole[]).map(role => (
          <div key={role}>
            <P className="text-sm font-medium">{ROLE_LABELS[role]}</P>
            <Small>{ROLE_DESCRIPTIONS[role]}</Small>
          </div>
        ))}
      </Card>
    </>
  );
}


const NO_FORM_ERRORS: FormErrors = { retryable: false, fields: {} };


function seatLine(account: Account | undefined): string | null {
  if (account?.entitled_seats === undefined) return null;
  const used = account.invited_seats_used;
  const pending = account.pending_invites;
  if (pending === 0) return `${used} of ${account.entitled_seats} invited seats used.`;
  return (
    `${used + pending} of ${account.entitled_seats} invited seats taken — ` +
    `${used} joined, ${pending} invited and not yet accepted.`
  );
}


function wearsDefaultName(account: Account | undefined, email: string | undefined): boolean {
  if (account === undefined || email === undefined) return false;
  const localPart = email.split('@')[0];
  return localPart !== '' && account.name === localPart;
}


const DELIVERY_LABEL: Record<InviteDelivery, string> = {
  not_configured: 'Not sent',
  queued: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
};


const DELIVERY_NEEDS_ATTENTION: ReadonlySet<InviteDelivery> = new Set<InviteDelivery>([
  'not_configured',
  'failed',
]);


function deliveryNote(delivery: InviteDelivery): string | null {
  switch (delivery) {
    case 'not_configured':
      return 'Nothing was delivered for this invitation. It is valid, and the person has no way to receive it until delivery is configured on the relay.';
    case 'failed':
      return 'Delivery failed for this invitation. It is valid and nobody received it — revoke it and invite the address again, or ask an operator to look at the relay’s mail transport.';
    default:
      return null;
  }
}


function creationNote(delivery: InviteDelivery, email: string): string {
  switch (delivery) {
    case 'not_configured':
      return `The invitation for ${email} exists, but nothing was sent — this relay has no delivery configured. Ask an operator to set it up.`;
    case 'failed':
      return `The invitation for ${email} exists and delivery failed. Ask an operator to look at the relay’s mail transport.`;
    case 'sent':
      return `Invitation sent to ${email}.`;
    default:
      return `Invitation for ${email} is on its way. It shows as sent above once a mail server has taken it.`;
  }
}


function InviteForm({ accountID, account }: { accountID: string; account: Account | undefined }) {
  const { refusalSell, useAuth, useCreateInvite } = useProductPorts();
  const { user } = useAuth();
  const create = useCreateInvite(accountID);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRole>('tenant_user');





  const sell = refusalSell(create.error);
  const errors = sell === null ? partitionFormError(create.error, INVITE_FIELDS) : NO_FORM_ERRORS;
  const canSubmit = email.trim() !== '';
  const seats = seatLine(account);

  const submit = () => {
    if (!canSubmit) return;
    create.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail('') });
  };

  return (
    <SectionForm
      title="Invite somebody"
      submitLabel="Send invitation"
      errors={errors}
      pending={create.isPending}
      canSubmit={canSubmit}
      onSubmit={submit}
      note={
        create.data !== undefined ? (
          <InlineNotice
            variant={DELIVERY_NEEDS_ATTENTION.has(create.data.delivery) ? 'warning' : 'info'}
            role="status">
            {creationNote(create.data.delivery, create.data.email)}
          </InlineNotice>
        ) : (
          <RefusalCta error={create.error} />
        )
      }>
      {seats !== null && <Small>{seats}</Small>}
      <EmailField
        label="Email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={create.isPending}
        error={errors.fields.email}
      />
      <SelectField
        label="Role"
        value={role}
        onChange={e => setRole(e.target.value as MembershipRole)}
        disabled={create.isPending}
        options={ROLE_OPTIONS}
        error={errors.fields.role}
      />
      {/* The blast radius, stated where the grant is made rather than only in
          the removal dialog that undoes it (finding 14): sessions here are
          remote code execution, and the inviter is the one consenting. */}
      <Small>
        Joining grants access to every machine paired to this account and the sessions running on
        them.
      </Small>
      {/* Naming happens HERE, in the form that makes the name somebody else's
          problem, rather than as a link to the screen where it could be fixed.
          A person one field away from inviting a colleague does not leave to go
          and rename something and come back — they send the invitation, and the
          colleague joins a team called 'alex' forever. */}
      {wearsDefaultName(account, user?.email) && accountID !== null && (
        <TeamNameField accountID={accountID} currentName={account?.name ?? ''} />
      )}
      <Small>
        We send the invitation. There is no link to copy — the token only ever exists in the message
        that goes to that address.
      </Small>
    </SectionForm>
  );
}


function InviteCard({ invite, accountID }: { invite: Invite; accountID: string }) {
  const { useRevokeInvite } = useProductPorts();
  const revoke = useRevokeInvite(accountID);
  const [confirming, setConfirming] = useState(false);
  const note = deliveryNote(invite.delivery);

  return (
    <ListCard
      title={invite.email}
      meta={
        <Small>
          {/* A DATE, not a relative time: expiry is in the future, and
              `relativeTime` only describes the past — it rendered every open
              invitation as "expires now". */}
          {ROLE_LABELS[invite.role]} · expires {formatDate(invite.expires_at)}
        </Small>
      }
      trailing={
        <Badge
          variant={DELIVERY_NEEDS_ATTENTION.has(invite.delivery) ? 'warning' : 'default'}
          className="shrink-0 whitespace-nowrap">
          {DELIVERY_LABEL[invite.delivery]}
        </Badge>
      }>
      {note !== null && <InlineNotice variant="warning">{note}</InlineNotice>}

      <div className="flex justify-end">
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          Revoke
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Revoke the invitation for ${invite.email}?`}
        confirmLabel="Revoke the invitation"
        pending={revoke.isPending}
        error={revoke.error}
        onConfirm={() => revoke.mutate(invite.id, { onSuccess: () => setConfirming(false) })}>
        <P className="text-sm">
          The invitation stops working immediately. If they have already been sent it, the link they
          hold will be refused. Nothing else changes — inviting them again issues a new one.
        </P>
      </ConfirmDialog>
    </ListCard>
  );
}


function ExpiredInviteCard({ invite }: { invite: Invite }) {
  return (
    <ListCard
      muted
      title={invite.email}
      meta={
        <Small>
          {/* A RELATIVE time, unlike the open card's date: this one is in the
              past, which is what `relativeTime` describes and what makes it
              read differently from a live invitation at a glance. */}
          {ROLE_LABELS[invite.role]} · expired {relativeTime(invite.expires_at, 'just now')}
        </Small>
      }
      trailing={
        <Badge variant="outline" className="shrink-0 whitespace-nowrap">
          Expired
        </Badge>
      }>
      <Small>
        The link stopped working and the seat it was holding is free again. Invite the address again
        to send a new one.
      </Small>
    </ListCard>
  );
}


function MemberCard({ member, accountID }: { member: Member; accountID: string }) {
  const { useAuth, useRemoveMember, useUpdateMemberRole } = useProductPorts();
  const { user } = useAuth();
  const updateRole = useUpdateMemberRole(accountID);
  const remove = useRemoveMember(accountID);
  const [confirming, setConfirming] = useState(false);
  const isSelf = user?.id === member.user_id;

  if (!member.is_active) {
    return (
      <ListCard
        muted
        title={member.display_name || member.email}
        meta={<Small>{member.email}</Small>}
        trailing={
          <Badge variant="outline" className="shrink-0">
            Removed
          </Badge>
        }
      />
    );
  }

  return (
    <ListCard
      title={
        <>
          {member.display_name || member.email}
          {isSelf && ' (you)'}
        </>
      }
      meta={
        <>
          <Small>{member.email}</Small>
          <Small>{lastSeenLabel(member)}</Small>
        </>
      }
      trailing={
        isSelf && (
          <Badge variant="default" className="shrink-0">
            {ROLE_LABELS[member.role]}
          </Badge>
        )
      }>
      {!isSelf && (
        <>
          <SelectField
            label="Role"
            value={member.role}
            onChange={e =>
              updateRole.mutate({ userID: member.user_id, role: e.target.value as MembershipRole })
            }
            disabled={updateRole.isPending}
            options={ROLE_OPTIONS}
          />
          {updateRole.error && <ScreenError error={updateRole.error} />}
          <div className="flex justify-end">
            <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
              Remove
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Remove ${member.display_name || member.email}?`}
        confirmLabel="Remove them"
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(member.user_id, { onSuccess: () => setConfirming(false) })}>
        <P className="text-sm">
          They lose access to this account immediately, including every machine paired to it. Their
          own sign-in survives — an identity is one person across every account they belong to, so
          this removes a membership and deletes nobody.
        </P>
        <P className="text-sm">
          Machines they paired stay paired. Removal does not revoke anything, and inviting them back
          restores this membership rather than creating a new one.
        </P>
      </ConfirmDialog>
    </ListCard>
  );
}

function lastSeenLabel(member: Member): string {
  if (member.last_login_at === null) {
    return `Joined ${relativeTime(member.joined_at, 'just now')}, never signed in`;
  }
  return `Last signed in ${relativeTime(member.last_login_at, 'just now')}`;
}


function TeamNameField({ accountID, currentName }: { accountID: string; currentName: string }) {
  const { useAccount, useUpdateAccount } = useProductPorts();
  const account = useAccount(accountID);
  const update = useUpdateAccount(accountID);
  const [name, setName] = useState(currentName);
  const slug = account.data?.slug;

  const save = () => {
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === currentName || slug === undefined) return;
    update.mutate({ name: trimmed, slug });
  };

  return (
    <div className="border-surface-300 dark:border-dark-surface-600 flex flex-col gap-2 rounded-md border p-3">
      <Small>
        This team is still called &lsquo;{currentName}&rsquo; — the name we derived from your email
        address. Whoever you invite will see it.
      </Small>
      <TextField
        label="Team name"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={update.isPending || slug === undefined}
        placeholder="Acme Engineering"
      />
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={save}
        isLoading={update.isPending}
        disabled={name.trim() === '' || name.trim() === currentName || slug === undefined}>
        Save name
      </Button>
      {update.error && <ScreenError error={update.error} />}
    </div>
  );
}
