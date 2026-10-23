import { Button, InlineNotice, P, Small } from '@contenox/ui';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  CheckboxField,
  EmailField,
  PasswordField,
  SelectField,
  TextField,
} from '@contenox/ui';
import { ScreenLoading } from '../ScreenState';
import { ApiError } from '../../lib/apiError';
import type { AccountType, BusinessDetails, InvitePreview, SignupRequest } from '../../lib/api/types';
import { roleLabel } from '../../lib/roles';
import { useProductPorts } from '../../ports';
import { partitionFormError } from './formErrors';
import { AuthForm, AuthLink, AuthScreen, ProductIntro } from './AuthScreen';


const MIN_PASSWORD_LENGTH = 12;


const FIELDS = [
  'display_name',
  'email',
  'password',
  'account_type',
  'business',
  'consent.terms_version',
  'consent.privacy_version',
  'consent.withdrawal_waiver_version',
] as const;

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'consumer', label: 'Myself' },
  { value: 'business', label: 'A business' },
];


interface BusinessForm {
  legalName: string;
  vatID: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
}

const EMPTY_BUSINESS: BusinessForm = {
  legalName: '',
  vatID: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  country: '',
};


function businessComplete(form: BusinessForm): boolean {
  return (
    form.legalName.trim() !== '' &&
    form.addressLine1.trim() !== '' &&
    form.postalCode.trim() !== '' &&
    form.city.trim() !== '' &&
    form.country.trim() !== ''
  );
}


function businessPayload(form: BusinessForm): BusinessDetails {
  const details: BusinessDetails = {
    legal_name: form.legalName.trim(),
    address_line1: form.addressLine1.trim(),
    postal_code: form.postalCode.trim(),
    city: form.city.trim(),
    country: form.country.trim().toUpperCase(),
  };
  if (form.vatID.trim() !== '') details.vat_id = form.vatID.trim();
  if (form.addressLine2.trim() !== '') details.address_line2 = form.addressLine2.trim();
  return details;
}

/**
 * Creates the account and signs in, in one round trip.
 */
