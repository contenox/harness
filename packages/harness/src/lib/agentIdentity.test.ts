import { describe, expect, it } from 'vitest';
import {
  agentIdentityIssues,
  commitPreview,
  EMPTY_AGENT_IDENTITY,
  hasGeneratedAgentKey,
  parsePerson,
} from './agentIdentity';
import type { AgentKey } from './types';

const key = (over: Partial<AgentKey> = {}): AgentKey => ({
  ref: 'C:\\Users\\me\\.ssh\\id_ed25519',
  label: 'id_ed25519',
  type: 'ssh-ed25519',
  fingerprint: 'SHA256:abc',
  publicKey: 'ssh-ed25519 AAAA me',
  source: 'file',
  usable: true,
  ...over,
});

describe('agentIdentityIssues', () => {
  it('accepts no identity at all, which keeps the repository author', () => {
    expect(agentIdentityIssues(EMPTY_AGENT_IDENTITY)).toEqual([]);
  });

  it('asks for the missing half and rejects an address that is not one', () => {
    expect(agentIdentityIssues({ ...EMPTY_AGENT_IDENTITY, name: 'Agent' })).toEqual([
      'name_without_email',
    ]);
    expect(agentIdentityIssues({ ...EMPTY_AGENT_IDENTITY, email: 'a@b.c' })).toEqual([
      'email_without_name',
    ]);
    expect(agentIdentityIssues({ ...EMPTY_AGENT_IDENTITY, name: 'Agent', email: 'nope' })).toEqual([
      'email_invalid',
    ]);
  });

  it('wants Credit as written as Name <email>', () => {
    expect(agentIdentityIssues({ ...EMPTY_AGENT_IDENTITY, creditAs: 'just a name' })).toEqual([
      'credit_as_invalid',
    ]);
    expect(
      agentIdentityIssues({ ...EMPTY_AGENT_IDENTITY, creditAs: 'Alex <alex@example.com>' }),
    ).toEqual([]);
    expect(parsePerson('  Alex Work  <alex@work.example> ')).toEqual({
      name: 'Alex Work',
      email: 'alex@work.example',
    });
    expect(parsePerson('alex@example.com')).toBeUndefined();
  });

  it('will not sign without a key, nor save an unusable one', () => {
    expect(agentIdentityIssues({ ...EMPTY_AGENT_IDENTITY, sign: true })).toEqual([
      'sign_without_key',
    ]);
    const locked = key({ usable: false, problem: 'passphrase_protected' });
    expect(agentIdentityIssues({ ...EMPTY_AGENT_IDENTITY, key: locked.ref }, [locked])).toEqual([
      'key_unusable',
    ]);
  });
});

describe('commitPreview', () => {
  const identity = {
    name: 'Contenox Agent',
    email: 'agent@example.com',
    key: key().ref,
    sign: true,
    creditMe: true,
    creditAs: '',
  };
  const me = { name: 'Alex', email: 'alex@example.com' };

  it('shows the author, the signing key and the co-author line', () => {
    expect(commitPreview(identity, me, key())).toEqual({
      author: 'Contenox Agent <agent@example.com>',
      signedBy: 'SHA256:abc',
      coAuthor: 'Alex <alex@example.com>',
    });
  });

  it('says nothing about signing when the key cannot sign, and does not credit the agent to itself', () => {
    const preview = commitPreview(
      identity,
      { name: 'Agent', email: 'AGENT@example.com' },
      key({ usable: false }),
    );
    expect(preview).toEqual({ author: 'Contenox Agent <agent@example.com>' });
  });

  it('credits the Credit as person when one is set', () => {
    expect(
      commitPreview({ ...identity, creditAs: 'Alex Work <alex@work.example>' }, me, key())
        ?.coAuthor,
    ).toBe('Alex Work <alex@work.example>');
  });

  it('has no preview until both name and email are set', () => {
    expect(commitPreview({ ...identity, email: '' }, me, key())).toBeUndefined();
  });
});

describe('hasGeneratedAgentKey', () => {
  it('finds the generated key on either path separator', () => {
    expect(
      hasGeneratedAgentKey([key({ ref: 'C:\\Users\\me\\.ssh\\contenox_agent_ed25519' })]),
    ).toBe(true);
    expect(hasGeneratedAgentKey([key({ ref: '/home/me/.ssh/contenox_agent_ed25519' })])).toBe(true);
    expect(hasGeneratedAgentKey([key()])).toBe(false);
  });
});
