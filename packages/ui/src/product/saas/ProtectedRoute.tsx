import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Page } from '../../components/Page';
import { P } from '../../components/Typography';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useProductPorts } from '../ports';
import { TextField } from '../../components/forms/Fields';
import { ScreenError, ScreenLoading } from './ScreenState';

/**
 * The gate.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { routes, useAuth } = useProductPorts();
  const { user, accountID, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <ScreenLoading label="Checking your session" />;
  if (!user) {
    return <Navigate to={routes.signIn} replace state={{ from: location.pathname }} />;
  }
  if (accountID === null) return <NoAccount />;
  return <>{children}</>;
}


function NoAccount() {
  const { useCreateAccount, useSignOut } = useProductPorts();
  const signOut = useSignOut();
  const create = useCreateAccount();
  const [name, setName] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;


    create.mutate({ name: trimmed });
  };

  return (
    <Page>
      <div className="flex min-h-full flex-col justify-center gap-4 p-4">
        <Card variant="filled" className="flex flex-col gap-4">
          <P className="text-lg font-semibold">You are not on any team</P>
          <P className="text-sm">
            Your sign-in still works, but it is not attached to a team — so there is nothing to pair
            a machine to and nothing to bill. Make one, or accept an invitation to somebody else's.
          </P>
          <TextField
            label="Team name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={create.isPending}
            placeholder="Acme Engineering"
          />
          <Button
            variant="primary"
            onClick={submit}
            isLoading={create.isPending}
            disabled={name.trim() === ''}>
            Create a team
          </Button>
          {create.error !== null && create.error !== undefined && (
            <ScreenError error={create.error} />
          )}
          <Button
            variant="outline"
            onClick={() => signOut.mutate(undefined)}
            isLoading={signOut.isPending}>
            Sign out
          </Button>
        </Card>
      </div>
    </Page>
  );
}
