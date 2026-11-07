import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ConnectorDetails } from '../../../components/connectors/ConnectorDetails';
import { ConnectorForm } from '../../../components/connectors/ConnectorForm';
import i18n from '../../../i18n';
import type { Connector } from '../../../lib/connectorTypes';
import { connectorKeys } from '../../../lib/queryKeys';
import { SessionConnectorsPanel } from '../../chat/components/SessionConnectorsDialog';

vi.mock('../../../lib/api', () => ({ api: {} }));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const render = (node: ReactElement, client = new QueryClient()) =>
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, node)),
  );

const ready: Connector = {
  name: 'github',
  label: 'github',
  kind: 'mcp',
  id: '1',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  scope: 'everywhere',
  status: 'ready',
  tools: [
    { name: 'create_issue', description: 'Open an issue' },
    { name: 'search_code', description: 'Search code' },
  ],
};

describe('ConnectorDetails', () => {
  it('shows the tool count, the command and each tool', () => {
    const html = render(
      <ConnectorDetails connector={ready} checking={false} onCheck={() => undefined} />,
    );
    expect(html).toContain('Ready · 2 tools');
    expect(html).toContain('create_issue');
    expect(html).toContain('Check again');
  });

  it('offers sign-in for a server that needs it and keeps raw errors under Details', () => {
    const html = render(
      <ConnectorDetails
        connector={{
          ...ready,
          kind: 'mcp',
          transport: 'http',
          url: 'https://mcp.example/mcp',
          status: 'needs_sign_in',
          tools: [],
        }}
        checking={false}
        onCheck={() => undefined}
        onSignIn={() => undefined}
      />,
    );
    expect(html).toContain('Needs sign-in');
    expect(html).toContain('>Sign in<');
    const down = render(
      <ConnectorDetails
        connector={{ ...ready, status: 'unavailable', problem: 'dial tcp: refused', tools: [] }}
        checking={false}
        onCheck={() => undefined}
      />,
    );
    expect(down).toContain('Contenox could not reach this connector');
    expect(down.indexOf('dial tcp: refused')).toBeGreaterThan(down.indexOf('Details'));
  });
});

describe('ConnectorForm', () => {
  it('offers every kind and where it works on the connectors page', () => {
    const html = render(
      <ConnectorForm
        takenNames={[]}
        workspaces={[{ path: 'C:\\code\\app', name: 'app' }]}
        pending={false}
        onSave={() => undefined}
      />,
    );
    expect(html).toContain('MCP server on this computer');
    expect(html).toContain('Remote MCP server');
    expect(html).toContain('OpenAPI service');
    expect(html).toContain('Only in app');
    expect(html).toContain('Environment variables');
  });

  it('limits a chat connector to MCP and has no scope choice', () => {
    const html = render(
      <ConnectorForm forChat takenNames={[]} pending={false} onSave={() => undefined} />,
    );
    expect(html).not.toContain('OpenAPI service');
    expect(html).not.toContain('Where it works');
    expect(html).toContain('Add to this chat');
  });
});

describe('SessionConnectorsPanel', () => {
  const controller = {
    sessionConnectors: vi.fn(),
    setSessionConnector: vi.fn(),
    addSessionConnector: vi.fn(),
    setSessionConnectorTool: vi.fn(),
    removeSessionConnector: vi.fn(),
  };

  it('groups the chat connectors with a switch each', () => {
    const client = new QueryClient();
    client.setQueryData(connectorKeys.session('s1'), [
      { ...ready, enabled: true },
      { ...ready, name: 'acp-1-notes', label: 'notes', scope: 'session', enabled: false },
      {
        name: 'local_shell',
        label: 'local_shell',
        kind: 'builtin',
        scope: 'everywhere',
        status: 'ready',
        tools: [{ name: 'run' }],
        enabled: true,
      },
    ] satisfies Connector[]);
    const html = render(
      <SessionConnectorsPanel sessionId="s1" controller={controller} onClose={() => undefined} />,
      client,
    );
    expect(html).toContain('Switch tools on or off for this chat only.');
    expect(html).toContain('Added to this chat');
    expect(html).toContain('Every chat');
    expect(html).toContain('Built-in tools');
    expect(html).toContain('Use notes in this chat');
    expect(html).toContain('Manage connectors');
  });

  it('asks for a first message before a chat exists', () => {
    const html = render(
      <SessionConnectorsPanel sessionId={null} controller={controller} onClose={() => undefined} />,
    );
    expect(html).toContain('Send a message first');
  });
});

describe('ConnectorToolsPanel', () => {
  it('shows a switch per tool, off for a hidden one, with a scope choice', async () => {
    const { ConnectorToolsPanel } = await import('../../../components/connectors/ConnectorToolsPanel');
    const html = render(
      <ConnectorToolsPanel
        connector={{ ...ready, hidden: { '': ['search_code'] } }}
        workspaces={[{ path: 'C:\\code\\app', name: 'app' }]}
      />,
    );
    expect(html).toContain('2 tools');
    expect(html).toContain('Agents can use create_issue');
    expect(html).toMatch(/aria-label="Agents can use search_code"(?![^>]*checked)/);
    expect(html).toContain('Only in app');
  });
});

describe('advanced connector fields', () => {
  it('offers injected values, login handshake and certificate options for OpenAPI', () => {
    const html = render(
      <ConnectorForm
        initial={{ ...emptyFormForTest(), kind: 'openapi', login: true, insecureSkipVerify: true }}
        editing
        takenNames={[]}
        pending={false}
        onSave={() => undefined}
      />,
    );
    expect(html).toContain('Advanced');
  });
});

function emptyFormForTest() {
  return {
    kind: 'command' as const,
    name: 'x',
    workspace: '',
    command: '',
    args: '',
    env: '',
    url: '',
    transport: 'http' as const,
    headers: '',
    auth: 'none' as const,
    token: '',
    tokenEnv: '',
    oauthClientId: '',
    specUrl: '',
    timeoutMs: '10000',
    inject: '',
    connectTimeout: '30',
    oauthSecretEnv: '',
    propName: '',
    propValue: '',
    propIn: 'body' as const,
    login: false,
    loginMethod: 'POST',
    loginUrl: '',
    loginBody: '',
    extractCookie: '',
    extractJsonPath: '',
    injectHeader: '',
    injectFormat: '',
    insecureSkipVerify: false,
  };
}
