import { InlineNotice, Page, Small } from '@contenox/ui';
import { useEffect, useState } from 'react';
import { SectionForm, SelectField, TextField } from '@contenox/ui';
import { ScreenError, ScreenLoading } from '../ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type {
  Account,
  AccountType,
  BusinessDetails,
  UpdateAccountRequest,
} from '../../lib/api/types';
import { partitionFormError } from './lib/formErrors';


const FIELDS = ['name', 'slug', 'account_type', 'business'] as const;


const UNSET = '';

const ACCOUNT_TYPE_OPTIONS = [
  { value: UNSET, label: 'Not recorded' },
  { value: 'consumer', label: 'An individual' },
  { value: 'business', label: 'A business' },
];

interface BusinessForm {
  legal_name: string;
  vat_id: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  country: string;
}

const EMPTY_BUSINESS: BusinessForm = {
  legal_name: '',
  vat_id: '',
  address_line1: '',
  address_line2: '',
  postal_code: '',
  city: '',
  country: '',
};

function businessFormOf(business: BusinessDetails | undefined): BusinessForm {
  if (business === undefined) return EMPTY_BUSINESS;
  return {
    legal_name: business.legal_name,
    vat_id: business.vat_id ?? '',
    address_line1: business.address_line1,
    address_line2: business.address_line2 ?? '',
    postal_code: business.postal_code,
    city: business.city,
    country: business.country,
  };
}

function businessComplete(form: BusinessForm): boolean {
  return (
    form.legal_name.trim() !== '' &&
    form.address_line1.trim() !== '' &&
    form.postal_code.trim() !== '' &&
    form.city.trim() !== '' &&
    form.country.trim() !== ''
  );
}

function businessPayload(form: BusinessForm): BusinessDetails {
  const details: BusinessDetails = {
    legal_name: form.legal_name.trim(),
    address_line1: form.address_line1.trim(),
    postal_code: form.postal_code.trim(),
    city: form.city.trim(),
    country: form.country.trim().toUpperCase(),
  };
  if (form.vat_id.trim() !== '') details.vat_id = form.vat_id.trim();
  if (form.address_line2.trim() !== '') details.address_line2 = form.address_line2.trim();
  return details;
}

export default function AccountDetailsPage() {
  const { routes, useAccount, useAuth } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const { data, isPending, error, refetch, isFetching } = useAccount(accountID);

  return (
    <Page header={<ScreenHeader title="Account details" />}>
      <ScreenBody width="band">
        <BackTo to={routes.account} label="Account" />
        {isPending && <ScreenLoading label="Loading the account" />}
        {error && (
          <ScreenError error={error} onRetry={() => void refetch()} retrying={isFetching} />
        )}
        {data && <DetailsForm account={data} />}
      </ScreenBody>
    </Page>
  );
}

function DetailsForm({ account }: { account: Account }) {
  const { useUpdateAccount } = useProductPorts();
  const update = useUpdateAccount(account.id);
  const [name, setName] = useState(account.name);
  const [slug, setSlug] = useState(account.slug);
  const [accountType, setAccountType] = useState<string>(account.account_type ?? UNSET);
  const [business, setBusiness] = useState<BusinessForm>(businessFormOf(account.business));





  useEffect(() => {
    setName(account.name);
    setSlug(account.slug);
    setAccountType(account.account_type ?? UNSET);
    setBusiness(businessFormOf(account.business));
  }, [account]);

  const errors = partitionFormError(update.error, FIELDS);
  const isBusiness = accountType === 'business';
  const canSubmit =
    name.trim() !== '' && slug.trim() !== '' && (!isBusiness || businessComplete(business));

  const submit = () => {
    if (!canSubmit) return;
    const body: UpdateAccountRequest = { name: name.trim(), slug: slug.trim() };



    if (accountType !== UNSET) body.account_type = accountType as AccountType;
    if (isBusiness) body.business = businessPayload(business);
    update.mutate(body);
  };

  const busy = update.isPending;

  return (
    <SectionForm
      title="Account identity"
      submitLabel="Save"
      errors={errors}
      pending={busy}
      canSubmit={canSubmit}
      onSubmit={submit}
      note={
        update.isSuccess ? (
          <InlineNotice variant="info" role="status">
            Saved.
          </InlineNotice>
        ) : undefined
      }>
      <TextField
        label="Account name"
        required
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={busy}
        error={errors.fields.name}
      />
      <TextField
        label="Handle"
        required
        value={slug}
        onChange={e => setSlug(e.target.value)}
        disabled={busy}
        autoCapitalize="none"
        autoCorrect="off"
        error={errors.fields.slug}
      />

      <Small>
        Lower-case letters, digits and single hyphens. Nothing links to it, so changing it breaks
        nothing.
      </Small>
      <SelectField
        label="This account is for"
        value={accountType}
        onChange={e => setAccountType(e.target.value)}
        disabled={busy}
        options={ACCOUNT_TYPE_OPTIONS}
        error={errors.fields.account_type}
      />
      <Small>It decides how an invoice is addressed and taxed, not what the product does.</Small>

      {accountType === UNSET && (
        <Small>
          Nothing has been recorded for this account. Leaving it that way is fine; choosing one
          writes it and cannot be unset.
        </Small>
      )}

      {isBusiness && (
        <div className="flex flex-col gap-4">
          <Small>Billing details. These go on the invoice.</Small>
          {errors.fields.business !== undefined && (
            <InlineNotice variant="error" role="alert">
              {errors.fields.business}
            </InlineNotice>
          )}
          <TextField
            label="Legal name"
            required
            value={business.legal_name}
            onChange={e => setBusiness({ ...business, legal_name: e.target.value })}
            disabled={busy}
            autoComplete="organization"
          />
          <Small>The registered company name, which is not the account name above.</Small>
          <TextField
            label="VAT ID"
            value={business.vat_id}
            onChange={e => setBusiness({ ...business, vat_id: e.target.value })}
            disabled={busy}
            autoCapitalize="characters"
            autoCorrect="off"
            hint="Optional"
          />
          <Small>
            A business below the registration threshold has none, and is still a business.
          </Small>
          <TextField
            label="Address"
            required
            value={business.address_line1}
            onChange={e => setBusiness({ ...business, address_line1: e.target.value })}
            disabled={busy}
            autoComplete="address-line1"
          />
          <TextField
            label="Address line 2"
            value={business.address_line2}
            onChange={e => setBusiness({ ...business, address_line2: e.target.value })}
            disabled={busy}
            autoComplete="address-line2"
          />
          <TextField
            label="Postal code"
            required
            value={business.postal_code}
            onChange={e => setBusiness({ ...business, postal_code: e.target.value })}
            disabled={busy}
            autoComplete="postal-code"
          />
          <TextField
            label="City"
            required
            value={business.city}
            onChange={e => setBusiness({ ...business, city: e.target.value })}
            disabled={busy}
            autoComplete="address-level2"
          />
          <TextField
            label="Country"
            required
            value={business.country}
            onChange={e => setBusiness({ ...business, country: e.target.value })}
            disabled={busy}
            autoComplete="country"
            autoCapitalize="characters"
            autoCorrect="off"
            maxLength={2}
            hint="e.g. DE"
          />
          <Small>Two letters, ISO 3166-1. It decides whether the reverse charge applies.</Small>
        </div>
      )}
    </SectionForm>
  );
}
