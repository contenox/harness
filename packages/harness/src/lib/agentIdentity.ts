import type { AgentIdentity, AgentKey } from './types';

export const GENERATED_AGENT_KEY = 'contenox_agent_ed25519';

export const EMPTY_AGENT_IDENTITY: AgentIdentity = {
  name: '',
  email: '',
  key: '',
  sign: false,
  creditMe: true,
  creditAs: '',
};

const PERSON = /^\s*([^<>]+?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/;

export function parsePerson(raw: string): { name: string; email: string } | undefined {
  const match = PERSON.exec(raw);
  return match ? { name: match[1], email: match[2] } : undefined;
}

export type AgentIdentityIssue =
  | 'name_without_email'
  | 'email_without_name'
  | 'email_invalid'
  | 'sign_without_key'
  | 'key_unusable'
  | 'credit_as_invalid';

export function agentIdentityIssues(identity: AgentIdentity, keys: AgentKey[] = []): AgentIdentityIssue[] {
  const name = identity.name.trim();
  const email = identity.email.trim();
  const issues: AgentIdentityIssue[] = [];
  if (name && !email) issues.push('name_without_email');
  if (email && !name) issues.push('email_without_name');
  if (email && (!email.includes('@') || /[\s<>]/.test(email))) issues.push('email_invalid');
  if (identity.sign && !identity.key.trim()) issues.push('sign_without_key');
  const selected = keys.find(key => key.ref === identity.key);
  if (selected && !selected.usable) issues.push('key_unusable');
  if (identity.creditAs.trim() && !parsePerson(identity.creditAs)) issues.push('credit_as_invalid');
  return issues;
}

export function hasGeneratedAgentKey(keys: AgentKey[]): boolean {
  return keys.some(key => key.source === 'file' && key.ref.replace(/\\/g, '/').endsWith(`/${GENERATED_AGENT_KEY}`));
}

export type CommitPreview = {
  author: string;
  signedBy?: string;
  coAuthor?: string;
};

export function commitPreview(
  identity: AgentIdentity,
  me: { name: string; email: string } | undefined,
  key: AgentKey | undefined,
): CommitPreview | undefined {
  const name = identity.name.trim();
  const email = identity.email.trim();
  if (!name || !email) return undefined;
  const preview: CommitPreview = { author: `${name} <${email}>` };
  if (identity.sign && key?.usable) preview.signedBy = key.fingerprint;
  const credited = identity.creditAs.trim() ? parsePerson(identity.creditAs) : me;
  if (identity.creditMe && credited && credited.email.toLowerCase() !== email.toLowerCase()) {
    preview.coAuthor = `${credited.name} <${credited.email}>`;
  }
  return preview;
}
