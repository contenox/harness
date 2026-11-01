import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import { backendKeys } from '../../../../lib/queryKeys';
import type { Backend } from '../../../../lib/types';
import BackendsSection from './BackendsSection';

vi.mock('../../../../lib/api', () => ({
  api: {
    getBackends: vi.fn(() => new Promise<Backend[]>(() => {})),
  },
}));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function backend(over: Partial<Backend> & { id: string }): Backend {
  return {
    name: 'Local Llama',
    baseUrl: '/models',
    type: 'local',
    models: [],
    pulledModels: [],
    error: '',
    ...over,
  };
}

function newClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function erroredClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false, refetchOnMount: false } },
  });
}

function renderSection(client: QueryClient): string {
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(BackendsSection)),
  );
}

describe('BackendsSection', () => {
  it('keeps the initial fetch local to the panel', () => {
    expect(renderSection(newClient())).toContain('Loading backends...');
  });

  it('lists configured backends', () => {
    const client = newClient();
    client.setQueryData<Backend[]>(backendKeys.all, [backend({ id: 'b1' })]);
    expect(renderSection(client)).toContain('Local Llama');
  });

  it('shows the empty state without backends', () => {
    const client = newClient();
    client.setQueryData<Backend[]>(backendKeys.all, []);
    expect(renderSection(client)).toContain('No backends configured');
  });

  it('renders the error state with a retry when the list request fails', async () => {
    const client = erroredClient();
    await client
      .fetchQuery({
        queryKey: backendKeys.all,
        queryFn: async () => {
          throw new Error('backend unreachable');
        },
        retry: false,
      })
      .catch(() => undefined);

    const markup = renderSection(client);
    expect(markup).toContain('Error loading backends');
    expect(markup).toContain('backend unreachable');
  });
});
