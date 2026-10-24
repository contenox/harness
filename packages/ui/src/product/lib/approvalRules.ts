
import type { ApprovalRule } from './api/types';
import { MAX_SUBSCRIBED_AGENT_BYTES } from './api/types';
import { approverRoleLabel } from './asks';
import { byteLength, hasControlCharacter } from './askAgents';


export const ALL_AGENTS_RULE = '*';

export type RuleSource = 'agent' | 'default' | 'built-in';

export interface EffectiveRule {
  approvalsRequired: number;
  approverRole: string;
  source: RuleSource;
}

export interface RuleSet {
  fallback: ApprovalRule | null;
  agents: Map<string, ApprovalRule>;
  max: number;
}


export const BUILT_IN_RULE: EffectiveRule = {
  approvalsRequired: 1,
  approverRole: '',
  source: 'built-in',
};

export function ruleSet(rules: ApprovalRule[], max: number): RuleSet {
  const agents = new Map<string, ApprovalRule>();
  let fallback: ApprovalRule | null = null;
  for (const rule of rules) {
    if (rule.agent_name === ALL_AGENTS_RULE) fallback = rule;
    else agents.set(rule.agent_name, rule);
  }
  return { fallback, agents, max };
}

export function defaultRule(set: RuleSet): EffectiveRule {
  if (set.fallback === null) return BUILT_IN_RULE;
  return {
    approvalsRequired: set.fallback.approvals_required,
    approverRole: normalisedRole(set.fallback.approver_role),
    source: 'default',
  };
}

export function effectiveRule(set: RuleSet, agentName: string): EffectiveRule {
  const own = set.agents.get(agentName.trim());
  if (own === undefined) return defaultRule(set);
  return {
    approvalsRequired: own.approvals_required,
    approverRole: normalisedRole(own.approver_role),
    source: 'agent',
  };
}

export function ruledAgents(set: RuleSet): string[] {
  return [...set.agents.keys()].sort((a, b) => a.localeCompare(b));
}


export const APPROVER_ROLE_CHOICES: { value: string; label: string }[] = [
  { value: '', label: 'Anyone on this team' },
  { value: 'tenant_admin', label: 'Admins and owners' },
  { value: 'tenant_owner', label: 'Owners only' },
];

export function normalisedRole(role: string | undefined): string {
  const value = (role ?? '').trim();
  return value === 'tenant_user' ? '' : value;
}

export function ruleSentence(rule: EffectiveRule): string {
  const people =
    rule.approvalsRequired === 1 ? 'One person' : `${rule.approvalsRequired} different people`;
  if (rule.approverRole === '') return `${people} must approve.`;
  if (!APPROVER_ROLE_CHOICES.some(choice => choice.value === rule.approverRole)) {



    return `${people} must approve, and this rule names a role this account does not have (${rule.approverRole}), so nobody can answer it.`;
  }


  return `${people} must approve, and only ${approverRoleLabel(rule.approverRole)} may.`;
}

export function ruleSourceSentence(source: RuleSource): string {
  switch (source) {
    case 'agent':
      return 'Set for this agent.';
    case 'default':
      return 'Inherited from the team default.';
    case 'built-in':
      return 'Nothing is set, so the built-in rule applies.';
  }
}

export function ruleAgentNameRefusal(raw: string): string | null {
  const name = raw.trim();
  if (name === '') return null;
  if (name === ALL_AGENTS_RULE) return 'That is the team default, which is the form above.';
  if (byteLength(name) > MAX_SUBSCRIBED_AGENT_BYTES) return 'That agent name is too long.';
  if (hasControlCharacter(name)) return 'That agent name carries a control character.';
  return null;
}

export function ruleAgentName(raw: string): string | null {
  const name = raw.trim();
  if (name === '' || ruleAgentNameRefusal(name) !== null) return null;
  return name;
}