export function SignUpScreen({ inviteToken }: { inviteToken: string }) {
  const {
    routes,
    authLegal,
    useAcceptInvite,
    useAuth,
    useInvitePreview,
    useSignUp,
    useSwapAuthGate,
  } = useProductPorts();
  const { user } = useAuth();
  const joining = inviteToken !== '';



  const joinPath = `${routes.signUp}?token=${encodeURIComponent(inviteToken)}`;

  const [accountType, setAccountType] = useState<AccountType>('consumer');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [business, setBusiness] = useState<BusinessForm>(EMPTY_BUSINESS);
  const [acceptedDocuments, setAcceptedDocuments] = useState(false);
  const [acceptedWithdrawal, setAcceptedWithdrawal] = useState(false);



  const [acknowledged, setAcknowledged] = useState(false);
  const swapGate = useSwapAuthGate();
  const signUp = useSignUp();
  const preview = useInvitePreview(inviteToken);





  if (signUp.data?.contact_pending === true && !acknowledged) {
    return (
      <ContactPendingNotice
        onContinue={() => {
          setAcknowledged(true);
          swapGate();
        }}
      />
    );
  }







  if (user && !joining) return <Navigate to={routes.session} replace />;







  if (joining && preview.error instanceof ApiError && preview.error.status === 404) {
    return <InvalidInviteScreen />;
  }



  if (joining && preview.isPending) {
    return (
      <AuthScreen intro={<ProductIntro />}>
        <ScreenLoading label="Checking the invitation" />
      </AuthScreen>
    );
  }




  if (user) {
    return (
      <AcceptInviteScreen
        token={inviteToken}
        email={user.email}
        preview={preview.data}
        routes={routes}
        useAcceptInvite={useAcceptInvite}
      />
    );
  }




  const waiverApplies = !joining && accountType === 'consumer';
  const businessApplies = !joining && accountType === 'business';

  const tooShort = password !== '' && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit =
    displayName.trim() !== '' &&
    email.trim() !== '' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    acceptedDocuments &&
    (!waiverApplies || acceptedWithdrawal) &&
    (!businessApplies || businessComplete(business));

  const errors = partitionFormError(signUp.error, FIELDS);

  const submit = () => {
    if (!canSubmit) return;
    const body: SignupRequest = {
      email: email.trim(),
      password,
      display_name: displayName.trim(),
      consent: {
        terms_version: authLegal.termsVersion,
        privacy_version: authLegal.privacyVersion,
      },
    };
    if (joining) body.invite_token = inviteToken;
    else body.account_type = accountType;
    if (waiverApplies) {
      body.consent.withdrawal_waiver_version = authLegal.withdrawalWaiverVersion;
    }
    if (businessApplies) body.business = businessPayload(business);
    signUp.mutate(body);
  };

  const busy = signUp.isPending;

  return (
    <AuthScreen
      intro={<ProductIntro />}
      footer={


        <AuthLink to={routes.signIn} state={joining ? { from: joinPath } : undefined}>
          Already have an account? Sign in
        </AuthLink>
      }>
      <AuthForm
        title={joining ? 'Join the account' : 'Create an account'}
        submitLabel={joining ? 'Join' : 'Create account'}
        errors={errors}
        pending={busy}
        canSubmit={canSubmit}
        onSubmit={submit}>
        {joining && <JoiningNotice preview={preview.data} />}

        {/* The one refusal this form cannot act on: the address is real and
            already registered, so no amount of retyping helps. The way out is
            sign-in, which is a click away rather than a deduction. */}
        {joining && signUp.error instanceof ApiError && signUp.error.status === 409 && (
          <InlineNotice variant="warning">
            Sign in with that address instead — the invitation is still waiting, and you will be
            asked to join once you are in.
          </InlineNotice>
        )}

        <TextField
          label="Name"
          required
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          disabled={busy}
          autoComplete="name"
          error={errors.fields.display_name}
        />
        <EmailField
          label="Email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={busy}
          error={errors.fields.email}
        />
        <PasswordField
          label="Password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={busy}
          autoComplete="new-password"
          hint={`${MIN_PASSWORD_LENGTH}+ characters`}



          error={tooShort ? `At least ${MIN_PASSWORD_LENGTH} characters.` : errors.fields.password}
        />

        {!joining && (
          <>
            <SelectField
              label="Signing up as"
              value={accountType}
              onChange={e => setAccountType(e.target.value as AccountType)}
              disabled={busy}
              options={ACCOUNT_TYPE_OPTIONS}
              error={errors.fields.account_type}
            />
            <Small>A business is invoiced directly and needs its legal details.</Small>
          </>
        )}

        {businessApplies && (
          <BusinessFields
            value={business}
            onChange={setBusiness}
            disabled={busy}
            error={errors.fields.business}
          />
        )}

        <CheckboxField
          label={`${authLegal.acceptDocumentsLabel} terms of service and privacy policy`}
          checked={acceptedDocuments}
          onChange={setAcceptedDocuments}
          disabled={busy}
          error={errors.fields['consent.terms_version'] ?? errors.fields['consent.privacy_version']}>
          <DocumentLink href={authLegal.termsURL}>Terms of service</DocumentLink>
          {' · '}
          <DocumentLink href={authLegal.privacyURL}>Privacy policy</DocumentLink>
        </CheckboxField>

        {waiverApplies && (
          <CheckboxField
            label={authLegal.withdrawalWaiverLabel}
            checked={acceptedWithdrawal}
            onChange={setAcceptedWithdrawal}
            disabled={busy}
            error={errors.fields['consent.withdrawal_waiver_version']}>
            <DocumentLink href={authLegal.withdrawalURL}>
              {authLegal.withdrawalVersionLabel}
            </DocumentLink>
          </CheckboxField>
        )}
      </AuthForm>
    </AuthScreen>
  );
}


function JoiningNotice({
  preview,
  action = 'Signing up here joins it',
}: {
  preview: InvitePreview | undefined;

  action?: string;
}) {
  if (preview === undefined) {
    return (
      <InlineNotice variant="info">
        You were invited to an account that already exists. {action} — no new account is created,
        and its billing and machines are unchanged.
      </InlineNotice>
    );
  }
  return (
    <InlineNotice variant="info">
      You&rsquo;re joining <strong>{preview.account_name}</strong> as{' '}
      <strong>{roleLabel(preview.role)}</strong>
      {preview.inviter_name !== undefined && preview.inviter_name !== ''
        ? `, invited by ${preview.inviter_name}`
        : ''}
      . {action} — no new account is created, and its billing and machines are unchanged.
    </InlineNotice>
  );
}


