import { Badge, Button, Card, KeyValue, P, Page, Small } from '@contenox/ui';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ScreenError, ScreenLoading } from '../ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { LegalLinks } from '../LegalLinks';
import { TeamsCard } from './TeamsCard';
import { useProductPorts } from '../../ports';
import { formatDate } from '../../lib/relativeTime';
import type { Account, BillingStatus, Usage, UsageRow } from '../../lib/api/types';

export default function AccountPage() {
  const { routes, useAccount, useAuth, useBillingStatus, useSignOut, useUsage } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const { user } = useAuth();
  const { data, isPending, error, refetch, isFetching } = useAccount(accountID);
  const billing = useBillingStatus(accountID);
  const usage = useUsage(accountID);
  const signOut = useSignOut();

  return (
    <Page
      header={
        <ScreenHeader
          title="Account"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut.mutate()}
              isLoading={signOut.isPending}>
              Sign out
            </Button>
          }
        />
      }>
      <ScreenBody width="band">
        {user && (
          <Card variant="filled">
            <KeyValue label="Signed in as" value={user.email} />
          </Card>
        )}
        {isPending && <ScreenLoading label="Loading your plan" />}
        {error && (
          <ScreenError error={error} onRetry={() => void refetch()} retrying={isFetching} />
        )}
        {data && <PlanCard account={data} billing={billing.data} />}

        {usage.data && <AllowanceCard usage={usage.data} paired={data?.active_instances} />}


        <TeamsCard />

        <nav aria-label="Account settings" className="flex flex-col gap-2">
          <SettingLink to={routes.profile} title="Your details">
            Name, email and password
          </SettingLink>
          <SettingLink to={routes.accountDetails} title="Account details">
            What this account is called, and who the invoice is for
          </SettingLink>
          <SettingLink to={routes.accountSessions} title="Signed-in devices">
            Every browser holding a session, and how to end them
          </SettingLink>
          <SettingLink to={routes.team} title="Team">
            Who else is on this account, and who has been invited
          </SettingLink>
          <SettingLink to={routes.consumers} title="Event consumers">
            Endpoints your systems post events to, each running a chain on a machine
          </SettingLink>
          <SettingLink to={routes.accountData} title="Your data">
            Download everything we hold, or delete it
          </SettingLink>
        </nav>


        <LegalLinks />
      </ScreenBody>
    </Page>
  );
}


function SettingLink({ to, title, children }: { to: string; title: string; children: ReactNode }) {
  return (
    <Link to={to} className="block">
      <Card variant="filled" className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <P className="font-medium">{title}</P>
          <Small>{children}</Small>
        </div>
        <ChevronRight
          className="text-text-muted dark:text-dark-text-muted h-5 w-5 shrink-0"
          aria-hidden
        />
      </Card>
    </Link>
  );
}




function AllowanceCard({ usage, paired }: { usage: Usage; paired?: number }) {
  return (
    <Card variant="filled">
      <div className="flex flex-col gap-1" aria-label="AI allowance this week">
        <Small>AI allowance this week</Small>
        {allowanceRows(usage).map(row => (
          <div key={row.model} className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm">{row.model}</span>
            <span className="text-text-muted dark:text-dark-text-muted shrink-0 font-mono text-xs">
              {usageLabel(row)}
            </span>
          </div>
        ))}
        {paired !== undefined && (
          <Small className="text-text-muted dark:text-dark-text-muted">
            {paired} paired {paired === 1 ? 'machine' : 'machines'} · allowance covers{' '}
            {usage.entitled_hosts}
          </Small>
        )}
        {usage.next_refill_at && (
          <Small className="text-text-muted dark:text-dark-text-muted">
            Resets {formatDate(usage.next_refill_at)}
          </Small>
        )}
      </div>
    </Card>
  );
}


