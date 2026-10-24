import { Button, Card, EmptyState, P, Page, Small } from '@contenox/ui';
import { ChevronRight, Server } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HostStateBadge } from '../saas/HostStateBadge';
import { ListSkeleton, ScreenError } from '../saas/ScreenState';
import { ScreenHeader } from '../shell/ScreenHeader';
import { ScreenBody } from '@contenox/ui';
import { useProductPorts } from '../ports';
import type { Instance } from '../lib/api/types';
import { hostDetail, isReachable } from '../lib/hostState';

export default function HostPickerPage() {
  const { routes, useAuth, useHosts } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const navigate = useNavigate();
  const { data, isPending, error, refetch, isFetching } = useHosts(accountID);

  return (
    <Page header={<ScreenHeader title="Your sessions" />}>
      <ScreenBody width="band">
        {isPending && <ListSkeleton label="Looking for your machines" />}
        {error && (
          <ScreenError error={error} onRetry={() => void refetch()} retrying={isFetching} />
        )}
        {data?.length === 0 && (
          <EmptyState
            icon={<Server aria-hidden />}
            title="Nothing paired yet"
            description="Pair a machine and its sessions show up here.">
            <Button variant="primary" onClick={() => navigate(routes.hosts)}>
              Set up a machine
            </Button>
          </EmptyState>
        )}
        {data?.map(host => (
          <HostRow key={host.id} host={host} />
        ))}
      </ScreenBody>
    </Page>
  );
}

function HostRow({ host }: { host: Instance }) {
  const { routes } = useProductPorts();
  const reachable = isReachable(host);

  const body = (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <P className="truncate font-medium">{host.name}</P>
        <Small>{hostDetail(host)}</Small>
      </div>
      <HostStateBadge host={host} />
      {reachable && <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />}
    </div>
  );

  if (!reachable) {
    return (
      <Card variant="filled" className="opacity-60">
        {body}
      </Card>
    );
  }
  return (




    <Link to={routes.host(host.id)} className="block">
      <Card variant="filled" interactive>
        {body}
      </Card>
    </Link>
  );
}
