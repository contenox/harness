import { describe, expect, it } from 'vitest';
import { agentRowStatus, problemKey } from './externalAgentStatus';
import type { ExternalAgent, ExternalAgentPresetStatus } from './types';

const agent: ExternalAgent = {
  id: 'a',
  name: 'claude-code',
  title: 'Claude Code',
  enabled: true,
  preset: 'claude-code',
  version: '0.100.0',
  command: 'node',
  args: [],
  env: {},
  paths: [],
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
  installed: true,
  installState: 'installed',
  updateReady: false,
  node: { found: true },
  agent,
};

describe('agentRowStatus', () => {
  it('asks to install a preset that is not there yet', () => {
    expect(
      agentRowStatus({
        preset: { ...preset, installed: false, installState: 'idle', agent: undefined },
      }).state,
    ).toBe('not_installed');
  });

  it('shows install progress and failure before anything else', () => {
    expect(agentRowStatus({ preset: { ...preset, installState: 'installing' }, agent }).dot).toBe(
      'checking',
    );
    expect(agentRowStatus({ preset: { ...preset, installState: 'failed' }, agent }).state).toBe(
      'install_failed',
    );
  });

  it('puts a turned-off agent before its check', () => {
    expect(
      agentRowStatus({ preset, agent: { ...agent, enabled: false }, checking: true }).state,
    ).toBe('off');
  });

  it('orders checking, problem, sign-in and ready', () => {
    const base = { preset, agent };
    expect(agentRowStatus({ ...base, checking: true }).state).toBe('checking');
    expect(agentRowStatus(base).state).toBe('unchecked');
    expect(
      agentRowStatus({
        ...base,
        check: {
          ready: false,
          authMethods: [],
          checkedAt: '',
          problem: { kind: 'sandbox_unavailable', message: '' },
        },
      }).state,
    ).toBe('problem');
    expect(
      agentRowStatus({
        ...base,
        check: { ready: false, authMethods: [], checkedAt: '', signedIn: false },
      }).dot,
    ).toBe('attention');
    expect(
      agentRowStatus({
        ...base,
        check: { ready: true, authMethods: [], checkedAt: '', signedIn: true },
      }).dot,
    ).toBe('available');
  });

  it('treats an agent that reports no sign-in state as ready', () => {
    expect(
      agentRowStatus({
        agent: { ...agent, preset: undefined },
        check: { ready: true, authMethods: [], checkedAt: '' },
      }).state,
    ).toBe('ready');
  });
});

describe('problemKey', () => {
  it('falls back to a generic message for unknown kinds', () => {
    expect(problemKey('sandbox_unavailable')).toBe('external_agents.problem.sandbox_unavailable');
    expect(problemKey('something_new')).toBe('external_agents.problem.generic');
    expect(problemKey(undefined)).toBe('external_agents.problem.generic');
  });
});
