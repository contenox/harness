import { useState, type ReactNode } from 'react';
import { EmailField, InlineNotice, PasswordField, TextField } from '@contenox/ui';
import type { ProductMutation } from '../../ports';
import { AuthForm, AuthLink, AuthScreen, ProductIntro } from './AuthScreen';
import { partitionFormError } from './formErrors';
import { LegalConsentFields, consentFromDocuments, type PublishedDocument } from '../LegalScreens';

export interface AuthScreenRoutes {
  signIn: string;
  signUp: string;
  forgotPassword: string;
}

export interface CredentialsSignInProps {
  routes: AuthScreenRoutes;
  signIn: ProductMutation<{ email: string; password: string }>;
  intro?: ReactNode;
  legalLinks?: { to: string; label: string }[];
}

export function CredentialsSignInScreen({ routes, signIn, intro = <ProductIntro />, legalLinks }: CredentialsSignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const errors = partitionFormError(signIn.error, ['email', 'password'] as const);
  const canSubmit = email.trim() !== '' && password !== '';
  return <AuthScreen intro={intro} legalLinks={legalLinks} footer={<><AuthLink to={routes.forgotPassword}>Forgot your password?</AuthLink><AuthLink to={routes.signUp}>Create an account</AuthLink></>}>
    <AuthForm title="Sign in" submitLabel="Sign in" errors={errors} pending={signIn.isPending} canSubmit={canSubmit} onSubmit={() => canSubmit && signIn.mutate({ email: email.trim(), password })}>
      <EmailField label="Email" required value={email} onChange={event => setEmail(event.target.value)} disabled={signIn.isPending} error={errors.fields.email} />
      <PasswordField label="Password" required value={password} onChange={event => setPassword(event.target.value)} disabled={signIn.isPending} autoComplete="current-password" error={errors.fields.password} />
    </AuthForm>
  </AuthScreen>;
}

export interface CredentialsSignUpProps {
  routes: AuthScreenRoutes;
  signUp: ProductMutation<
    {
      friendlyName: string;
      email: string;
      password: string;
      consent: ReturnType<typeof consentFromDocuments>;
    },
    { verificationRequired: boolean }
  >;
  /**
   * The published documents this application is showing, every one of which a registration must accept.
   */
  documents: PublishedDocument[];
  intro?: ReactNode;
  legalLinks?: { to: string; label: string }[];
  minimumPasswordLength?: number;
}

