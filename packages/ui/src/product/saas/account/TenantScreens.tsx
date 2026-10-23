import { useState } from 'react';
import { Badge, Button, Card, EmailField, EmptyState, ListCard, Page, ScreenBody, SelectField, Small, TextField } from '@contenox/ui';
import { Users } from 'lucide-react';
import type { ProductMutation, ProductQuery } from '../../ports';
import { ScreenError, ListSkeleton } from '../ScreenState';
import { ScreenHeader } from '../../shell/ScreenHeader';

export type TenantRole = 'owner' | 'admin' | 'member';
export interface TenantAccount { id: string; slug: string; name: string }
export interface TenantMembership { id: string; accountID: string; userID: string; friendlyName?: string; email?: string; role: TenantRole; active: boolean }
export interface TenantInvite { id: string; accountID: string; email: string; role: TenantRole; expiresAt: string; usedAt?: string }

export function AccountOnboardingScreen({ create }: { create: ProductMutation<{ slug: string; name: string }, TenantAccount> }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const canSubmit = name.trim() !== '' && slug.trim() !== '';
  return <Page header={<ScreenHeader title="Create your workspace" />}><ScreenBody width="narrow"><Card className="space-y-4"><Small>A workspace keeps its files and team access together.</Small><TextField label="Workspace name" required value={name} onChange={event => setName(event.target.value)} /><TextField label="Workspace URL name" required value={slug} onChange={event => setSlug(event.target.value)} /><Button disabled={!canSubmit || create.isPending} onClick={() => canSubmit && create.mutate({ name: name.trim(), slug: slug.trim() })}>{create.isPending ? 'Creating…' : 'Create workspace'}</Button>{create.error && <ScreenError error={create.error} />}</Card></ScreenBody></Page>;
}

export function AccountChooserScreen({ accounts, currentID, onChoose, onCreate }: { accounts: TenantAccount[]; currentID: string | null; onChoose: (id: string) => void; onCreate: () => void }) {
  return <Page header={<ScreenHeader title="Workspaces" />}><ScreenBody width="narrow">{accounts.map(account => <ListCard key={account.id} title={account.name} meta={<Small>{account.slug}</Small>} trailing={currentID === account.id ? <Badge>Current</Badge> : <Button variant="secondary" onClick={() => onChoose(account.id)}>Open</Button>} />)}<Button onClick={onCreate}>Create workspace</Button></ScreenBody></Page>;
}

export interface TenantTeamScreenProps {
  account: TenantAccount;
  members: ProductQuery<TenantMembership[]>;
  invites: ProductQuery<TenantInvite[]>;
  createInvite: ProductMutation<{ email: string; role: TenantRole }, TenantInvite>;
  revokeInvite: ProductMutation<string>;
  changeRole: ProductMutation<{ membershipID: string; role: TenantRole }>;
  removeMember: ProductMutation<string>;
}

export function TenantTeamScreen({ account, members, invites, createInvite, revokeInvite, changeRole, removeMember }: TenantTeamScreenProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TenantRole>('member');
  return <Page header={<ScreenHeader title={`${account.name} team`} />}><ScreenBody width="band"><Card className="space-y-4"><EmailField label="Invite by email" value={email} onChange={event => setEmail(event.target.value)} /><SelectField label="Role" value={role} onChange={event => setRole(event.target.value as TenantRole)} options={[{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }, { value: 'owner', label: 'Owner' }]} /><Button disabled={email.trim() === '' || createInvite.isPending} onClick={() => createInvite.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail('') })}>Send invitation</Button>{createInvite.error && <ScreenError error={createInvite.error} />}</Card>
    <Small>Members</Small>{members.isPending && <ListSkeleton label="Loading members" />}{members.error && <ScreenError error={members.error} onRetry={() => void members.refetch()} retrying={members.isFetching} />}{members.data?.map(member => <ListCard key={member.id} title={member.userID} meta={<Small>{member.role}</Small>} trailing={<div className="flex gap-2"><SelectField label={`Role for ${member.userID}`} value={member.role} onChange={event => changeRole.mutate({ membershipID: member.id, role: event.target.value as TenantRole })} options={[{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }, { value: 'owner', label: 'Owner' }]} /><Button variant="secondary" onClick={() => removeMember.mutate(member.id)}>Remove</Button></div>} />)}{members.data?.length === 0 && <EmptyState icon={<Users />} title="No members" description="Invite the first member." />}
    <Small>Pending invitations</Small>{invites.isPending && <ListSkeleton label="Loading invitations" />}{invites.error && <ScreenError error={invites.error} onRetry={() => void invites.refetch()} retrying={invites.isFetching} />}{invites.data?.filter(invite => !invite.usedAt).map(invite => <ListCard key={invite.id} title={invite.email} meta={<Small>{invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}</Small>} trailing={<Button variant="secondary" onClick={() => revokeInvite.mutate(invite.id)}>Revoke</Button>} />)}</ScreenBody></Page>;
}
