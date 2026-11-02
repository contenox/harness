import { describe, expect, it } from 'vitest';
import { missionProblem } from './missionProblem';

describe('missionProblem', () => {
  it('shows why a failed mission failed even when the runtime left no last error', () => {
    expect(
      missionProblem({ status: 'derailed', statusReason: 'unit turn failed: model not found' }),
    ).toBe('unit turn failed: model not found');
    expect(missionProblem({ status: 'stuck', statusReason: 'needs a human decision' })).toBe(
      'needs a human decision',
    );
  });

  it('prefers the last error when there is one', () => {
    expect(
      missionProblem({ status: 'open', lastError: 'provider not set', statusReason: 'x' }),
    ).toBe('provider not set');
  });

  it('says nothing for a mission that went well or was stopped', () => {
    expect(missionProblem({ status: 'landed', statusReason: 'Reported two bugs' })).toBeUndefined();
    expect(
      missionProblem({ status: 'abandoned', statusReason: 'stopped by operator' }),
    ).toBeUndefined();
    expect(missionProblem({ status: 'open' })).toBeUndefined();
  });
});
