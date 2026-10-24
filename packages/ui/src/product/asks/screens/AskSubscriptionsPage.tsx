import { Badge, Button, Card, EmptyState, InlineNotice, P, Page, Small } from '@contenox/ui';
import { BellOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AskSection } from '@contenox/ui';
import { CheckboxField, TextField } from '@contenox/ui';
import { ScreenError, ScreenLoading } from '../../saas/ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type { Instance } from '../../lib/api/types';
import { ALL_AGENTS, subscribedAgents } from '../../lib/asks';
import {
  agentCatalogue,
  agentInstances,
  agentNameRefusal,
  subscribableAgentName,
  type AgentReach,
} from '../../lib/askAgents';

export default function AskSubscriptionsPage() {
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
  const subscriptions = useAskSubscriptions(accountID);
  const consumers = useConsumers(accountID);
  const hosts = useHosts(accountID);
  const { board } = useAskBoard();
  const change = useChangeAskSubscription(accountID);
  const [name, setName] = useState('');

  const agents = subscriptions.data === undefined ? null : subscribedAgents(subscriptions.data);
  const catalogue = agentCatalogue({
    board,
    subscriptions: subscriptions.data,
    consumers: consumers.data,
  });
  const typed = subscribableAgentName(name);
  const refusal = agentNameRefusal(name);


  const alreadyOffered = typed !== null && catalogue.some(agent => agent.name === typed);

  const set = (agentName: string, subscribed: boolean) =>
    change.mutate({ agent_name: agentName, subscribed });

  return (
    <Page header={<ScreenHeader title="Ask subscriptions" />}>
      <ScreenBody width="narrow">
        <BackTo to={routes.asks} label="Asks" />
        <Small>
          This decides what appears in your inbox. Whether you may answer an ask is decided by your
          role on this account when you answer it, not here.
        </Small>

        {subscriptions.isPending && <ScreenLoading label="Loading your subscriptions" />}
        {subscriptions.error && (
          <ScreenError
            error={subscriptions.error}
            onRetry={() => void subscriptions.refetch()}
            retrying={subscriptions.isFetching}
          />
        )}

        {agents !== null && (
          <>
            <Card variant="filled" className="flex flex-col gap-2">
              <CheckboxField
                label="Every agent on this team"
                checked={agents.all}
                disabled={change.isPending}
                onChange={checked => set(ALL_AGENTS, checked)}>
                Including asks whose machine named no agent at all — nothing else covers those.
              </CheckboxField>
            </Card>

            {change.error !== null && <ScreenError error={change.error} />}

            <AskSection title="Agents on this team">
              {agents.all && (
                <Small>
                  While every agent is on, these change nothing — you are already shown all of them.
                </Small>
              )}
              {catalogue.length === 0 ? (
                <EmptyState
                  icon={<BellOff aria-hidden />}
                  title="No agent named yet"
                  description="This app learns an agent's name from an ask it raised or a webhook set to fire it. Until one of those exists, name it below exactly as it is declared on your machine."
                />
              ) : (
                catalogue.map(agent => (
                  <AgentSubscription
                    key={agent.name}
                    agent={agent}
                    wildcard={agents.all}
                    instances={hosts.data}
                    pending={change.isPending}
                    onChange={subscribed => set(agent.name, subscribed)}
                  />
                ))
              )}


              <InlineNotice variant="info">
                A subscription names an agent, not a machine — it covers that name on every machine
                this team owns.
              </InlineNotice>
            </AskSection>

            <Card variant="filled" className="flex flex-col gap-3">
              <TextField
                label="Agent name"
                value={name}
                onChange={event => setName(event.target.value)}
                disabled={change.isPending}
                autoCapitalize="none"
                autoCorrect="off"
                error={refusal ?? undefined}
                hint="As declared on the machine."
              />
              <Small className="text-text-muted dark:text-dark-text-muted">
                There is no list to pick from: agents are declared on your own machines and the
                relay never sees the declaration. Type the name exactly.
              </Small>
              {alreadyOffered && <Small>That agent is already listed above.</Small>}
              <Button
                variant="primary"
                disabled={change.isPending || typed === null || alreadyOffered}
                onClick={() =>
                  typed !== null &&
                  change.mutate(
                    { agent_name: typed, subscribed: true },
                    { onSuccess: () => setName('') },
                  )
                }>
                Subscribe to this agent
              </Button>
            </Card>
          </>
        )}
      </ScreenBody>
    </Page>
  );
}


function AgentSubscription({
  agent,
  wildcard,
  instances,
  pending,
  onChange,
}: {
  agent: AgentReach;

  wildcard: boolean;
  instances: Instance[] | undefined;
  pending: boolean;
  onChange: (subscribed: boolean) => void;
}) {
  const { routes } = useProductPorts();
  const machines = agentInstances(agent.hosts, instances);
  return (
    <Card variant="filled" className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <CheckboxField
            label={agent.name}
            checked={wildcard || agent.subscribed}
            disabled={pending || wildcard}
            onChange={onChange}>
            {whereItRuns(machines, agent)}
          </CheckboxField>
        </div>
        {agent.waiting > 0 && (
          <Badge variant="warning" size="sm">
            {agent.waiting} waiting
          </Badge>
        )}
      </div>
      <P className="text-sm">
        <Link
          to={routes.askAgent(agent.name)}
          aria-label={`Everything from ${agent.name}`}
          className="text-primary-700 dark:text-dark-primary-500 inline underline underline-offset-4">
          What it is waiting on
        </Link>
      </P>
    </Card>
  );
}


function whereItRuns(machines: { known: Instance[]; unknown: number }, agent: AgentReach): string {
  const named = machines.known.slice(0, 2).map(instance => instance.name);
  const rest = machines.known.length - named.length + machines.unknown;
  const parts = [...named, ...(rest > 0 ? [`${rest} more`] : [])];
  const where = parts.length === 0 ? 'No machine seen yet' : `On ${parts.join(', ')}`;
  if (agent.triggers === 0) return where;
  return `${where} · fired by ${agent.triggers} ${agent.triggers === 1 ? 'webhook' : 'webhooks'}`;
}
