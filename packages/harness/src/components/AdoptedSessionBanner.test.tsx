import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { fleetKeys, missionKeys } from '../lib/queryKeys';
import type { FleetEntry, Mission } from '../lib/types';
import { AdoptedSessionBanner } from './AdoptedSessionBanner';

vi.mock('../lib/api', () => ({
  api: { listMissions: vi.fn(async () => []) },
}));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function mission(over: Partial<Mission> & { id: string; instanceId: string }): Mission {
  return {
    intent: 'Investigate the flaky nightly test',
    agentName: 'Researcher',
    hitlPolicyName: 'hitl-policy-dev.json',
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

function render(
  props: { instanceId: string; controller: boolean; agentName: string | null },
  missions: Mission[] = [],
  fleet?: FleetEntry[],
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(missionKeys.list(), missions);
  if (fleet) client.setQueryData(fleetKeys.list(), fleet);
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        QueryClientProvider,
        { client },
        createElement(AdoptedSessionBanner, props),
      ),
    ),
  );
}

describe('AdoptedSessionBanner', () => {
  it('labels a controlling adopter "Taken over" without claiming earlier turns are lost', () => {
    const html = render({ instanceId: 'inst-1', controller: true, agentName: 'Researcher' });
    expect(html).toContain('Taken over');
    expect(html).not.toContain('Observing');
    expect(html).toContain('Researcher');
    expect(html).not.toContain('durable from take-over onward');
  });

  it('labels an observer "Observing" (never assuming control it was not granted)', () => {
    const html = render({ instanceId: 'inst-1', controller: false, agentName: 'Researcher' });
    expect(html).toContain('Observing');
    expect(html).not.toContain('Taken over');
  });

  it('links back to the mission when one claims the adopted instance', () => {
    const html = render({ instanceId: 'inst-1', controller: true, agentName: 'Researcher' }, [
      mission({ id: 'mission-9', instanceId: 'inst-1' }),
    ]);
    expect(html).toContain('Back to the mission');
    expect(html).toContain('/missions/mission-9');
  });

  it('omits the mission link for an adopted board session that is not a mission', () => {
    const html = render({ instanceId: 'inst-orphan', controller: true, agentName: null }, [
      mission({ id: 'mission-9', instanceId: 'inst-other' }),
    ]);
    expect(html).not.toContain('Back to the mission');
  });

  it('shows the mission status and a Stop for the live unit', () => {
    const fleet: FleetEntry[] = [
      {
        agentId: 'a-1',
        agentName: 'Researcher',
        kind: 'claude-code',
        instances: [
          {
            id: 'inst-1',
            agentId: 'a-1',
            agentName: 'Researcher',
            kind: 'claude-code',
            state: 'running',
            sessions: 1,
            viewers: 1,
            startedAt: new Date().toISOString(),
            sessionIds: ['unit-1'],
          },
        ],
      },
    ];
    const html = render(
      { instanceId: 'inst-1', controller: true, agentName: 'Researcher' },
      [mission({ id: 'mission-9', instanceId: 'inst-1' })],
      fleet,
    );
    expect(html).toContain('Working');
    expect(html).toContain('Stop instance inst-1');
    expect(html).not.toContain('Stop this instance?');
  });

  it('offers no Stop for a finished mission whose unit is still on the board', () => {
    const fleet: FleetEntry[] = [
      {
        agentId: 'a-1',
        agentName: 'Researcher',
        kind: 'chain',
        instances: [
          {
            id: 'inst-1',
            agentId: 'a-1',
            agentName: 'Researcher',
            kind: 'chain',
            state: 'running',
            sessions: 1,
            viewers: 1,
            startedAt: new Date().toISOString(),
            sessionIds: ['unit-1'],
          },
        ],
      },
    ];
    const html = render(
      { instanceId: 'inst-1', controller: true, agentName: 'Researcher' },
      [mission({ id: 'mission-9', instanceId: 'inst-1', status: 'landed' })],
      fleet,
    );
    expect(html).toContain('Done');
    expect(html).not.toContain('Stop instance inst-1');
  });

  it('offers no Stop once the unit is gone', () => {
    const html = render({ instanceId: 'inst-1', controller: true, agentName: 'Researcher' }, [
      mission({ id: 'mission-9', instanceId: 'inst-1', status: 'abandoned' }),
    ]);
    expect(html).toContain('Stopped');
    expect(html).not.toContain('Stop instance inst-1');
  });
});
