import { describe, expect, it } from 'vitest';
import { transferPercentage } from './InferenceCards';

describe('transferPercentage', () => {
  it('clamps progress and rejects unknown totals', () => {
    expect(transferPercentage({ status: 'pulling', total: 200, completed: 50 })).toBe(25);
    expect(transferPercentage({ status: 'pulling', total: 100, completed: 120 })).toBe(100);
    expect(transferPercentage({ status: 'queued' })).toBeNull();
  });
});
