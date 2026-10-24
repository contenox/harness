import { Button, Card, InlineNotice, P, Small } from '@contenox/ui';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CopyValueButton, InlineCode } from '@contenox/ui';
import { RefusalCta } from '../RefusalCta';
import { ScreenError } from '../ScreenState';
import { useProductPorts } from '../../ports';
import { deadlineFromMint, formatRemaining, useCountdown, type Deadline } from './countdown';
import type { Account, MintKeyResponse } from '../../lib/api/types';
import { canManageMembers } from '../../lib/roles';

export function PairingKeyPanel({ accountID }: { accountID: string }) {
  const { routes, useAccount, useAuth, useMintPairingKey } = useProductPorts();
  const mint = useMintPairingKey(accountID);
  const account = useAccount(accountID);
  const { accounts } = useAuth();
  const viewerRole = accounts.find(membership => membership.id === accountID)?.role;
  const navigate = useNavigate();
  const [minted, setMinted] = useState<MintKeyResponse | null>(null);



  const [deadline, setDeadline] = useState<Deadline | null>(null);
  const remaining = useCountdown(deadline);
  const expired = minted !== null && remaining === 0;





  const atLimit =
    account.data?.entitled_instances !== undefined &&
    account.data.active_instances >= account.data.entitled_instances;




  const canUpgrade = account.data?.can_subscribe === true;





  const canPoolAnotherSlot =
    atLimit && account.data?.plan === 'free' && canManageMembers(viewerRole);

  const groups = useMemo(() => (minted ? minted.key.split('-') : []), [minted]);

  return (
    <Card variant="filled" className="flex flex-col gap-4">
      {minted === null ? (
        <>
          <P className="text-sm">
            Run <InlineCode>/pair</InlineCode> in a session on the machine you want to reach, and
            type the key it asks for.
          </P>
          {account.data && <Small>{machinesLine(account.data)}</Small>}
          {atLimit ? (
            <>
              <Small>
                {canUpgrade
                  ? 'Every machine slot on this plan is in use. Revoke a machine below to free its slot, or upgrade.'
                  : 'Every machine slot on this plan is in use. Revoke a machine below to free its slot.'}
              </Small>
              {canPoolAnotherSlot && (
                <Small>
                  Free gives this account one machine slot per person on it, so{' '}
                  <Link
                    to={routes.team}
                    className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
                    inviting a teammate
                  </Link>{' '}
                  adds one as well.
                </Small>
              )}
              {canUpgrade && (
                <Button variant="primary" onClick={() => void navigate(routes.account)}>
                  Upgrade
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => mintInto(mint, setMinted, setDeadline)}
              isLoading={mint.isPending}>
              Show a pairing key
            </Button>
          )}
        </>
      ) : (
        <>
          <div
            className="flex flex-col items-center gap-3 py-2"



            aria-live="polite">
            <output
              className="font-mono text-3xl leading-tight font-semibold tracking-widest break-all
                         select-all sm:text-4xl"


              aria-label={`Pairing key ${minted.key}`}>
              {groups.map((group, i) => (
                <span key={i} className="mr-2 inline-block">
                  {group}
                </span>
              ))}
            </output>
            {expired ? (
              <Small className="text-error dark:text-dark-error">
                Expired. Mint another — this one will be refused.
              </Small>
            ) : (
              <Small>Expires in {formatRemaining(remaining)}</Small>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyValueButton value={minted.key} label="Copy" size="md" className="flex-1" />
            <Button
              variant={expired ? 'primary' : 'outline'}
              className="flex-1"
              onClick={() => mintInto(mint, setMinted, setDeadline)}
              isLoading={mint.isPending}>
              Mint another
            </Button>
          </div>

          <InlineNotice variant="info">
            Shown once. The relay keeps only a digest of it, so there is no way back to this key —
            mint another if you lose it.
          </InlineNotice>
        </>
      )}
      {mint.error && <ScreenError error={mint.error} />}

      <RefusalCta error={mint.error} />
    </Card>
  );
}


function machinesLine(account: Account): string {
  if (account.entitled_instances === undefined) {
    return `${account.active_instances} machines paired, unlimited allowance.`;
  }
  return `${account.active_instances} of ${account.entitled_instances} machines paired.`;
}


function mintInto(
  mint: ReturnType<ReturnType<typeof useProductPorts>['useMintPairingKey']>,
  setMinted: (value: MintKeyResponse) => void,
  setDeadline: (value: Deadline) => void,
) {
  mint.mutate(undefined, {
    onSuccess: response => {
      setMinted(response);
      setDeadline(deadlineFromMint(response, Date.now()));
    },
  });
}