function allowanceRows(usage: Usage): UsageRow[] {
  const allowances = usage.allowances ?? [];
  const used = new Map(usage.by_model.map(row => [row.model, row]));
  const rows = allowances.map(allowance => {
    const observed = used.get(allowance.model);
    if (observed) return observed;
    return {
      model: allowance.model,
      output_tokens: 0,
      output_allowance: allowance.output_allowance,
      input_tokens: 0,
      input_allowance: allowance.input_allowance,
    };
  });
  const granted = new Set(allowances.map(allowance => allowance.model));
  for (const row of usage.by_model) {
    if (!granted.has(row.model)) rows.push(row);
  }
  return rows;
}


function usageLabel(row: UsageRow): string {
  const fmt = (n: number) => n.toLocaleString('en-US');
  return `${fmt(row.output_tokens)} of ${fmt(row.output_allowance)} output · ${fmt(row.input_tokens)} of ${fmt(row.input_allowance)} input`;
}

function allowanceLabel(account: Account): string {
  if (account.entitled_instances === undefined) {
    return `${account.active_instances} paired, unlimited allowance`;
  }
  return `${account.active_instances} of ${account.entitled_instances} paired`;
}


function subscriptionNote(account: Account): string | null {
  switch (account.subscription_state) {
    case 'grace':
      return 'A payment did not go through. Your machines keep working while it is retried.';
    case 'on_hold':
      return 'A payment failed and the subscription is on hold.';
    case 'paused':
      return 'The subscription is paused.';
    case 'canceled':
      return 'Cancelled. It stays active until the end of the period you have paid for.';
    case 'expired':
      return 'The subscription has ended.';
    default:
      return null;
  }
}


function PlanCard({ account, billing }: { account: Account; billing?: BillingStatus }) {
  const {
    commerce: { contactMailto, proPriceLabel },
    useOpenBillingPortal,
    useStartCheckout,
  } = useProductPorts();
  const checkout = useStartCheckout(account.id);
  const portal = useOpenBillingPortal(account.id);

  const isPro = account.plan === 'pro';
  const note = subscriptionNote(account);
  const canSubscribe = billing?.can_subscribe === true;
  const canManageBilling = billing?.can_manage_billing === true;




  const billedDirectly = billing?.billed_directly === true;


  const unentitled = billing?.entitled === false;




  const atAllowance =
    account.entitled_instances !== undefined &&
    account.active_instances >= account.entitled_instances;

  return (
    <Card variant="filled" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant={isPro ? 'primary' : 'default'} size="md">
          {isPro ? 'Pro' : 'Free'}
        </Badge>
        <Small>{allowanceLabel(account)}</Small>
      </div>

      {note && <P className="text-sm">{note}</P>}

      {account.suspended && (
        <P className="text-error dark:text-dark-error text-sm">
          This account is suspended. Pairing and connecting are refused until that is lifted.
        </P>
      )}

      {canSubscribe && (
        <>

          <P className="text-sm">
            Free includes you and up to three invited teammates, with one paired machine per active
            member. Pro is {proPriceLabel}: 25 machines and 25 invited seats.
          </P>
          <Button
            variant="primary"
            onClick={() => checkout.mutate()}
            isLoading={checkout.isPending}
            disabled={account.suspended}>
            Upgrade to Pro
          </Button>
          {checkout.error && <ScreenError error={checkout.error} />}
          {atAllowance && (
            <Small>
              You are at your allowance. Revoke a machine on Hosts to free the slot, or upgrade.
            </Small>
          )}
        </>
      )}

      {canManageBilling && (
        <>
          <Button variant="outline" onClick={() => portal.mutate()} isLoading={portal.isPending}>
            Manage billing
          </Button>
          {portal.error && <ScreenError error={portal.error} />}
          {unentitled && (
            <Small>
              Pairing a further machine needs an active subscription. Manage billing to restore it.
            </Small>
          )}
        </>
      )}

      {billedDirectly && <Small>This account is billed directly. Talk to us to change it.</Small>}


      <Small>
        Want us to run the machines for you? We take on a few design partners —{' '}
        <a
          href={contactMailto}
          className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
          talk to us
        </a>
        .
      </Small>
    </Card>
  );
}
