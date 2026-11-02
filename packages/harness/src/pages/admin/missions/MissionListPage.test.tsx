import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { fleetKeys, missionKeys } from '../../../lib/queryKeys';
import type { FleetEntry, Mission } from '../../../lib/types';
import MissionListPage from './MissionListPage';

vi.mock('../../../lib/api', () => ({
  api: {
    listMissions: vi.fn(async () => []),
    getFleet: vi.fn(async () => []),
    listMissionReports: vi.fn(async () => []),
  },
}));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function baseMission(over: Partial<Mission> & { id: string }): Mission {
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

function renderList(missions: Mission[], fleet?: FleetEntry[]): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(missionKeys.list(), missions);
  if (fleet) client.setQueryData(fleetKeys.list(), fleet);
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(QueryClientProvider, { client }, createElement(MissionListPage)),
    ),
  );
}

describe('MissionListPage', () => {
  it('renders an empty fleet honestly, with no fabricated rows', () => {
    const html = renderList([]);
    expect(html).toContain('No missions yet');
  });

  it('shows intent as the primary, linked fact, plus agent, status, and envelope', () => {
    const html = renderList([
      baseMission({
        id: 'mission-1',
        intent: 'Investigate the flaky nightly test',
        agentName: 'Researcher',
        hitlPolicyName: 'hitl-policy-dev.json',
        status: 'landed',
      }),
    ]);

    expect(html).toContain('href="/missions/mission-1"');
    expect(html).toContain('Investigate the flaky nightly test');
    expect(html).toContain('Researcher');
    expect(html).toContain('Done');
    expect(html).toContain('hitl-policy-dev.json');
  });

  it('is honest that a mission has never reported — distinct from a stale heartbeat', () => {
    const html = renderList([baseMission({ id: 'mission-1', lastHeartbeat: undefined })]);
    expect(html).toContain('Never reported');
  });

  it('renders an actual heartbeat as relative time, not the never-reported label', () => {
    const html = renderList([
      baseMission({
        id: 'mission-1',
        lastHeartbeat: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      }),
    ]);
    expect(html).not.toContain('Never reported');
    expect(html).toContain('minute');
  });

  it('shows LastError when present, and omits any error line when absent', () => {
    const withError = renderList([
      baseMission({ id: 'mission-1', lastError: 'agent process exited unexpectedly' }),
    ]);
    expect(withError).toContain('Last error');
    expect(withError).toContain('agent process exited unexpectedly');

    const withoutError = renderList([baseMission({ id: 'mission-1' })]);
    expect(withoutError).not.toContain('Last error');
  });

  it('offers a Fire a mission action', () => {
    const html = renderList([baseMission({ id: 'mission-1' })]);
    expect(html).toContain('Fire a mission');
  });

  it('offers Stop only for an open mission whose unit is still on the board, and Fire again always', () => {
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
            viewers: 0,
            startedAt: new Date().toISOString(),
            sessionIds: ['unit-1'],
          },
        ],
      },
    ];
    const html = renderList(
      [
        baseMission({ id: 'open-1', intent: 'Keep going', instanceId: 'inst-1' }),
        baseMission({ id: 'done-1', intent: 'Finished', instanceId: 'inst-1', status: 'landed' }),
      ],
      fleet,
    );
    expect(html).toContain('Stop the mission &quot;Keep going&quot;');
    expect(html).not.toContain('Stop the mission &quot;Finished&quot;');
    expect(html).toContain('Fire &quot;Finished&quot; again');
    expect(html).toContain('Working');
  });

  it('gives the empty list one way to fill it', () => {
    const html = renderList([]);
    expect(html.match(/>Fire a mission<\/button>/g)?.length).toBe(2);
  });
});
