import type { SessionConfigOption } from '@contenox/acp-client';
import { findConfigOption, selectableValues } from './configOptions';




export const AGENT_CONFIG_ID = 'agent';


export const NATIVE_AGENT_VALUE = '';

export function isNativeAgent(value: string): boolean {
  return value.trim() === NATIVE_AGENT_VALUE;
}

export interface SessionAgent {
  value: string;
  name: string;
  native: boolean;
}

export interface SessionAgentsState {
  option: SessionConfigOption | null;
  agents: SessionAgent[];
  defaultAgent: string | null;
  isAbsent: boolean;
}


const ABSENT: SessionAgentsState = {
  option: null,
  agents: [],
  defaultAgent: null,
  isAbsent: true,
};


const NATIVE_FALLBACK_NAME = 'contenox';

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

export function isAdvertisedAgent(state: SessionAgentsState, value: string | null): boolean {
  return value !== null && state.agents.some(agent => agent.value === value);
}

export function selectedAgent(state: SessionAgentsState, picked: string | null): string | null {
  if (isAdvertisedAgent(state, picked)) return picked;
  if (state.defaultAgent !== null) return state.defaultAgent;
  return state.agents[0]?.value ?? null;
}

export function agentNameForNewSession(selected: string | null): string | null {
  if (selected === null) return null;
  return isNativeAgent(selected) ? null : selected.trim();
}

export function agentLabel(state: SessionAgentsState, agent: SessionAgent): string {
  return agent.value === state.defaultAgent ? `${agent.name} · default` : agent.name;
}

export function hasAgentChoice(state: SessionAgentsState): boolean {
  return state.agents.length > 1;
}

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
