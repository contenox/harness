
import type { Ask, AskSubscription, EventConsumer, Instance } from './api/types';
import { ALL_AGENTS, openAsks, type AskBoard } from './asks';
import { MAX_SUBSCRIBED_AGENT_BYTES } from './api/types';

export interface AgentReach {
  name: string;
  subscribed: boolean;
  hosts: string[];
  waiting: number;
  triggers: number;
}

export interface AgentSources {
  board: AskBoard;
  subscriptions: AskSubscription[] | undefined;
  consumers: EventConsumer[] | undefined;
}

export function agentCatalogue({ board, subscriptions, consumers }: AgentSources): AgentReach[] {
  const byName = new Map<string, AgentReach>();
  const reach = (name: string): AgentReach => {
    const existing = byName.get(name);
    if (existing !== undefined) return existing;
    const fresh: AgentReach = { name, subscribed: false, hosts: [], waiting: 0, triggers: 0 };
    byName.set(name, fresh);
    return fresh;
  };
  const addHost = (agent: AgentReach, instanceID: string) => {
    if (instanceID !== '' && !agent.hosts.includes(instanceID)) agent.hosts.push(instanceID);
  };

  for (const ask of openAsks(board)) {
    const name = (ask.agent_name ?? '').trim();
    if (name === '') continue;
    const agent = reach(name);
    agent.waiting += 1;
    addHost(agent, ask.instance_id);
  }
  for (const consumer of consumers ?? []) {
    const name = (consumer.agent_name ?? '').trim();
    if (name === '') continue;
    const agent = reach(name);
    agent.triggers += 1;
    addHost(agent, consumer.instance_id);
  }
  for (const subscription of subscriptions ?? []) {
    if (subscription.agent_name === ALL_AGENTS) continue;
    reach(subscription.agent_name).subscribed = true;
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function agentReach(catalogue: AgentReach[], name: string): AgentReach | null {
  return catalogue.find(agent => agent.name === name) ?? null;
}

export function agentAsks(board: AskBoard, name: string): Ask[] {
  return board.asks.filter(ask => (ask.agent_name ?? '').trim() === name);
}

export function hostAsks(board: AskBoard, instanceID: string): Ask[] {
  return board.asks.filter(ask => ask.instance_id === instanceID);
}

export function agentTriggers(
  consumers: EventConsumer[] | undefined,
  name: string,
): EventConsumer[] {
  return (consumers ?? []).filter(consumer => (consumer.agent_name ?? '').trim() === name);
}

export function hostTriggers(
  consumers: EventConsumer[] | undefined,
  instanceID: string,
): EventConsumer[] {
  return (consumers ?? []).filter(consumer => consumer.instance_id === instanceID);
}

export function hostAgents(sources: AgentSources, instanceID: string): AgentReach[] {
  return agentCatalogue({
    board: { asks: hostAsks(sources.board, instanceID), outcomes: sources.board.outcomes },
    subscriptions: sources.subscriptions,
    consumers: hostTriggers(sources.consumers, instanceID),
  }).filter(agent => agent.waiting > 0 || agent.triggers > 0);
}

export function agentInstances(
  hosts: string[],
  instances: Instance[] | undefined,
): { known: Instance[]; unknown: number } {
  const fleet = instances ?? [];
  const known = hosts
    .map(id => fleet.find(instance => instance.id === id))
    .filter((instance): instance is Instance => instance !== undefined)
    .sort((a, b) => {
      const delta = Number(b.connected) - Number(a.connected);
      return delta !== 0 ? delta : a.name.localeCompare(b.name);
    });
  return { known, unknown: hosts.length - known.length };
}

export function catalogueIsEmpty(catalogue: AgentReach[]): boolean {
  return catalogue.length === 0;
}

export function subscribableAgentName(raw: string): string | null {
  const name = raw.trim();
  if (name === '' || agentNameRefusal(name) !== null) return null;
  return name;
}

export function agentNameRefusal(raw: string): string | null {
  const name = raw.trim();
  if (name === '') return null;
  if (name === ALL_AGENTS) return 'Use the control above to be shown every agent.';
  if (byteLength(name) > MAX_SUBSCRIBED_AGENT_BYTES) return 'That agent name is too long.';
  if (hasControlCharacter(name)) return 'That agent name carries a control character.';
  return null;
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}
