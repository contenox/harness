import { Badge, Button, Card, EmptyState, P, Page, Small } from '@contenox/ui';
import { MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import { ListCard } from '@contenox/ui';
import { ScreenError, ScreenLoading } from '../ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type { BrowserSession } from '../../lib/api/types';
import {
  browserSessionLabel,
  browserSessionState,
  canRevoke,
  signedInElsewhere,
  type BrowserSessionState,
} from './lib/browserSessions';
import { relativeTime } from '../../lib/relativeTime';

export default function SessionsPage() {
  const { routes, useBrowserSessions, useRevokeOtherSessions } = useProductPorts();
  const { data, isPending, error, refetch, isFetching } = useBrowserSessions();
  const revokeOthers = useRevokeOtherSessions();
  const [confirming, setConfirming] = useState(false);

  const others = signedInElsewhere(data ?? [], Date.now());

  return (
    <Page header={<ScreenHeader title="Signed-in devices" />}>
      <ScreenBody width="band">
        <BackTo to={routes.account} label="Account" />
        {isPending && <ScreenLoading label="Loading your sessions" />}
        {error && (
          <ScreenError error={error} onRetry={() => void refetch()} retrying={isFetching} />
        )}

        {data && others > 0 && (
          <Card variant="filled" className="flex flex-col gap-3">
            <P className="text-sm">
              You are signed in on {others === 1 ? 'one other browser' : `${others} other browsers`}
              .
            </P>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Sign out everywhere else
            </Button>
          </Card>
        )}

        {data?.length === 0 && (
          <EmptyState
            icon={<MonitorSmartphone aria-hidden />}
            title="No sessions"
            description="Nothing has been issued to a browser for this account."
          />
        )}

        {data?.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </ScreenBody>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Sign out everywhere else?"
        confirmLabel="Sign the others out"
        pending={revokeOthers.isPending}
        error={revokeOthers.error}
        onConfirm={() => revokeOthers.mutate(undefined, { onSuccess: () => setConfirming(false) })}>
        <P className="text-sm">
          {others === 1 ? 'One other browser' : `${others} other browsers`} will be signed out
          immediately and will have to sign in again. This browser stays signed in.
        </P>
        <P className="text-sm">
          Your machines keep running. A session is a browser's, not a machine's — nothing paired is
          affected.
        </P>
      </ConfirmDialog>
    </Page>
  );
}


const BADGE_VARIANTS: Record<BrowserSessionState, 'success' | 'default' | 'outline'> = {
  current: 'success',
  signed_in: 'default',
  expired: 'outline',
  signed_out: 'outline',
};


function SessionCard({ session }: { session: BrowserSession }) {
  const { useRevokeSession } = useProductPorts();
  const revoke = useRevokeSession();
  const [confirming, setConfirming] = useState(false);
  const state = browserSessionState(session, Date.now());

  return (
    <ListCard
      title={



        describeAgent(session.user_agent)
      }
      titleClassName="font-medium break-words"
      meta={<Small>{activityLabel(session, state)}</Small>}
      trailing={
        <Badge variant={BADGE_VARIANTS[state]} className="shrink-0 whitespace-nowrap">
          {browserSessionLabel(state)}
        </Badge>
      }>
      {canRevoke(state) && (
        <div className="flex justify-end">
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            Sign out
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Sign this browser out?"
        confirmLabel="Sign it out"
        pending={revoke.isPending}
        error={revoke.error}
        onConfirm={() => revoke.mutate(session.id, { onSuccess: () => setConfirming(false) })}>
        <P className="text-sm">
          {describeAgent(session.user_agent)} stops being signed in immediately and has to sign in
          again. Nothing else changes — your machines keep running and no other browser is touched.
        </P>
      </ConfirmDialog>
    </ListCard>
  );
}


function describeAgent(userAgent: string): string {
  const trimmed = userAgent.trim();
  if (trimmed === '') return 'An unnamed browser';
  return trimmed.length > 72 ? `${trimmed.slice(0, 72)}…` : trimmed;
}


function activityLabel(session: BrowserSession, state: BrowserSessionState): string {
  if (state === 'signed_out' && session.revoked_at !== null) {
    return `Signed out ${relativeTime(session.revoked_at, 'just now')}`;
  }
  if (state === 'expired') {
    return `Expired ${relativeTime(session.expires_at, 'just now')}`;
  }
  if (session.last_seen_at !== null) {
    return `Last used ${relativeTime(session.last_seen_at, 'just now')}`;
  }
  return `Signed in ${relativeTime(session.created_at, 'just now')}, not used since`;
}
