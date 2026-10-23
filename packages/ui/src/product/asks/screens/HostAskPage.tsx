import { Badge, Card, EmptyState, InlineNotice, P, Page, Small } from '@contenox/ui';
import { Inbox, MessageSquare } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AskList } from '../AskList';
import { AskSection } from '@contenox/ui';
import { ScreenError, ScreenLoading } from '../../saas/ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type { EventConsumer, Instance } from '../../lib/api/types';
import { hostAgents, hostAsks, hostTriggers, type AgentReach } from '../../lib/askAgents';
import { subscribedAgents, type SubscribedAgents } from '../../lib/asks';
import {
  connectionWord,
  sessionSentence,
  sourceLabel,
  targetSentence,
} from '../../saas/account/lib/consumers';
import { relativeTime } from '../../lib/relativeTime';

/**
 * One machine, from the ask that led here: what is stopped on it, what is configured to run on it, and the way into what is running on it now.
 */
export default function HostAskPage({
  instanceId,
  onTitleChange,
}: {
  instanceId: string;
  onTitleChange?: (title: string) => void;
}) {
  const { routes, useAskBoard, useAskSubscriptions, useAuth, useConsumers, useHosts } =
    useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const { board } = useAskBoard();
  const hosts = useHosts(accountID);
  const consumers = useConsumers(accountID);
  const subscriptions = useAskSubscriptions(accountID);

  const instance = hosts.data?.find(candidate => candidate.id === instanceId);
  const waiting = hostAsks(board, instanceId);
  const agents = hostAgents(
    { board, subscriptions: subscriptions.data, consumers: consumers.data },
    instanceId,
  );
  const triggers = hostTriggers(consumers.data, instanceId);





  const reach = subscriptions.data === undefined ? null : subscribedAgents(subscriptions.data);
  const title = instance?.name ?? instanceId;
  useEffect(() => onTitleChange?.(title), [onTitleChange, title]);

  return (
    <Page header={<ScreenHeader title={title} />}>
      <ScreenBody width="narrow">
        <BackTo to={routes.asks} label="Asks" />
        <Small className="text-text-muted dark:text-dark-text-muted">
          {instance === undefined ? 'A machine on this team' : lastSeen(instance)}
        </Small>
        {hosts.isPending && <ScreenLoading label="Loading this machine" />}
        {hosts.error !== null && hosts.error !== undefined && (
          <ScreenError
            error={hosts.error}
            onRetry={() => void hosts.refetch()}
            retrying={hosts.isFetching}
          />
        )}
        {/* The fleet listing does not carry it, yet an ask on the board named
            it. The two reads can disagree for a moment — a machine paired since
            the fleet was last read is the ordinary case — so this is a fact,
            not an error. */}
        {!hosts.isPending && instance === undefined && (
          <InlineNotice variant="info">
            This machine is not in the current fleet listing. What is below is what its asks and
            webhooks say about it.
          </InlineNotice>
        )}

        <AskSection title="Waiting for a person">
          {waiting.length === 0 ? (
            <EmptyState
              icon={<Inbox aria-hidden />}
              title="Nothing is stopped on this machine"
              description="Asks are routed and never stored, so this is what the relay holds for it right now. A machine that is offline shows nothing until it reconnects."
            />
          ) : (
            <AskList asks={waiting} here="host" />
          )}
        </AskSection>

        <AskSection title="What is running">
          <Card variant="filled" className="flex flex-col gap-2">
            <P className="text-sm">
              The sessions on this machine come from the machine itself, over its own connection —
              the relay stores none of them.
            </P>
            <Link
              to={routes.host(instanceId)}
              className="text-primary-700 dark:text-dark-primary-500 flex min-h-11 items-center gap-2 text-sm underline-offset-4 hover:underline">
              <MessageSquare className="h-5 w-5 shrink-0" aria-hidden />
              Open this machine&rsquo;s sessions
            </Link>
          </Card>
        </AskSection>

        <AskSection title="Agents seen here">
          {agents.length === 0 ? (
            <Small className="text-text-muted dark:text-dark-text-muted">
              No agent on this machine is asking, and no webhook names one. An agent is declared on
              the machine itself — the relay only learns a name when one asks or is configured.
            </Small>
          ) : (
            agents.map(agent => <AgentRow key={agent.name} agent={agent} wildcard={reach} />)
          )}
        </AskSection>

        <AskSection title="What events start here">
          {consumers.error !== null && consumers.error !== undefined ? (
            <ScreenError
              error={consumers.error}
              onRetry={() => void consumers.refetch()}
              retrying={consumers.isFetching}
            />
          ) : triggers.length === 0 ? (
            <Small className="text-text-muted dark:text-dark-text-muted">
              Nothing posts events to this machine yet.
            </Small>
          ) : (
            triggers.map(consumer => <TriggerRow key={consumer.id} consumer={consumer} />)
          )}
        </AskSection>
      </ScreenBody>
    </Page>
  );
}


function AgentRow({ agent, wildcard }: { agent: AgentReach; wildcard: SubscribedAgents | null }) {
  const { routes } = useProductPorts();
  return (
    <Card variant="filled" className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <P className="truncate font-medium">
          <Link
            to={routes.askAgent(agent.name)}
            className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
            {agent.name}
          </Link>
        </P>
        <Small>{reachSentence(agent, wildcard)}</Small>
      </div>
      {agent.waiting > 0 && (
        <Badge variant="warning" size="sm">
          {agent.waiting} waiting
        </Badge>
      )}
    </Card>
  );
}


function reachSentence(agent: AgentReach, wildcard: SubscribedAgents | null): string {
  if (wildcard === null) return 'Reading your subscriptions';
  if (wildcard.all) return 'You are subscribed to every agent, which covers this one';
  return agent.subscribed ? 'You are subscribed to it' : 'Not shown to you unless you subscribe';
}


function TriggerRow({ consumer }: { consumer: EventConsumer }) {
  return (
    <Card variant="filled" className="flex flex-col gap-1">
      <P className="truncate font-medium">{consumer.name}</P>
      <Small>{sourceLabel(consumer.source)}</Small>
      <Small>{targetSentence(consumer)}</Small>
      <Small>{sessionSentence(consumer)}</Small>
    </Card>
  );
}


function lastSeen(instance: Instance): string {
  if (instance.revoked_at !== null) return 'Revoked';
  if (instance.connected) return 'Connected now';
  if (instance.last_seen_at === null) return 'Paired, never connected';
  return `${connectionWord(instance)} — last seen ${relativeTime(instance.last_seen_at, 'just now')}`;
}
