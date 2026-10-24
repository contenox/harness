import { Badge, Card, EmptyState, InlineNotice, P, Page, Small } from '@contenox/ui';
import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AskList } from '../AskList';
import { AskSection } from '@contenox/ui';
import { CheckboxField } from '@contenox/ui';
import { ScreenError, ScreenLoading } from '../../saas/ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type { EventConsumer, Instance } from '../../lib/api/types';
import { subscribedAgents, type AskBoard } from '../../lib/asks';
import {
  agentAsks,
  agentInstances,
  agentReach,
  agentCatalogue,
  agentTriggers,
} from '../../lib/askAgents';
import { connectionWord, sessionModeLabel, sourceLabel } from '../../saas/account/lib/consumers';
import { targetSentence } from '../../saas/account/lib/consumers';

export default function AgentAskPage({ agentName }: { agentName: string }) {
  const {
    routes,
    useAskBoard,
    useAskSubscriptions,
    useAuth,
    useChangeAskSubscription,
    useConsumers,
    useHosts,
  } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const { board } = useAskBoard();
  const subscriptions = useAskSubscriptions(accountID);
  const consumers = useConsumers(accountID);
  const hosts = useHosts(accountID);
  const change = useChangeAskSubscription(accountID);

  const waiting = agentAsks(board, agentName);
  const triggers = agentTriggers(consumers.data, agentName);
  const reach = agentReach(
    agentCatalogue({ board, subscriptions: subscriptions.data, consumers: consumers.data }),
    agentName,
  );
  const wildcard = subscriptions.data === undefined ? null : subscribedAgents(subscriptions.data);
  const machines = agentInstances(reach?.hosts ?? [], hosts.data);

  return (
    <Page header={<ScreenHeader title={agentName} />}>
      <ScreenBody width="narrow">
        <BackTo to={routes.asks} label="Asks" />
        <Small className="text-text-muted dark:text-dark-text-muted">
          An agent on this team&rsquo;s machines
        </Small>
        {subscriptions.isPending && <ScreenLoading label="Loading your subscriptions" />}
        {wildcard !== null && (
          <Card variant="filled" className="flex flex-col gap-1">
            <CheckboxField
              label={`Show me ${agentName}'s asks`}
              checked={wildcard.all || (reach?.subscribed ?? false)}
              disabled={change.isPending || wildcard.all}
              onChange={checked => change.mutate({ agent_name: agentName, subscribed: checked })}>
              {wildcard.all
                ? 'You are subscribed to every agent on this team, which already covers this one.'
                : 'Subscribing decides what you are shown. Whether you may answer is decided by your role when you answer.'}
            </CheckboxField>

            <Small className="text-text-muted dark:text-dark-text-muted">
              This covers {agentName} on every machine this team owns. Asks cannot be subscribed to
              per machine.
            </Small>
          </Card>
        )}
        {change.error !== null && <ScreenError error={change.error} />}

        <AskSection title="Waiting for a person">
          {waiting.length === 0 ? (
            <EmptyState
              icon={<Inbox aria-hidden />}
              title="Nothing from this agent right now"
              description="Asks are routed through the relay and never stored, so this is what is being held at this moment — not a history."
            />
          ) : (
            <AskList asks={waiting} here="agent" />
          )}
        </AskSection>

        <AskSection title="Where it runs">
          {machines.known.length === 0 ? (
            <InlineNotice variant="info">
              No machine has been seen running {agentName}. This app learns an agent&rsquo;s machine
              from an ask it raised or a webhook configured to fire it, and neither exists yet.
            </InlineNotice>
          ) : (
            machines.known.map(instance => (
              <HostRow key={instance.id} instance={instance} board={board} />
            ))
          )}
          {machines.unknown > 0 && (
            <Small>
              And {machines.unknown} {machines.unknown === 1 ? 'machine' : 'machines'} this listing
              does not know about.
            </Small>
          )}
        </AskSection>

        <AskSection title="What starts it">
          {consumers.error !== null && consumers.error !== undefined ? (
            <ScreenError
              error={consumers.error}
              onRetry={() => void consumers.refetch()}
              retrying={consumers.isFetching}
            />
          ) : triggers.length === 0 ? (
            <Small className="text-text-muted dark:text-dark-text-muted">
              No webhook on this account fires {agentName}. It may still be started on its machine —
              the relay only knows what it was asked to trigger.
            </Small>
          ) : (
            triggers.map(consumer => (
              <TriggerRow key={consumer.id} consumer={consumer} instances={hosts.data} />
            ))
          )}
        </AskSection>
      </ScreenBody>
    </Page>
  );
}


function HostRow({ instance, board }: { instance: Instance; board: AskBoard }) {
  const { routes } = useProductPorts();
  const waiting = board.asks.filter(
    ask => ask.instance_id === instance.id && board.outcomes[ask.ask_id] === undefined,
  ).length;
  return (
    <Card variant="filled" className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <P className="truncate font-medium">
          <Link
            to={routes.askHost(instance.id)}
            className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
            {instance.name}
          </Link>
        </P>
        <Small>{connectionWord(instance)}</Small>
      </div>
      {waiting > 0 && (
        <Badge variant="warning" size="sm">
          {waiting} waiting
        </Badge>
      )}
    </Card>
  );
}


function TriggerRow({
  consumer,
  instances,
}: {
  consumer: EventConsumer;
  instances: Instance[] | undefined;
}) {
  const machine = instances?.find(instance => instance.id === consumer.instance_id);
  return (
    <Card variant="filled" className="flex flex-col gap-1">
      <P className="truncate font-medium">{consumer.name}</P>
      <Small>
        {sourceLabel(consumer.source)} on {machine?.name ?? consumer.instance_id}
      </Small>
      <Small>{targetSentence(consumer)}</Small>
      <Small>{sessionModeLabel(consumer.session_mode)}</Small>
    </Card>
  );
}
