import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { EmailField, PasswordField } from '@contenox/ui';
import { useProductPorts } from '../../ports';
import { partitionFormError } from './formErrors';
import { AuthForm, AuthLink, AuthScreen, ProductIntro } from './AuthScreen';


const FIELDS = ['email', 'password'] as const;

export function SignInScreen({ from }: { from?: string }) {
  const { routes, useAuth, useSignIn } = useProductPorts();
  const { user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useSignIn();

  if (user) return <Navigate to={from ?? routes.session} replace />;

  const canSubmit = email.trim() !== '' && password !== '';
  const errors = partitionFormError(signIn.error, FIELDS);
  const submit = () => {
    if (!canSubmit) return;
    signIn.mutate({ email: email.trim(), password });
  };

  return (
    <AuthScreen
      intro={<ProductIntro />}
      footer={
        <>
          <AuthLink to={routes.forgotPassword}>Forgot your password?</AuthLink>
          <AuthLink to={routes.signUp}>Create an account</AuthLink>
        </>
      }>
      <AuthForm
        title="Sign in"
        submitLabel="Sign in"
        errors={errors}
        pending={signIn.isPending}
        canSubmit={canSubmit}
        onSubmit={submit}>
        <EmailField
          label="Email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={signIn.isPending}
          error={errors.fields.email}
        />
        <PasswordField
          label="Password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={signIn.isPending}
          autoComplete="current-password"
          error={errors.fields.password}
        />
      </AuthForm>
    </AuthScreen>
  );
}
