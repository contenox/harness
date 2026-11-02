import type { Agent } from './types';

export function isMissionCapable(agent: Pick<Agent, 'enabled' | 'missionCapable'>): boolean {
  return agent.enabled && agent.missionCapable === true;
}

export function missionAgentNames(agents: readonly Agent[] | undefined): string[] {
  const names = (agents ?? [])
    .filter(isMissionCapable)
    .map(agent => agent.name.trim())
    .filter(Boolean);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export type DispatchPrefill = {
  agentName: string;
  hitlPolicyName: string;
  intent: string;
};

export function dispatchPrefill(params: URLSearchParams): DispatchPrefill {
  const pick = (key: string) => params.get(key)?.trim() ?? '';
  return {
    agentName: pick('agent'),
    hitlPolicyName: pick('envelope'),
    intent: pick('intent'),
  };
}

export type DispatchDefaults = {
  agentName?: string;
  hitlPolicyName?: string;
  cwd?: string;
};

export function withDispatchDefaults<
  T extends { agentName: string; hitlPolicyName: string; cwd: string },
>(values: T, defaults: DispatchDefaults): T {
  return {
    ...values,
    agentName: values.agentName || defaults.agentName?.trim() || '',
    hitlPolicyName: values.hitlPolicyName || defaults.hitlPolicyName?.trim() || '',
    cwd: values.cwd || defaults.cwd?.trim() || '',
  };
}

export function startMissionPath(agentName: string): string {
  return `/missions/new?${new URLSearchParams({ agent: agentName }).toString()}`;
}

export function fireAgainPath(mission: {
  agentName: string;
  hitlPolicyName: string;
  intent: string;
}): string {
  const params = new URLSearchParams({
    agent: mission.agentName,
    envelope: mission.hitlPolicyName,
    intent: mission.intent,
  });
  return `/missions/new?${params.toString()}`;
}
