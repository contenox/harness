import { describe, expect, it } from 'vitest';
import {
  dispatchPrefill,
  fireAgainPath,
  isMissionCapable,
  missionAgentNames,
  startMissionPath,
  withDispatchDefaults,
} from './missionAgents';
import type { Agent } from './types';

function agent(over: Partial<Agent> & { name: string }): Agent {
  return {
    id: over.name,
    kind: 'external_acp',
    enabled: true,
    configJson: {},
    createdAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z',
    ...over,
  };
}

describe('missionAgentNames', () => {
  it('lists only enabled agents the runtime marks as mission capable, sorted and unique', () => {
    const names = missionAgentNames([
      agent({ name: 'reviewer', missionCapable: true }),
      agent({ name: 'chat-chain', missionCapable: false }),
      agent({ name: 'legacy' }),
      agent({ name: 'retired', missionCapable: true, enabled: false }),
      agent({ name: 'coder', missionCapable: true }),
      agent({ name: 'coder', missionCapable: true }),
    ]);
    expect(names).toEqual(['coder', 'reviewer']);
  });

  it('treats a missing flag as not mission capable', () => {
    expect(isMissionCapable({ enabled: true })).toBe(false);
    expect(missionAgentNames(undefined)).toEqual([]);
  });
});

describe('dispatch form prefill', () => {
  it('reads agent, envelope and intent from the query', () => {
    expect(
      dispatchPrefill(new URLSearchParams('agent=coder&envelope=strict&intent=Fix%20the%20build')),
    ).toEqual({ agentName: 'coder', hitlPolicyName: 'strict', intent: 'Fix the build' });
    expect(dispatchPrefill(new URLSearchParams(''))).toEqual({
      agentName: '',
      hitlPolicyName: '',
      intent: '',
    });
  });

  it('fills only empty fields from the saved defaults and the current project', () => {
    const values = { agentName: 'from-query', hitlPolicyName: '', intent: 'x', cwd: '' };
    expect(
      withDispatchDefaults(values, {
        agentName: 'default-agent',
        hitlPolicyName: 'default-envelope',
        cwd: '/work/project',
      }),
    ).toEqual({
      agentName: 'from-query',
      hitlPolicyName: 'default-envelope',
      intent: 'x',
      cwd: '/work/project',
    });
    expect(withDispatchDefaults(values, {})).toEqual(values);
  });

  it('round-trips a mission into the dispatch form for Fire again', () => {
    const path = fireAgainPath({
      agentName: 'coder',
      hitlPolicyName: 'strict',
      intent: 'Fix the build & report',
    });
    const params = new URLSearchParams(path.split('?')[1]);
    expect(path.startsWith('/missions/new?')).toBe(true);
    expect(dispatchPrefill(params)).toEqual({
      agentName: 'coder',
      hitlPolicyName: 'strict',
      intent: 'Fix the build & report',
    });
  });

  it('pre-selects the agent for Start mission', () => {
    expect(startMissionPath('my agent')).toBe('/missions/new?agent=my+agent');
  });
});
