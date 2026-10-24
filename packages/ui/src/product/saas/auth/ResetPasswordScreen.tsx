import { InlineNotice } from '@contenox/ui';
import { useState } from 'react';
import { PasswordField } from '@contenox/ui';
import { useProductPorts } from '../../ports';
import { partitionFormError } from './formErrors';
import { AuthForm, AuthLink, AuthScreen } from './AuthScreen';


const MIN_PASSWORD_LENGTH = 12;


const FIELDS = ['password'] as const;

export function ResetPasswordScreen({ token }: { token: string }) {
  const { routes, useConfirmPasswordReset } = useProductPorts();
  const [password, setPassword] = useState('');
  const reset = useConfirmPasswordReset();

  if (token === '') {
    return (
      <AuthScreen footer={<AuthLink to={routes.forgotPassword}>Request a new link</AuthLink>}>
        <InlineNotice variant="error">
          This link is missing its reset token. Request a new one.
        </InlineNotice>
      </AuthScreen>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthScreen footer={<AuthLink to={routes.signIn}>Sign in</AuthLink>}>
        <InlineNotice variant="info">Your password has been changed.</InlineNotice>
      </AuthScreen>
    );
  }

  const tooShort = password !== '' && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit = password.length >= MIN_PASSWORD_LENGTH;
  const errors = partitionFormError(reset.error, FIELDS);
  const submit = () => {
    if (!canSubmit) return;
    reset.mutate({ token, password });
  };

  return (
    <AuthScreen footer={<AuthLink to={routes.signIn}>Back to sign in</AuthLink>}>
      <AuthForm
        title="Choose a new password"
        submitLabel="Change password"
        errors={errors}
        pending={reset.isPending}
        canSubmit={canSubmit}
        onSubmit={submit}>
        <PasswordField
          label="New password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={reset.isPending}
          autoComplete="new-password"
          hint={`${MIN_PASSWORD_LENGTH}+ characters`}

          error={tooShort ? `At least ${MIN_PASSWORD_LENGTH} characters.` : errors.fields.password}
        />
      </AuthForm>
    </AuthScreen>
  );
}