export function CredentialsSignUpScreen({ routes, signUp, documents, intro = <ProductIntro />, legalLinks, minimumPasswordLength = 8 }: CredentialsSignUpProps) {
  const [friendlyName, setFriendlyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const fields = ['friendlyName', 'email', 'password'] as const;
  const errors = partitionFormError(signUp.error, fields);
  const consentErrors = partitionFormError(signUp.error, [
    'consent.termsVersion',
    'consent.privacyVersion',
    'consent.withdrawalWaiverVersion',
  ] as const);
  const longEnough = password.length >= minimumPasswordLength;
  const acceptedEveryDocument =
    documents.length > 0 && documents.every(document => accepted[document.key] === true);



  const canSubmit =
    friendlyName.trim() !== '' && email.trim() !== '' && longEnough && acceptedEveryDocument;

  if (signUp.isSuccess) return <AuthScreen legalLinks={legalLinks} footer={<AuthLink to={routes.signIn}>Back to sign in</AuthLink>}><InlineNotice role="status" variant="info">Check your email to verify your account, then sign in.</InlineNotice></AuthScreen>;
  return <AuthScreen intro={intro} legalLinks={legalLinks} footer={<AuthLink to={routes.signIn}>Already have an account? Sign in</AuthLink>}>
    <AuthForm title="Create an account" submitLabel="Create account" errors={errors} pending={signUp.isPending} canSubmit={canSubmit} onSubmit={() => canSubmit && signUp.mutate({ friendlyName: friendlyName.trim(), email: email.trim(), password, consent: consentFromDocuments(documents) })}>
      <TextField label="Name" required value={friendlyName} onChange={event => setFriendlyName(event.target.value)} disabled={signUp.isPending} autoComplete="name" error={errors.fields.friendlyName} />
      <EmailField label="Email" required value={email} onChange={event => setEmail(event.target.value)} disabled={signUp.isPending} error={errors.fields.email} />
      <PasswordField label="Password" required value={password} onChange={event => setPassword(event.target.value)} disabled={signUp.isPending} autoComplete="new-password" hint={`${minimumPasswordLength}+ characters`} error={password !== '' && !longEnough ? `At least ${minimumPasswordLength} characters.` : errors.fields.password} />
      <LegalConsentFields
        documents={documents}
        accepted={accepted}
        onToggle={(key, checked) => setAccepted(current => ({ ...current, [key]: checked }))}
        disabled={signUp.isPending}
        errorFor={key => consentErrors.fields[`consent.${key === 'withdrawal_waiver' ? 'withdrawalWaiverVersion' : `${key}Version`}` as keyof typeof consentErrors.fields]}
      />
    </AuthForm>
  </AuthScreen>;
}

export function CredentialsForgotPasswordScreen({ routes, request, legalLinks }: { routes: AuthScreenRoutes; request: ProductMutation<{ email: string }>; legalLinks?: { to: string; label: string }[] }) {
  const [email, setEmail] = useState('');
  const errors = partitionFormError(request.error, ['email'] as const);
  const canSubmit = email.trim() !== '';
  return <AuthScreen legalLinks={legalLinks} footer={<AuthLink to={routes.signIn}>Back to sign in</AuthLink>}>
    {request.isSuccess ? <InlineNotice role="status" variant="info">If that address has an account, a reset link is on its way.</InlineNotice> : <AuthForm title="Reset your password" submitLabel="Send reset link" errors={errors} pending={request.isPending} canSubmit={canSubmit} onSubmit={() => canSubmit && request.mutate({ email: email.trim() })}><EmailField label="Email" required value={email} onChange={event => setEmail(event.target.value)} disabled={request.isPending} error={errors.fields.email} /></AuthForm>}
  </AuthScreen>;
}

export function CredentialsResetPasswordScreen({ routes, token, reset, legalLinks, minimumPasswordLength = 8 }: { routes: AuthScreenRoutes; token: string; reset: ProductMutation<{ token: string; password: string }>; legalLinks?: { to: string; label: string }[]; minimumPasswordLength?: number }) {
  const [password, setPassword] = useState('');
  const errors = partitionFormError(reset.error, ['password'] as const);
  if (token === '') return <AuthScreen legalLinks={legalLinks} footer={<AuthLink to={routes.forgotPassword}>Request a new link</AuthLink>}><InlineNotice variant="error">This link is missing its reset token.</InlineNotice></AuthScreen>;
  if (reset.isSuccess) return <AuthScreen legalLinks={legalLinks} footer={<AuthLink to={routes.signIn}>Sign in</AuthLink>}><InlineNotice role="status" variant="info">Your password has been changed.</InlineNotice></AuthScreen>;
  const canSubmit = password.length >= minimumPasswordLength;
  return <AuthScreen legalLinks={legalLinks} footer={<AuthLink to={routes.signIn}>Back to sign in</AuthLink>}><AuthForm title="Choose a new password" submitLabel="Change password" errors={errors} pending={reset.isPending} canSubmit={canSubmit} onSubmit={() => canSubmit && reset.mutate({ token, password })}><PasswordField label="New password" required value={password} onChange={event => setPassword(event.target.value)} disabled={reset.isPending} autoComplete="new-password" hint={`${minimumPasswordLength}+ characters`} error={password !== '' && !canSubmit ? `At least ${minimumPasswordLength} characters.` : errors.fields.password} /></AuthForm></AuthScreen>;
}
