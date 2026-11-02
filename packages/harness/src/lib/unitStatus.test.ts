import { describe, expect, it } from 'vitest';
import type { HITLApproval, MissionReport } from './types';
import {
  blockedMissionIds,
  composeUnitStatus,
  deriveUnitPrimary,
  needsYouMissionIds,
  unitAttentionRank,
} from './unitStatus';

describe('deriveUnitPrimary — one plain status per unit', () => {
  it('says nothing when there is nothing to say', () => {
    expect(deriveUnitPrimary({})).toBeNull();
    expect(composeUnitStatus({})).toEqual([]);
  });

  it('maps each terminal verdict to plain words', () => {
    expect(deriveUnitPrimary({ missionStatus: 'landed' })?.labelKey).toBe('unit.primary_done');
    expect(deriveUnitPrimary({ missionStatus: 'derailed' })?.labelKey).toBe('unit.primary_failed');
    expect(deriveUnitPrimary({ missionStatus: 'stuck' })?.labelKey).toBe('unit.primary_stuck');
    expect(deriveUnitPrimary({ missionStatus: 'abandoned' })?.labelKey).toBe(
      'unit.primary_stopped',
    );
  });

  it('lets a terminal verdict win over a live process, a blocker and a heartbeat', () => {
    const atoms = composeUnitStatus({
      missionStatus: 'derailed',
      instanceState: 'running',
      blocked: true,
      lastHeartbeat: '2026-07-21T09:00:00Z',
      lastError: 'tool crashed',
    });
    expect(atoms).toEqual([
      expect.objectContaining({ kind: 'primary', primary: 'failed', reason: 'tool crashed' }),
    ]);
  });

  it('puts "needs you" above working for an open mission', () => {
    const primary = deriveUnitPrimary({
      missionStatus: 'open',
      instanceState: 'running',
      blocked: true,
    });
    expect(primary?.primary).toBe('needs_you');
  });

  it('never reads an open mission with an error as running', () => {
    const primary = deriveUnitPrimary({
      missionStatus: 'open',
      instanceState: 'running',
      lastError: 'model refused',
    });
    expect(primary).toMatchObject({ primary: 'failed', reason: 'model refused' });
    expect(deriveUnitPrimary({ missionStatus: 'open', instanceState: 'error' })?.primary).toBe(
      'failed',
    );
  });

  it('is working only while the mission is open and its unit is live', () => {
    expect(deriveUnitPrimary({ missionStatus: 'open', instanceState: 'running' })?.primary).toBe(
      'working',
    );
    expect(deriveUnitPrimary({ missionStatus: 'open', instanceState: 'starting' })?.primary).toBe(
      'working',
    );
    expect(deriveUnitPrimary({ missionStatus: 'open', instanceState: 'stopped' })?.primary).toBe(
      'idle',
    );
    expect(deriveUnitPrimary({ missionStatus: 'open' })?.primary).toBe('idle');
  });

  it('falls back to the process state for a unit that is not on a mission', () => {
    expect(composeUnitStatus({ instanceState: 'running' })).toEqual([
      expect.objectContaining({ primary: 'process', labelKey: 'fleet.state.running' }),
    ]);
  });

  it('echoes a mission status this build does not know', () => {
    const primary = deriveUnitPrimary({
      missionStatus: 'quarantined' as never,
      instanceState: 'running',
    });
    expect(primary).toMatchObject({ primary: 'unknown', label: 'quarantined' });
    expect(primary?.labelKey).toBeUndefined();
  });
});

describe('composeUnitStatus — heartbeat stays secondary', () => {
  it('adds the heartbeat after the primary status of an open mission', () => {
    const atoms = composeUnitStatus({
      missionStatus: 'open',
      instanceState: 'running',
      lastHeartbeat: '2026-07-21T09:00:00Z',
    });
    expect(atoms.map(a => a.kind)).toEqual(['primary', 'liveness']);
    expect(atoms[1]?.heartbeat).toBe('2026-07-21T09:00:00Z');
  });

  it('says "never reported" honestly when there was no heartbeat', () => {
    const never = composeUnitStatus({ missionStatus: 'open' }).find(a => a.kind === 'liveness');
    expect(never?.heartbeat).toBeUndefined();
    expect(never?.labelKey).toBe('missions.heartbeat_never');
  });

  it('drops the heartbeat once the mission has an outcome', () => {
    expect(
      composeUnitStatus({ missionStatus: 'landed', lastHeartbeat: '2026-07-21T09:00:00Z' }).map(
        a => a.kind,
      ),
    ).toEqual(['primary']);
  });
});

