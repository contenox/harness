import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { AuthContext, type AuthContextType } from '../../../lib/authContext';
import { agentIdentityKeys } from '../../../lib/queryKeys';
import type { AgentIdentityState, AgentKey } from '../../../lib/types';
import { AgentIdentitySection } from './AgentIdentitySection';

vi.mock('../../../lib/api', () => ({
  api: {
    getAgentIdentity: vi.fn(),
    putAgentIdentity: vi.fn(),
    generateAgentKey: vi.fn(),
    checkAgentIdentity: vi.fn(),
  },
}));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const auth: AuthContextType = {
  user: { id: 'u', subject: 'u', email: 'me@example.com', friendlyName: 'Me', username: 'me' },
  isLoading: false,
  isError: false,
  error: null,
  authRequired: false,
  authenticated: true,
  refresh: () => {},
};

const fileKey: AgentKey = {
  ref: '/home/me/.ssh/contenox_agent_ed25519',
  label: 'contenox_agent_ed25519 (agent@example.com)',
  type: 'ssh-ed25519',
  fingerprint: 'SHA256:agentkey',
  publicKey: 'ssh-ed25519 AAAAagent agent@example.com',
  source: 'file',
  usable: true,
};

function render(state: AgentIdentityState): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(agentIdentityKeys.state(), state);
  return renderToStaticMarkup(
    createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(QueryClientProvider, { client }, createElement(AgentIdentitySection)),
    ),
  );
}

describe('AgentIdentitySection', () => {
  it('credits the Credit as name over the detected one', () => {
    const html = render({
      identity: {
        name: 'Contenox Agent',
        email: 'agent@example.com',
        key: fileKey.ref,
        sign: true,
        creditMe: true,
        creditAs: 'Alex Work <alex@work.example>',
      },
      me: { name: 'Alex', email: 'alex@example.com', source: 'git' },
      keys: [fileKey],
    });
    expect(html).toContain('Co-authored-by: Alex Work &lt;alex@work.example&gt;');
    expect(html).toContain('value="Alex Work &lt;alex@work.example&gt;"');
    expect(html).toContain('placeholder="Alex &lt;alex@example.com&gt;"');
  });

  it('explains why a hardware key cannot be used', () => {
    const hardware: AgentKey = {
      ...fileKey,
      ref: '/home/me/.ssh/id_ed25519_sk',
      type: 'sk-ssh-ed25519@openssh.com',
      usable: false,
      problem: 'security_key',
    };
    const html = render({
      identity: {
        name: 'Contenox Agent',
        email: 'agent@example.com',
        key: hardware.ref,
        sign: false,
        creditMe: true,
        creditAs: '',
      },
      keys: [hardware],
    });
    expect(html).toContain('needs a touch for every commit');
    expect(html).toContain('Hardware security keys need a touch for every signature');
  });

  it('explains what happens with no identity and offers to generate a key', () => {
    const html = render({
      identity: { name: '', email: '', key: '', sign: false, creditMe: true, creditAs: '' },
      me: { name: 'Alex', email: 'alex@example.com', source: 'git' },
      keys: [],
    });
    expect(html).toContain('Agent identity');
    expect(html).toContain('Agents commit with the repository’s own git identity');
    expect(html).toContain('Generate a key for the agent');
    expect(html).toContain('No SSH keys found');
    expect(html).not.toContain('Public key');
    expect(html).not.toContain('>Check<');
  });

  it('previews a signed, co-authored commit and shows the public key to add', () => {
    const html = render({
      identity: {
        name: 'Contenox Agent',
        email: 'agent@example.com',
        key: fileKey.ref,
        sign: true,
        creditMe: true,
        creditAs: '',
      },
      me: { name: 'Alex', email: 'alex@example.com', source: 'git' },
      keys: [fileKey],
    });
    expect(html).toContain('Author: Contenox Agent &lt;agent@example.com&gt;');
    expect(html).toContain('Signed with SSH key SHA256:agentkey');
    expect(html).toContain('Co-authored-by: Alex &lt;alex@example.com&gt;');
    expect(html).toContain('ssh-ed25519 AAAAagent agent@example.com');
    expect(html).toContain('as an authentication key');
    expect(html).toContain('>Check<');
    expect(html).not.toContain('Generate a key for the agent');
  });

  it('says how to fix a passphrase-protected key and keeps it from being saved', () => {
    const locked: AgentKey = {
      ...fileKey,
      ref: '/home/me/.ssh/id_ed25519',
      label: 'id_ed25519',
      usable: false,
      problem: 'passphrase_protected',
    };
    const html = render({
      identity: {
        name: 'Contenox Agent',
        email: 'agent@example.com',
        key: locked.ref,
        sign: false,
        creditMe: false,
        creditAs: '',
      },
      keys: [locked],
    });
    expect(html).toContain('Load it into your SSH agent with ssh-add');
    expect(html).toContain('The selected key cannot be used yet.');
    expect(html).toContain('No git identity found');
  });
});
