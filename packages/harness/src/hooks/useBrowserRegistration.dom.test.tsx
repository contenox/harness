import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { connectorKeys } from '../lib/queryKeys';
import { installFakeDom } from '../test/fakeDom';
import { refreshConnectors, useBrowserRegistration } from './useConnectors';

function BrowserConsumer({ active }: { active: boolean }) {
  useBrowserRegistration(active);
  return null;
}

it('reads only the saved Browser registration and refreshes it after connector changes', async () => {
  const dom = installFakeDom();
  const root = createRoot(dom.container as unknown as HTMLElement);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const server = {
    name: 'browser',
    transport: 'stdio',
    command: '/opt/Contenox',
    env: { ELECTRON_RUN_AS_NODE: '1' },
    args: [
      '/app/browser-mcp.cjs',
      '/profile/endpoint.json',
      '51832800-606c-464a-9d56-4f1d0adabae2',
    ],
    workspace: '/project',
  };
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(Response.json(server))
    .mockResolvedValueOnce(Response.json({ ...server, command: '/other/Browser' }))
    .mockResolvedValueOnce(new Response(null, { status: 404 }));
  vi.stubGlobal('fetch', request);
  const render = async (active: boolean) =>
    act(() =>
      root.render(
        <QueryClientProvider client={client}>
          <BrowserConsumer active={active} />
        </QueryClientProvider>,
      ),
    );
  const data = () => client.getQueryData(connectorKeys.browser());
  try {
    await render(true);
    Object.assign(window, {
      contenoxDesktop: { browser: { connector: async () => server }, platform: 'linux' },
    });
    await render(false);
    expect(request).not.toHaveBeenCalled();

    await render(true);
    await vi.waitFor(() => expect(data()).toBeNull());
    refreshConnectors(client);
    await vi.waitFor(() =>
      expect(data()).toEqual({ id: '51832800-606c-464a-9d56-4f1d0adabae2', workspace: '/project' }),
    );
    refreshConnectors(client);
    await vi.waitFor(() => expect(data()).toBeNull());
    refreshConnectors(client);
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(4));
    expect(request.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      '/api/mcp-servers/by-name/browser',
      '/api/mcp-servers/by-name/browser',
      '/api/mcp-servers/by-name/browser',
      '/api/mcp-servers/by-name/browser',
    ]);
  } finally {
    await act(() => root.unmount());
    client.clear();
    vi.unstubAllGlobals();
    dom.uninstall();
  }
});
