import { Badge, Button, Card, P, Small } from '@contenox/ui';
import { TextField } from '@contenox/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefusalCta } from '../RefusalCta';
import { ScreenError } from '../ScreenState';
import { useProductPorts } from '../../ports';
import type { AccountMembership } from '../../lib/api/types';
import { roleLabel } from '../../lib/roles';

export function TeamsCard() {
  const {
    routes,
    refusalSell,
    useAuth,
    useCreateAccount,
    useOwnedAccounts,
    useStartCheckout,
    useSwitchAccount,
  } = useProductPorts();
  const { accounts, accountID } = useAuth();
  const switchAccount = useSwitchAccount();
  const owned = useOwnedAccounts();
  const create = useCreateAccount();
  const navigate = useNavigate();
  const target = upgradeTarget(accounts, accountID);
  const checkout = useStartCheckout(target?.id ?? '');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');






  const canCreate = owned.data?.can_create !== false;
  const suspended = (owned.data?.suspended ?? 0) > 0;

  const upgrade = () => {
    if (target === undefined) return;
    checkout.mutate();
  };





  const submit = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    create.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName('');
          setNaming(false);
          void navigate(routes.team);
        },
      },
    );
  };

  return (
    <Card variant="filled" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <P className="font-medium">Teams</P>
        <Small>{accounts.length === 1 ? '1 team' : `${accounts.length} teams`}</Small>
      </div>

      <ul className="flex flex-col gap-2">
        {accounts.map(account => {
          const isActive = account.id === accountID;
          return (
            <li key={account.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <P className="truncate text-sm font-medium">{account.name}</P>
                <Small>{roleLabel(account.role)}</Small>
              </div>
              {isActive ? (
                <Badge variant="primary" size="sm">
                  Active
                </Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={() => switchAccount(account.id)}>
                  Switch
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {naming ? (
        <div className="flex flex-col gap-3">
          <TextField
            label="Team name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={create.isPending}
            placeholder="Acme Engineering"


            hint="The people you invite will see this name."
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={submit}
              isLoading={create.isPending}
              disabled={name.trim() === ''}>
              Create team
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNaming(false);
                setName('');
                create.reset?.();
              }}
              disabled={create.isPending}>
              Cancel
            </Button>
          </div>

          {create.error && refusalSell(create.error) === null && (
            <ScreenError error={create.error} />
          )}
          <RefusalCta error={create.error} />
        </div>
      ) : (
        <>
          <Button variant="outline" onClick={() => setNaming(true)} disabled={!canCreate}>
            New team
          </Button>

          {!canCreate &&
            (suspended ? (


              <Small>
                An account you own is suspended. That has to be lifted before you can create another
                team.
              </Small>
            ) : (
              <div className="flex flex-col gap-2">

                <Small>
                  Free includes one team. Upgrading to Pro lets you create as many as you need.
                </Small>
                {target === undefined ? (
                  <Small>
                    The wall is on the teams you own. Switch to the one you want on Pro and upgrade
                    it there — paying for a team you are only an admin of would move nothing.
                  </Small>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      className="self-start"
                      onClick={upgrade}
                      isLoading={checkout.isPending}>
                      {target.id === accountID ? 'Upgrade this team' : `Upgrade ${target.name}`}
                    </Button>
                    {checkout.error && <ScreenError error={checkout.error} />}
                  </>
                )}
              </div>
            ))}
        </>
      )}
    </Card>
  );
}


function upgradeTarget(
  accounts: AccountMembership[],
  accountID: string | null,
): AccountMembership | undefined {
  const owned = accounts.filter(account => account.role === 'tenant_owner');
  const active = owned.find(account => account.id === accountID);
  if (active !== undefined) return active;
  return owned.length === 1 ? owned[0] : undefined;
}