describe('unitAttentionRank', () => {
  it('ranks failures first, then units that need a human', () => {
    expect(unitAttentionRank({ missionStatus: 'derailed', instanceState: 'stopped' })).toBe(0);
    expect(unitAttentionRank({ instanceState: 'error' })).toBe(0);
    expect(unitAttentionRank({ missionStatus: 'stuck', instanceState: 'running' })).toBe(1);
    expect(
      unitAttentionRank({ missionStatus: 'open', instanceState: 'running', blocked: true }),
    ).toBe(1);
    expect(unitAttentionRank({ instanceState: 'warning' })).toBe(1);
  });

  it('leaves healthy and finished units alone', () => {
    expect(unitAttentionRank({ missionStatus: 'open', instanceState: 'running' })).toBeNull();
    expect(unitAttentionRank({ missionStatus: 'landed', instanceState: 'running' })).toBeNull();
    expect(unitAttentionRank({ instanceState: 'running' })).toBeNull();
  });
});

describe('needsYouMissionIds', () => {
  const approval = (over: Partial<HITLApproval> & { id: string }): HITLApproval => ({
    toolsName: 'mission',
    toolName: 'mission_ask_attention',
    state: 'pending',
    createdAt: '2026-07-21T10:00:00Z',
    expiresAt: '2026-07-21T11:00:00Z',
    ...over,
  });

  it('joins pending asks and approvals with missions whose latest report is a blocker', () => {
    const ids = needsYouMissionIds(
      [
        {
          id: 'r1',
          missionId: 'm-blocked',
          kind: 'blocker',
          summary: 's',
          createdAt: '2026-07-21T10:00:00Z',
        },
      ],
      [
        approval({ id: 'a1', missionId: 'm-ask' }),
        approval({ id: 'a2', missionId: 'm-done', state: 'approved' }),
        approval({ id: 'a3' }),
      ],
    );
    expect([...ids].sort()).toEqual(['m-ask', 'm-blocked']);
  });
});

describe('blockedMissionIds — a mission is blocked when its LATEST report is a blocker', () => {
  const report = (
    over: Partial<MissionReport> & { id: string; missionId: string },
  ): MissionReport => ({
    kind: 'progress',
    summary: 's',
    createdAt: new Date().toISOString(),
    ...over,
  });

  it('includes a mission whose newest report is a blocker', () => {
    const set = blockedMissionIds([
      report({ id: 'r1', missionId: 'm1', kind: 'blocker', createdAt: '2026-07-21T10:00:00Z' }),
    ]);
    expect(set.has('m1')).toBe(true);
  });

  it('clears a mission once a later non-blocker report supersedes the blocker', () => {
    const set = blockedMissionIds([
      report({ id: 'r1', missionId: 'm1', kind: 'blocker', createdAt: '2026-07-21T10:00:00Z' }),
      report({ id: 'r2', missionId: 'm1', kind: 'progress', createdAt: '2026-07-21T11:00:00Z' }),
    ]);
    expect(set.has('m1')).toBe(false);
  });

  it('scopes blocked-ness per mission', () => {
    const set = blockedMissionIds([
      report({ id: 'r1', missionId: 'm1', kind: 'blocker', createdAt: '2026-07-21T10:00:00Z' }),
      report({ id: 'r2', missionId: 'm2', kind: 'result', createdAt: '2026-07-21T10:00:00Z' }),
    ]);
    expect([...set]).toEqual(['m1']);
  });

  it('tolerates an unparseable timestamp without throwing', () => {
    expect(() =>
      blockedMissionIds([
        report({ id: 'r1', missionId: 'm1', kind: 'blocker', createdAt: 'not-a-date' }),
      ]),
    ).not.toThrow();
  });
});