function AcceptInviteScreen({
  token,
  email,
  preview,
  routes,
  useAcceptInvite,
}: {
  token: string;
  email: string;
  preview: InvitePreview | undefined;
  routes: { session: string };
  useAcceptInvite: ReturnType<typeof useProductPorts>['useAcceptInvite'];
}) {
  const accept = useAcceptInvite();
  const status = accept.error instanceof ApiError ? accept.error.status : undefined;



  if (accept.isSuccess) return <Navigate to={routes.session} replace />;

  return (
    <AuthScreen
      intro={<ProductIntro />}
      footer={<AuthLink to={routes.session}>Not now — go to my sessions</AuthLink>}>
      <AuthForm
        title="Join the account"
        submitLabel="Join"


        errors={partitionFormError(accept.error, [])}
        pending={accept.isPending}
        canSubmit
        onSubmit={() => accept.mutate({ token })}>
        <JoiningNotice
          preview={preview}
          action="Joining adds it to the account you are signed in as"
        />
        <Small>
          You are signed in as {email}. An invitation is only valid for the address it was sent to.
        </Small>

        {/* 404 is every dead state AND "issued to somebody else", deliberately
            indistinguishable — so this names both possibilities rather than
            guessing the one that reads better and might be the wrong one. The
            banner above already says what the relay said; this says what to do
            about it. */}
        {status === 404 && (
          <InlineNotice variant="warning">
            It may have been used, revoked or expired — or sent to an address other than {email},
            in which case sign out and sign in as that one.
          </InlineNotice>
        )}
        {status === 409 && (
          <InlineNotice variant="info">You are already a member of that account.</InlineNotice>
        )}
      </AuthForm>
    </AuthScreen>
  );
}


function InvalidInviteScreen() {
  const { routes } = useProductPorts();
  return (
    <AuthScreen
      intro={<ProductIntro />}
      footer={
        <>
          <AuthLink to={routes.signUp}>Create an account of your own</AuthLink>
          <AuthLink to={routes.signIn}>Already have an account? Sign in</AuthLink>
        </>
      }>
      <div className="flex flex-col gap-4">
        <P className="text-lg font-semibold">That invitation is no longer valid</P>
        <P className="text-sm">
          It may have been used already, been revoked, or expired. Ask the person who invited you
          to send a new one.
        </P>
      </div>
    </AuthScreen>
  );
}


function DocumentLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
      {children}
    </a>
  );
}


function BusinessFields({
  value,
  onChange,
  disabled,
  error,
}: {
  value: BusinessForm;
  onChange: (next: BusinessForm) => void;
  disabled?: boolean;
  error?: string;
}) {
  const set = (patch: Partial<BusinessForm>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-4">
      <Small>Billing details. These go on the invoice.</Small>
      {error !== undefined && (
        <InlineNotice variant="error" role="alert">
          {error}
        </InlineNotice>
      )}
      <TextField
        label="Legal name"
        required
        value={value.legalName}
        onChange={e => set({ legalName: e.target.value })}
        disabled={disabled}
        autoComplete="organization"
        hint="The registered company name."
      />
      <TextField
        label="VAT ID"
        value={value.vatID}
        onChange={e => set({ vatID: e.target.value })}
        disabled={disabled}
        autoCapitalize="characters"
        autoCorrect="off"
        hint="Optional"
      />
      <Small>A business below the registration threshold has no VAT ID and is still a business.</Small>
      <TextField
        label="Address"
        required
        value={value.addressLine1}
        onChange={e => set({ addressLine1: e.target.value })}
        disabled={disabled}
        autoComplete="address-line1"
      />
      <TextField
        label="Address line 2"
        value={value.addressLine2}
        onChange={e => set({ addressLine2: e.target.value })}
        disabled={disabled}
        autoComplete="address-line2"
      />
      <TextField
        label="Postal code"
        required
        value={value.postalCode}
        onChange={e => set({ postalCode: e.target.value })}
        disabled={disabled}
        autoComplete="postal-code"
      />
      <TextField
        label="City"
        required
        value={value.city}
        onChange={e => set({ city: e.target.value })}
        disabled={disabled}
        autoComplete="address-level2"
      />
      <TextField
        label="Country"
        required
        value={value.country}
        onChange={e => set({ country: e.target.value })}
        disabled={disabled}
        autoComplete="country"
        autoCapitalize="characters"
        autoCorrect="off"
        maxLength={2}
        hint="e.g. DE"
      />
      <Small>
        Two letters, ISO 3166-1. It is what decides whether the reverse charge applies.
      </Small>
    </div>
  );
}


function ContactPendingNotice({ onContinue }: { onContinue: () => void }) {
  const { authLegal } = useProductPorts();
  return (
    <AuthScreen>
      <div className="flex flex-col gap-4">
        <P className="text-lg font-semibold">Your account is ready</P>
        <P className="text-sm">{authLegal.contactPendingNotice}</P>
        <Button variant="primary" className="w-full" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </AuthScreen>
  );
}
