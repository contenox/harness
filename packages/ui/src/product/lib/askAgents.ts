
import type { Ask, AskSubscription, EventConsumer, Instance } from './api/types';
import { ALL_AGENTS, openAsks, type AskBoard } from './asks';
import { MAX_SUBSCRIBED_AGENT_BYTES } from './api/types';

/**
 * One agent, as much as the relay lets this app know of it.
 */
export interface AgentReach {
  name: string;
  /**
   * Whether this member is subscribed to the name itself.
   */
  subscribed: boolean;
  /**
   * Machines this agent is asking from or configured on, by instance id, in the order they were met.
   */
  hosts: string[];
  /**
   * How many of this agent's asks are open on the board right now.
   */
  waiting: number;
  /**
   * How many consumers fire this agent.
   */
  triggers: number;
}

/**
 * What the catalogue is folded from — three listings the app already reads.
 */
export interface AgentSources {
  board: AskBoard;
  subscriptions: AskSubscription[] | undefined;
  consumers: EventConsumer[] | undefined;
}

/**
 * Every agent this app can name, alphabetically.
 */
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

/**
 * One agent out of the catalogue, or null when this app has never heard the name.
 */
export function agentReach(catalogue: AgentReach[], name: string): AgentReach | null {
  return catalogue.find(agent => agent.name === name) ?? null;
}

/**
 * The open asks from one agent, newest first — the board's own order, filtered.
 */
export function agentAsks(board: AskBoard, name: string): Ask[] {
  return board.asks.filter(ask => (ask.agent_name ?? '').trim() === name);
}

/**
 * The open asks parked on one machine, newest first.
 */
export function hostAsks(board: AskBoard, instanceID: string): Ask[] {
  return board.asks.filter(ask => ask.instance_id === instanceID);
}

/**
 * The consumers that fire one agent — what makes it run at all.
 */
export function agentTriggers(
  consumers: EventConsumer[] | undefined,
  name: string,
): EventConsumer[] {
  return (consumers ?? []).filter(consumer => (consumer.agent_name ?? '').trim() === name);
}

/**
 * The consumers delivering to one machine, whether they name an agent or a chain.
 */
export function hostTriggers(
  consumers: EventConsumer[] | undefined,
  instanceID: string,
): EventConsumer[] {
  return (consumers ?? []).filter(consumer => consumer.instance_id === instanceID);
}

/**
 * The agents seen on one machine, by the same two sources the catalogue uses.
 */
export function hostAgents(sources: AgentSources, instanceID: string): AgentReach[] {
  return agentCatalogue({
    board: { asks: hostAsks(sources.board, instanceID), outcomes: sources.board.outcomes },
    subscriptions: sources.subscriptions,
    consumers: hostTriggers(sources.consumers, instanceID),
  }).filter(agent => agent.waiting > 0 || agent.triggers > 0);
}

/**
 * The machines an agent reaches, resolved against the fleet listing, connected first and alphabetical within each band — the scanning order every other host list in this app uses, because "which of these can receive right now" is the question being asked of it.
 */
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

/**
 * Whether the app has anything to offer before a name is typed.
 */
export function catalogueIsEmpty(catalogue: AgentReach[]): boolean {
  return catalogue.length === 0;
}

/**
 * Why a typed agent name cannot be subscribed to, or null when it can.
 */
export function subscribableAgentName(raw: string): string | null {
  const name = raw.trim();
  if (name === '' || agentNameRefusal(name) !== null) return null;
  return name;
}

/**
 * What to say about a name the relay would refuse.
 */
export function agentNameRefusal(raw: string): string | null {
  const name = raw.trim();
  if (name === '') return null;
  if (name === ALL_AGENTS) return 'Use the control above to be shown every agent.';
  if (byteLength(name) > MAX_SUBSCRIBED_AGENT_BYTES) return 'That agent name is too long.';
  if (hasControlCharacter(name)) return 'That agent name carries a control character.';
  return null;
}

/**
 * UTF-8 length, because every bound the relay states is in BYTES and a name is not ASCII.
 */
export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Whether a name carries a character that would survive into a log line, which is the only reason the relay refuses one (`askplane.validAgentName`).
 */
export function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}
