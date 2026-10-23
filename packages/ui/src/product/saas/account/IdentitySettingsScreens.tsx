import { useEffect, useState } from 'react';
import { Button, Card, ListCard, Page, PasswordField, ScreenBody, Small, TextField } from '@contenox/ui';
import type { ProductMutation, ProductQuery } from '../../ports';
import { ScreenError, ScreenLoading } from '../ScreenState';
import { ScreenHeader } from '../../shell/ScreenHeader';

export interface IdentityProfile { friendlyName: string; email: string }
export interface IdentitySession { id: string; createdAt: string; expiresAt: string; current: boolean }

export function IdentityProfileScreen({ profile, update }: { profile: ProductQuery<IdentityProfile>; update: ProductMutation<{ friendlyName: string }, IdentityProfile> }) {
  const [name, setName] = useState(''); useEffect(() => { if (profile.data) setName(profile.data.friendlyName); }, [profile.data]);
  return <Page header={<ScreenHeader title="Profile" />}><ScreenBody width="narrow">{profile.isPending ? <ScreenLoading label="Loading profile" /> : <Card className="space-y-4"><Small>{profile.data?.email}</Small><TextField label="Name" value={name} onChange={event => setName(event.target.value)} />{update.error && <ScreenError error={update.error} />}<Button disabled={name.trim() === '' || update.isPending} onClick={() => update.mutate({ friendlyName: name.trim() })}>Save profile</Button></Card>}</ScreenBody></Page>;
}

export function IdentitySecurityScreen({ sessions, changePassword, revoke, revokeOthers }: { sessions: ProductQuery<IdentitySession[]>; changePassword: ProductMutation<{ currentPassword: string; newPassword: string }>; revoke: ProductMutation<string>; revokeOthers: ProductMutation<void> }) {
  const [current, setCurrent] = useState(''); const [next, setNext] = useState('');
  return <Page header={<ScreenHeader title="Security" />}><ScreenBody width="band"><Card className="space-y-4"><PasswordField label="Current password" value={current} onChange={event => setCurrent(event.target.value)} /><PasswordField label="New password" value={next} onChange={event => setNext(event.target.value)} />{changePassword.error && <ScreenError error={changePassword.error} />}<Button disabled={!current || next.length < 8 || changePassword.isPending} onClick={() => changePassword.mutate({ currentPassword: current, newPassword: next }, { onSuccess: () => { setCurrent(''); setNext(''); } })}>Change password</Button></Card><Small>Browser sessions</Small>{sessions.isPending && <ScreenLoading label="Loading sessions" />}{sessions.data?.map(session => <ListCard key={session.id} title={session.current ? 'This session' : 'Browser session'} meta={<Small>Expires {new Date(session.expiresAt).toLocaleString()}</Small>} trailing={!session.current && <Button variant="secondary" onClick={() => revoke.mutate(session.id)}>Revoke</Button>} />)}<Button variant="secondary" onClick={() => revokeOthers.mutate()}>Revoke other sessions</Button></ScreenBody></Page>;
}
