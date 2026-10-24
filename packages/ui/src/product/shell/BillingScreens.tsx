import { Button, Card, InlineNotice, KeyValue, P, ScreenBody, Small, Page, Textarea } from '@contenox/ui';
import { useState } from 'react';
import type { ProductMutation, ProductQuery } from '../ports';
import { ScreenError, ScreenLoading } from '../saas/ScreenState';
import { ScreenHeader } from './ScreenHeader';

export interface SubscriptionStatus {
  accountID: string;
  source: string;
  state: string;
  entitled: boolean;
  canSubscribe: boolean;
  canManageBilling: boolean;
  checkedAt?: string;
  reconciled: boolean;
}

export interface PlanEntitlement {
  roles: string[];
  allowance: Record<string, number>;
  consumed: Record<string, number>;
  capabilities: string[];
  denied?: boolean;
  deniedBy?: string;
	reason?: string;
	licenseRedemptionAvailable?: boolean;
	license?: { id: string; role: string; expiresAt?: string };
}


const STATE_LABELS: Record<string, string> = {
  none: 'Not subscribed',
  active: 'Subscribed',
  grace: 'Payment failed — retrying',
  on_hold: 'Payment failed — subscription on hold',
  paused: 'Paused',
  canceled: 'Cancelled — active until the period ends',
  expired: 'Ended',
};

export function BillingPlanCard({
  status,
  entitlement,
  checkout,
  portal,
}: {
  status: ProductQuery<SubscriptionStatus>;
  entitlement?: ProductQuery<PlanEntitlement>;
  checkout: ProductMutation<void, string>;
  portal: ProductMutation<void, string>;
}) {
  if (status.isPending) return <ScreenLoading label="Loading billing" />;
  if (status.error) {
    return <ScreenError error={status.error} onRetry={() => void status.refetch()} retrying={status.isFetching} />;
  }
  const data = status.data;
  if (!data) return null;


  const capabilities = entitlement?.data?.capabilities ?? [];
  const roles = entitlement?.data?.roles ?? [];
  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <P className="font-medium">Plan</P>
      <KeyValue label="Status" value={STATE_LABELS[data.state] ?? data.state} />
      <KeyValue label="Entitled" value={data.entitled ? 'Yes' : 'No'} />
      {entitlement?.data && (
        <KeyValue
          label="Roles"
          value={roles.length > 0 ? roles.join(', ') : 'none'}
        />
      )}
      {entitlement?.data?.allowance?.seats !== undefined && (
        <KeyValue
          label="Seats"
          value={`${entitlement.data.consumed?.seats ?? 0} of ${entitlement.data.allowance.seats}`}
        />
      )}
      {capabilities.length > 0 && <KeyValue label="Includes" value={capabilities.join(', ')} />}

      {entitlement?.data?.denied && (
        <InlineNotice variant="warning" role="alert">
          {entitlement.data.reason ?? 'This account\'s access is withheld.'}
        </InlineNotice>
      )}
      {data.source === 'manual' && <Small>This account is invoiced directly rather than through checkout.</Small>}
      {data.checkedAt && <Small>Last checked against the provider {new Date(data.checkedAt).toLocaleString()}</Small>}

      <div className="flex flex-wrap gap-2">
        {data.canSubscribe && (
          <Button onClick={() => checkout.mutate()} isLoading={checkout.isPending}>
            Subscribe
          </Button>
        )}
        {data.canManageBilling && (
          <Button variant="outline" onClick={() => portal.mutate()} isLoading={portal.isPending}>
            Manage billing
          </Button>
        )}
      </div>
      {checkout.error && <ScreenError error={checkout.error} />}
      {portal.error && <ScreenError error={portal.error} />}
    </Card>
  );
}

export function BillingScreen({
  status,
  entitlement,
  checkout,
	portal,
	redeemLicense,
}: {
  status: ProductQuery<SubscriptionStatus>;
  entitlement?: ProductQuery<PlanEntitlement>;
  checkout: ProductMutation<void, string>;
	portal: ProductMutation<void, string>;
	redeemLicense?: ProductMutation<string, PlanEntitlement>;
}) {
	const [license, setLicense] = useState('');
	return (
    <Page header={<ScreenHeader title="Billing" />}>
      <ScreenBody width="narrow">
		<BillingPlanCard status={status} entitlement={entitlement} checkout={checkout} portal={portal} />
		{entitlement?.data?.licenseRedemptionAvailable && redeemLicense ? (
			<Card variant="filled" className="flex flex-col gap-3">
				<P className="font-medium">Workspace license</P>
				{entitlement.data.license ? (
					<KeyValue
						label="Active license"
						value={`${entitlement.data.license.role}${entitlement.data.license.expiresAt ? ` until ${new Date(entitlement.data.license.expiresAt).toLocaleDateString()}` : ''}`}
					/>
				) : <Small>Paste a license issued specifically for this workspace.</Small>}
				<Textarea
					aria-label="Workspace license"
					rows={6}
					value={license}
					disabled={redeemLicense.isPending}
					onChange={event => setLicense(event.target.value)}
				/>
				<div><Button disabled={license.trim() === ''} isLoading={redeemLicense.isPending} onClick={() => redeemLicense.mutate(license, { onSuccess: () => setLicense('') })}>Activate license</Button></div>
				{redeemLicense.error && <ScreenError error={redeemLicense.error} />}
			</Card>
		) : null}
	  </ScreenBody>
    </Page>
  );
}

export function PaymentFailureBanner({
  status,
  canManageBilling,
  portal,
}: {
  status: ProductQuery<SubscriptionStatus>;
  canManageBilling: boolean;
  portal: ProductMutation<void, string>;
}) {


  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('cnx-billing-banner-dismissed') === 'true',
  );
  const state = status.data?.state;
  if (dismissed || (state !== 'grace' && state !== 'on_hold')) return null;
  const dismiss = () => {
    sessionStorage.setItem('cnx-billing-banner-dismissed', 'true');
    setDismissed(true);
  };
  return (
    <InlineNotice variant="warning" role="alert" onDismiss={dismiss}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {canManageBilling
            ? 'A payment failed — update the card in billing.'
            : 'A payment failed. Ask an account admin to update the card in billing.'}
        </span>
        {canManageBilling && (
          <Button variant="outline" size="sm" onClick={() => portal.mutate()} isLoading={portal.isPending}>
            Open billing
          </Button>
        )}
      </div>
    </InlineNotice>
  );
}
