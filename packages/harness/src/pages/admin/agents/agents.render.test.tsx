import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { agentRowStatus } from '../../../lib/externalAgentStatus';
import type { ExternalAgent, ExternalAgentCheck, ExternalAgentPresetStatus } from '../../../lib/types';
import { AgentDetails } from './components/AgentDetails';
import { AgentForm } from './components/AgentForm';
import { PresetInstall } from './components/PresetInstall';

vi.mock('../../../lib/api', () => ({ api: {} }));
vi.mock('./useStartAgentChat', () => ({ useStartAgentChat: () => () => undefined }));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const render = (node: ReactElement) =>
  renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, node));

const agent: ExternalAgent = {
  id: 'a',
  name: 'claude-code',
  title: 'Claude Code',
  enabled: true,
  preset: 'claude-code',
  version: '0.100.0',
  command: 'C:\\node\\node.exe',
  args: ['C:\\agents\\index.js'],
  env: {},
  paths: [{ path: 'C:\\Users\\op\\.claude', mode: 'rw', needs: "Claude's sign-in" }],
  modes: ['default', 'plan'],
  mcpServers: [],
  sandbox: { readsLimited: false },
  createdAt: '',
  updatedAt: '',
};

const preset: ExternalAgentPresetStatus = {
  id: 'claude-code',
  title: 'Claude Code',
  agentName: 'claude-code',
  package: '@agentclientprotocol/claude-agent-acp',
  version: '0.100.0',
  minNode: 22,
  modes: ['default', 'plan'],
  homepage: '',
  installed: false,
  installState: 'idle',
  updateReady: false,
  node: { found: false },
};

const checkOf = (data: ExternalAgentCheck) =>
  ({ data, isFetching: false, error: null, refetch: () => Promise.resolve() }) as unknown as UseQueryResult<
    ExternalAgentCheck,
    Error
  >;

describe('PresetInstall', () => {
  it('explains what installs and points to Node.js when it is missing', () => {
    const html = render(<PresetInstall preset={preset} />);
    expect(html).toContain('Install Claude Code');
    expect(html).toContain('@agentclientprotocol/claude-agent-acp 0.100.0');
    expect(html).toContain('Node.js 22 or later');
    expect(html).toContain('Download Node.js');
  });
});

describe('AgentDetails', () => {
  it('offers the sign-in methods when the agent is signed out', () => {
    const check = checkOf({
      ready: false,
      signedIn: false,
      authMethods: [
        { id: 'claude-ai-login', name: 'Claude Subscription', type: 'terminal' },
        { id: 'console-login', name: 'Anthropic Console', type: 'terminal' },
      ],
      checkedAt: '',
    });
    const status = agentRowStatus({ agent, check: check.data });
    const html = render(<AgentDetails agent={agent} title="Claude Code" status={status} check={check} />);
    expect(html).toContain('Sign in to Claude Code before you chat with it.');
    expect(html).toContain('Sign in with Claude Subscription');
    expect(html).toContain('Sign in with Anthropic Console');
  });

  it('names the problem in plain words and keeps the raw error under details', () => {
    const check = checkOf({
      ready: false,
      authMethods: [],
      checkedAt: '',
      problem: { kind: 'command_not_found', message: 'the agent command was not found', detail: 'exec: not found' },
    });
    const status = agentRowStatus({ agent, check: check.data });
    const html = render(<AgentDetails agent={agent} title="Claude Code" status={status} check={check} />);
    expect(html).toContain("The agent&#x27;s program was not found.");
    expect(html.indexOf('exec: not found')).toBeGreaterThan(html.indexOf('Details'));
  });

  it('shows a ready agent with its sign-in and what it may do', () => {
    const check = checkOf({ ready: true, signedIn: true, authLabel: 'Claude Max', authMethods: [], checkedAt: '', agent: { version: '0.100.0' } });
    const status = agentRowStatus({ agent, check: check.data });
    const html = render(<AgentDetails agent={agent} title="Claude Code" status={status} check={check} />);
    expect(html).toContain('Ready · Claude Max');
    expect(html).toContain('Start a chat');
    expect(html).toContain('What it may do');
  });
});

describe('AgentForm', () => {
  it('asks for a name only when adding an agent', () => {
    expect(render(<AgentForm takenNames={[]} onSaved={() => undefined} />)).toContain('Add agent');
    const edit = render(<AgentForm agent={{ ...agent, preset: undefined }} takenNames={[]} onSaved={() => undefined} />);
    expect(edit).toContain('Save');
    expect(edit).not.toContain('Lowercase letters, digits and dashes.');
  });
});
