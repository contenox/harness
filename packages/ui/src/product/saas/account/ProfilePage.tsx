import { InlineNotice, Page, Small } from '@contenox/ui';
import { useState } from 'react';
import { EmailField, PasswordField, SectionForm, TextField } from '@contenox/ui';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import { partitionFormError } from './lib/formErrors';


const MIN_PASSWORD_LENGTH = 12;


const IDENTITY_FIELDS = ['email', 'display_name'] as const;


const PASSWORD_FIELDS = ['current_password', 'new_password'] as const;

/**
 * The signed-in person: their address, their name, their password.
 */
export default function ProfilePage() {
  const { routes } = useProductPorts();
  return (
    <Page header={<ScreenHeader title="Your details" />}>
      <ScreenBody width="band">
        <BackTo to={routes.account} label="Account" />
        <IdentitySection />
        <PasswordSection />
      </ScreenBody>
    </Page>
  );
}


function IdentitySection() {
  const { useAuth, useUpdateMe } = useProductPorts();
  const { user } = useAuth();
  const update = useUpdateMe();
  const [email, setEmail] = useState(user?.email ?? '');
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');

  const errors = partitionFormError(update.error, IDENTITY_FIELDS);
  const changed =
    email.trim() !== (user?.email ?? '') || displayName.trim() !== (user?.display_name ?? '');
  const canSubmit = email.trim() !== '' && changed;

  const submit = () => {
    if (!canSubmit) return;
    update.mutate({ email: email.trim(), display_name: displayName.trim() });
  };

  return (
    <SectionForm
      title="Name and email"
      submitLabel="Save"
      errors={errors}
      pending={update.isPending}
      canSubmit={canSubmit}
      onSubmit={submit}
      note={
        update.isSuccess && !changed ? (
          <InlineNotice variant="info" role="status">
            Saved. You are still signed in — a session belongs to you, not to your address.
          </InlineNotice>
        ) : undefined
      }>
      <TextField
        label="Name"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        disabled={update.isPending}
        autoComplete="name"
        error={errors.fields.display_name}
      />
      <EmailField
        label="Email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={update.isPending}
        error={errors.fields.email}
        hint="You sign in with it"
      />
    </SectionForm>
  );
}


function PasswordSection() {
  const { useChangePassword } = useProductPorts();
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');

  const errors = partitionFormError(change.error, PASSWORD_FIELDS);
  const tooShort = next !== '' && next.length < MIN_PASSWORD_LENGTH;
  const canSubmit = current !== '' && next.length >= MIN_PASSWORD_LENGTH;

  const submit = () => {
    if (!canSubmit) return;
    change.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
        },
      },
    );
  };

  return (
    <SectionForm
      title="Password"
      submitLabel="Change password"
      errors={errors}
      pending={change.isPending}
      canSubmit={canSubmit}
      onSubmit={submit}
      note={
        change.isSuccess ? (
          <InlineNotice variant="info" role="status">
            Changed. Every other browser has been signed out; this one is still signed in.
          </InlineNotice>
        ) : undefined
      }>
      <InlineNotice variant="warning">
        Changing your password signs you out everywhere else. This browser stays signed in.
      </InlineNotice>
      <PasswordField
        label="Current password"
        required
        value={current}
        onChange={e => setCurrent(e.target.value)}
        disabled={change.isPending}
        autoComplete="current-password"
        error={errors.fields.current_password}
      />
      <PasswordField
        label="New password"
        required
        value={next}
        onChange={e => setNext(e.target.value)}
        disabled={change.isPending}
        autoComplete="new-password"
        hint={`${MIN_PASSWORD_LENGTH}+ characters`}
        error={
          tooShort ? `At least ${MIN_PASSWORD_LENGTH} characters.` : errors.fields.new_password
        }
      />
      <Small>
        You need your current password because it is what proves this browser is yours and not
        somebody who walked up to it.
      </Small>
    </SectionForm>
  );
}
