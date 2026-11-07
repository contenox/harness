import { describe, expect, it } from 'vitest';
import {
  emptyConnectorForm,
  formFromMcpServer,
  mcpInputFromForm,
  parseHeaders,
  remoteToolsInputFromForm,
  sessionServerFromForm,
  validateConnectorForm,
  type ConnectorFormValues,
} from './connectorForm';

const form = (patch: Partial<ConnectorFormValues>): ConnectorFormValues => ({
  ...emptyConnectorForm,
  ...patch,
});

describe('connector form', () => {
  it('turns a local command into a stdio MCP server with env and one argument per line', () => {
    const input = mcpInputFromForm(
      form({
        name: 'github',
        command: 'npx',
        args: '-y\n@modelcontextprotocol/server-github\n',
        env: 'GITHUB_TOKEN=abc=def',
      }),
    );
    expect(input).toMatchObject({
      name: 'github',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_TOKEN: 'abc=def' },
    });
    expect(input.workspace).toBeUndefined();
  });

  it('keeps transport, headers, token and workspace for a remote server', () => {
    const input = mcpInputFromForm(
      form({
        kind: 'remote',
        name: 'linear',
        url: 'https://mcp.linear.app/sse',
        transport: 'sse',
        headers: 'X-Team: core',
        auth: 'bearer',
        token: 'tok',
        workspace: 'C:\\code\\app',
      }),
    );
    expect(input).toMatchObject({
      transport: 'sse',
      url: 'https://mcp.linear.app/sse',
      headers: { 'X-Team': 'core' },
      authType: 'bearer',
      authToken: 'tok',
      workspace: 'C:\\code\\app',
    });
  });

  it('round-trips a saved server back into the form', () => {
    const values = formFromMcpServer({
      id: '1',
      name: 'fs',
      transport: 'http',
      url: 'https://x/mcp',
      headers: { A: 'b' },
      authType: 'oauth',
      oauthClientId: 'cid',
      connectTimeoutSeconds: 30,
    });
    expect(values).toMatchObject({
      kind: 'remote',
      transport: 'http',
      auth: 'oauth',
      oauthClientId: 'cid',
      headers: 'A: b',
    });
  });

  it('validates the fields each kind needs', () => {
    expect(validateConnectorForm(form({ name: 'Bad Name' }), [], false).name).toBe(
      'connectors.form.name_invalid',
    );
    expect(validateConnectorForm(form({ name: 'dup', command: 'x' }), ['dup'], false).name).toBe(
      'connectors.form.name_taken',
    );
    expect(validateConnectorForm(form({ name: 'a', command: '' }), [], false).command).toBe(
      'connectors.form.command_required',
    );
    expect(
      validateConnectorForm(form({ name: 'a', command: 'x', env: 'NOVALUE' }), [], false).env,
    ).toBe('connectors.form.env_invalid');
    const remote = validateConnectorForm(
      form({ kind: 'remote', name: 'a', url: 'ftp://x', auth: 'bearer', headers: 'broken' }),
      [],
      false,
    );
    expect(remote).toMatchObject({
      url: 'connectors.form.url_invalid',
      headers: 'connectors.form.headers_invalid',
      token: 'connectors.form.token_required',
    });
    const api = validateConnectorForm(
      form({ kind: 'openapi', name: 'a', url: 'https://x', timeoutMs: '0', specUrl: 'nope' }),
      [],
      false,
    );
    expect(api).toMatchObject({
      timeoutMs: 'connectors.form.timeout_invalid',
      specUrl: 'connectors.form.spec_invalid',
    });
    expect(
      validateConnectorForm(form({ kind: 'remote', name: 'ok', url: 'https://x/mcp' }), [], false),
    ).toEqual({});
  });

  it('builds OpenAPI tools and per-chat ACP servers', () => {
    expect(
      remoteToolsInputFromForm(
        form({ kind: 'openapi', name: 'api', url: 'https://api', timeoutMs: '5000' }),
      ),
    ).toMatchObject({
      name: 'api',
      endpointUrl: 'https://api',
      timeoutMs: 5000,
    });
    expect(
      sessionServerFromForm(form({ name: 'local', command: 'uvx', args: 'server', env: 'K=v' })),
    ).toEqual({
      name: 'local',
      command: 'uvx',
      args: ['server'],
      env: [{ name: 'K', value: 'v' }],
    });
    expect(
      sessionServerFromForm(
        form({ kind: 'remote', name: 'r', url: 'https://r/mcp', auth: 'bearer', token: 't' }),
      ),
    ).toEqual({
      type: 'http',
      name: 'r',
      url: 'https://r/mcp',
      headers: [{ name: 'Authorization', value: 'Bearer t' }],
    });
  });

  it('parses header lines and reports bad ones', () => {
    expect(parseHeaders('A: 1\nB:2\n\nbad line')).toEqual({
      headers: { A: '1', B: '2' },
      bad: ['bad line'],
    });
  });
});
