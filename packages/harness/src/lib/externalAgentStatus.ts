import type { StatusDotStatus } from '@contenox/ui';
import type { TranslationKey } from '../i18n';
import type { ExternalAgent, ExternalAgentCheck, ExternalAgentPresetStatus } from './types';

export type AgentRowState =
  | 'not_installed'
  | 'installing'
  | 'install_failed'
  | 'off'
  | 'checking'
  | 'problem'
  | 'sign_in'
  | 'ready'
  | 'unchecked';

export type AgentRowStatus = {
  state: AgentRowState;
  dot: StatusDotStatus | null;
  summaryKey: TranslationKey;
};

const STATUS: Record<AgentRowState, Omit<AgentRowStatus, 'state'>> = {
  not_installed: { dot: null, summaryKey: 'external_agents.status.not_installed' },
  installing: { dot: 'checking', summaryKey: 'external_agents.status.installing' },
  install_failed: { dot: 'unavailable', summaryKey: 'external_agents.status.install_failed' },
  off: { dot: 'unknown', summaryKey: 'external_agents.status.off' },
  checking: { dot: 'checking', summaryKey: 'external_agents.status.checking' },
  problem: { dot: 'unavailable', summaryKey: 'external_agents.status.problem' },
  sign_in: { dot: 'attention', summaryKey: 'external_agents.status.sign_in' },
  ready: { dot: 'available', summaryKey: 'external_agents.status.ready' },
  unchecked: { dot: 'unknown', summaryKey: 'external_agents.status.unchecked' },
};

export type AgentStatusInput = {
  preset?: ExternalAgentPresetStatus;
  agent?: ExternalAgent;
  check?: ExternalAgentCheck;
  checking?: boolean;
};

/** One state per agent row, in the order a person has to act on it. */
export function agentRowStatus({ preset, agent, check, checking }: AgentStatusInput): AgentRowStatus {
  const state = rowState({ preset, agent, check, checking });
  return { state, ...STATUS[state] };
}

function rowState({ preset, agent, check, checking }: AgentStatusInput): AgentRowState {
  if (preset) {
    if (preset.installState === 'installing') return 'installing';
    if (preset.installState === 'failed') return 'install_failed';
    if (!preset.installed || !agent) return 'not_installed';
  }
  if (!agent) return 'not_installed';
  if (!agent.enabled) return 'off';
  if (checking) return 'checking';
  if (!check) return 'unchecked';
  if (check.problem) return 'problem';
  if (check.signedIn === false) return 'sign_in';
  return 'ready';
}

export const AGENT_PROBLEM_KEYS: Record<string, TranslationKey> = {
  sandbox_unavailable: 'external_agents.problem.sandbox_unavailable',
  command_not_found: 'external_agents.problem.command_not_found',
  start_failed: 'external_agents.problem.start_failed',
  handshake_failed: 'external_agents.problem.handshake_failed',
  disabled: 'external_agents.problem.disabled',
  node_missing: 'external_agents.problem.node_missing',
  node_too_old: 'external_agents.problem.node_too_old',
  npm_missing: 'external_agents.problem.npm_missing',
  install_failed: 'external_agents.problem.install_failed',
  login_failed: 'external_agents.problem.login_failed',
  login_timed_out: 'external_agents.problem.login_timed_out',
};

export function problemKey(kind: string | undefined): TranslationKey {
  return (kind && AGENT_PROBLEM_KEYS[kind]) || 'external_agents.problem.generic';
}
