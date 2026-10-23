import { InlineNotice } from '@contenox/ui';
import { useState } from 'react';
import { EmailField } from '@contenox/ui';
import { useProductPorts } from '../../ports';
import { partitionFormError } from './formErrors';
import { AuthForm, AuthLink, AuthScreen } from './AuthScreen';


const FIELDS = ['email'] as const;

/**
 * Requests a reset mail.
 */
export function ForgotPasswordScreen() {
  const { routes, useRequestPasswordReset } = useProductPorts();
  const [email, setEmail] = useState('');
  const reset = useRequestPasswordReset();

  const canSubmit = email.trim() !== '';
  const errors = partitionFormError(reset.error, FIELDS);
  const submit = () => {
    if (!canSubmit) return;
    reset.mutate({ email: email.trim() });
  };

  return (
    <AuthScreen footer={<AuthLink to={routes.signIn}>Back to sign in</AuthLink>}>
      {reset.isSuccess ? (
        <InlineNotice variant="info">
          If that address has an account, a reset link is on its way. The link expires — request
          another if it does.
        </InlineNotice>
      ) : (
        <AuthForm
          title="Reset your password"
          submitLabel="Send reset link"
          errors={errors}
          pending={reset.isPending}
          canSubmit={canSubmit}
          onSubmit={submit}>
          <EmailField
            label="Email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={reset.isPending}
            error={errors.fields.email}
          />
        </AuthForm>
      )}
    </AuthScreen>
  );
}
