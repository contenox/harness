import { EmptyState } from '../../components/EmptyState';
import { InlineNotice } from '../../components/InlineNotice';
import { Small } from '../../components/Typography';
import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScreenBody } from '../../components/ScreenBody';
import { ListSkeleton, ScreenError } from '../saas/ScreenState';
import { useProductPorts } from '../ports';
import { subscribedAgents, subscribesToNothing } from '../lib/asks';
import { AskList } from './AskList';

/**
 * Everything waiting for this person, newest first.
 */
export function AskInbox({ accountID }: { accountID: string }) {
  const { routes, useAskBoard, useAskSubscriptions } = useProductPorts();
  const { board, stream, isPending, error, refetch, isFetching } = useAskBoard();
  const subscriptions = useAskSubscriptions(accountID);

  const agents = subscriptions.data === undefined ? null : subscribedAgents(subscriptions.data);

  return (

    <ScreenBody width="narrow" padded={false}>
      {/*
        Said only when it is not true. A stream that is redialing is a normal
        few seconds of a phone changing network, and a standing "live" badge
        would be chrome on the one screen that cannot afford any.
      */}
      {stream === 'reconnecting' && (
        <Small className="text-text-muted dark:text-dark-text-muted">
          Reconnecting for live updates. This list is what the relay last answered.
        </Small>
      )}

      {isPending && <ListSkeleton label="Loading the asks waiting for you" rows={2} />}
      {error !== null && error !== undefined && (
        <ScreenError error={error} onRetry={refetch} retrying={isFetching} />
      )}

      <AskList asks={board.asks} />

      {!isPending &&
        (error === null || error === undefined) &&
        board.asks.length === 0 &&
        (agents !== null || subscriptions.isError) &&
        (agents !== null && subscribesToNothing(agents) ? (
          <EmptyState
            icon={<Inbox aria-hidden />}
            title="No agent asks you yet"
            description="An ask reaches the people who subscribed to that agent. Until you subscribe to one, nothing arrives here.">
            <Link
              to={routes.askSubscriptions}
              className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
              Choose which agents ask you
            </Link>
          </EmptyState>
        ) : (
          <>
            <EmptyState
              icon={<Inbox aria-hidden />}
              title="Nothing is waiting for you"
              description="When an agent stops for a decision it appears here — and on the editor of anyone attached to that session, at the same moment."
            />
            <InlineNotice variant="info">
              Asks live on your team&rsquo;s machines and are only routed through here, never
              stored. A machine that is offline shows nothing; when it reconnects it sends back what
              is still open, newest first.
            </InlineNotice>
          </>
        ))}
    </ScreenBody>
  );
}
