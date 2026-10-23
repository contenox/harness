import { Button } from '../../components/Button';
import { InlineNotice } from '../../components/InlineNotice';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useProductPorts } from '../ports';



function bannerBelongsOn(
  pathname: string,
  routes: { session: string; hosts: string; account: string; asks: string },
): boolean {
  return (
    [routes.session, routes.hosts, routes.account].includes(pathname) ||
    pathname === routes.asks ||
    pathname.startsWith(`${routes.asks}/`)
  );
}


const DISMISSED_KEY = 'cnx-billing-banner-dismissed';

/**
 * Payment trouble, said while the relay is still honouring the subscription instead of after it stops.
 */
export function BillingBanner() {
  const { routes, useAccount, useAuth, useOpenBillingPortal } = useProductPorts();
  const { pathname } = useLocation();
  const { accountID, accounts } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED_KEY) === 'true',
  );
  const account = useAccount(accountID ?? '');
  const portal = useOpenBillingPortal(accountID ?? '');

  if (accountID === null || dismissed || !bannerBelongsOn(pathname, routes)) return null;
  const state = account.data?.subscription_state;
  if (state !== 'grace' && state !== 'on_hold') return null;

  const role = accounts.find(membership => membership.id === accountID)?.role;
  const canOpenBilling = role === 'tenant_owner' || role === 'tenant_admin';

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <InlineNotice variant="warning" role="alert" onDismiss={dismiss}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {canOpenBilling
            ? 'A payment failed — update the card in billing.'
            : 'A payment failed. Ask an account admin to update the card in billing.'}
        </span>
        {canOpenBilling && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => portal.mutate(undefined)}
            isLoading={portal.isPending}>
            Open billing
          </Button>
        )}
      </div>
    </InlineNotice>
  );
}
