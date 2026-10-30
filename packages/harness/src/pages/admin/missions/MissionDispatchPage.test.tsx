import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { agentKeys, envelopeKeys } from '../../../lib/queryKeys';
import type { Agent, Envelope } from '../../../lib/types';
import MissionDispatchPage from './MissionDispatchPage';

vi.mock('../../../lib/api', () => ({
  api: {
    getAgents: vi.fn(async () => []),
    listEnvelopes: vi.fn(async () => []),
    dispatchMission: vi.fn(),
  },
}));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function agent(over: Partial<Agent> & { name: string }): Agent {
  return {
    id: over.name,
    kind: 'external_acp',
    enabled: true,
    configJson: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

function renderForm(agents: Agent[], envelopes: Envelope[]): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(agentKeys.list({ limit: 100, cursor: undefined }), agents);
  client.setQueryData(envelopeKeys.list(), envelopes);
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(QueryClientProvider, { client }, createElement(MissionDispatchPage)),
    ),
  );
}

describe('MissionDispatchPage', () => {
  it('offers only enabled agents', () => {
    const html = renderForm(
      [
        agent({ name: 'researcher', enabled: true }),
        agent({ name: 'retired-agent', enabled: false }),
      ],
      [{ name: 'dev', description: 'development' }],
    );
    expect(html).toContain('researcher');
    expect(html).not.toContain('retired-agent');
  });

  it('offers every declared envelope as a choice', () => {
    const html = renderForm(
      [agent({ name: 'researcher' })],
      [{ name: 'dev', description: 'development' }, { name: 'strict', description: 'locked down' }],
    );
    expect(html).toContain('dev');
    expect(html).toContain('strict');
  });

  it('marks agent, intent, and envelope as required, and cwd as optional', () => {
    const html = renderForm([agent({ name: 'researcher' })], [{ name: 'dev', description: 'development' }]);
    const agentLabelIdx = html.indexOf('Agent');
    const cwdLabelIdx = html.indexOf('Working directory');
    expect(html).toContain('Intent');
    expect(html).toContain('Envelope');
    expect(agentLabelIdx).toBeGreaterThan(-1);
    expect(cwdLabelIdx).toBeGreaterThan(-1);
  });

  it('renders no validation errors and issues no dispatch merely by rendering', async () => {
    const html = renderForm([agent({ name: 'researcher' })], [{ name: 'dev', description: 'development' }]);
    expect(html).not.toContain('Choose an agent.');
    expect(html).not.toContain('Intent is required.');
    expect(html).not.toContain('Choose an envelope.');
    const { api } = await import('../../../lib/api');
    expect(api.dispatchMission).not.toHaveBeenCalled();
  });

  it('shows the fire-a-mission submit action', () => {
    const html = renderForm([agent({ name: 'researcher' })], [{ name: 'dev', description: 'development' }]);
    expect(html).toContain('Fire mission');
  });
});

