import type { SessionConfigOption } from '@contenox/acp-client';
import { findConfigOption, selectableValues } from './configOptions';




export const AGENT_CONFIG_ID = 'agent';


export const NATIVE_AGENT_VALUE = '';

/**
 * Whether an advertised value denotes the machine's own chain rather than a registered agent.
 */
export function isNativeAgent(value: string): boolean {
  return value.trim() === NATIVE_AGENT_VALUE;
}

/**
 * One selectable agent: what is bound at `session/new`, and what a human reads.
 */
export interface SessionAgent {
  /**
   * The registered agent's name, sent VERBATIM as `contenox.agent`.
   */
  value: string;
  /**
   * The machine's display name for it.
   */
  name: string;
  /**
   * True for the native chain — the value that binds no external agent.
   */
  native: boolean;
}

/**
 * The advertised agents as the picker needs them, in three states rather than two.
 */
export interface SessionAgentsState {
  /**
   * The option as advertised, for the generic control to render; null when absent.
   */
  option: SessionConfigOption | null;
  /**
   * Everything the machine offered, in its own order — the native chain included.
   */
  agents: SessionAgent[];
  /**
   * The machine's own pick (the option's `currentValue`) when it is one of `agents`; null otherwise.
   */
  defaultAgent: string | null;
  /**
   * True when the machine advertised no agent option: it has no registered agents.
   */
  isAbsent: boolean;
}


const ABSENT: SessionAgentsState = {
  option: null,
  agents: [],
  defaultAgent: null,
  isAbsent: true,
};


const NATIVE_FALLBACK_NAME = 'contenox';

/**
 * Reads the advertised agents out of the workspace-level config options the `initialize` response carried (`AcpWorkspaceState.workspaceConfigOptions`), or out of a session's own options.
 */
export function deriveSessionAgents(
  options: readonly SessionConfigOption[] | undefined,
): SessionAgentsState {
  const option = findConfigOption(options, AGENT_CONFIG_ID);
  if (option === undefined) return ABSENT;

  const agents: SessionAgent[] = [];
  const seen = new Set<string>();
  for (const value of selectableValues(option)) {
    const name = typeof value.value === 'string' ? value.value.trim() : '';
    if (seen.has(name)) continue;
    seen.add(name);
    const label = typeof value.name === 'string' ? value.name.trim() : '';
    const native = isNativeAgent(name);
    agents.push({
      value: name,
      name: label !== '' ? label : native ? NATIVE_FALLBACK_NAME : name,
      native,
    });
  }

  const current = typeof option.currentValue === 'string' ? option.currentValue.trim() : '';



  const defaultAgent = agents.some(agent => agent.value === current) ? current : null;
  return { option, agents, defaultAgent, isAbsent: false };
}

/**
 * Whether `value` is one of the agents the machine advertised.
 */
export function isAdvertisedAgent(state: SessionAgentsState, value: string | null): boolean {
  return value !== null && state.agents.some(agent => agent.value === value);
}

/**
 * Which agent a picker should show as selected, given whatever the user last chose: their pick while it is still advertised, else the machine's default, else the first agent, else null — and null means the machine offered nothing, so a new session is the native chain by omission.
 */
export function selectedAgent(state: SessionAgentsState, picked: string | null): string | null {
  if (isAdvertisedAgent(state, picked)) return picked;
  if (state.defaultAgent !== null) return state.defaultAgent;
  return state.agents[0]?.value ?? null;
}

/**
 * The `agentName` a selection becomes on the way to `newSession` — the name for a registered agent, and `null` for the native chain or for no selection at all.
 */
export function agentNameForNewSession(selected: string | null): string | null {
  if (selected === null) return null;
  return isNativeAgent(selected) ? null : selected.trim();
}

/**
 * An agent's label in the picker.
 */
export function agentLabel(state: SessionAgentsState, agent: SessionAgent): string {
  return agent.value === state.defaultAgent ? `${agent.name} · default` : agent.name;
}

/**
 * Whether there is a choice to offer at all.
 */
export function hasAgentChoice(state: SessionAgentsState): boolean {
  return state.agents.length > 1;
}

/**
 * The agent option as the generic control should render it: the machine's option with its values relabelled for a human and its `currentValue` re-pointed at the user's live pick.
 */
export function agentControlOption(
  state: SessionAgentsState,
  selected: string | null,
): SessionConfigOption | null {
  if (state.option === null || !hasAgentChoice(state)) return null;
  return {
    ...state.option,
    name: 'Agent',
    currentValue: selected ?? NATIVE_AGENT_VALUE,
    options: state.agents.map(agent => ({ value: agent.value, name: agentLabel(state, agent) })),
  };
}
