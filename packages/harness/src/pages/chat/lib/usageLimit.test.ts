import { describe, expect, it } from 'vitest';
import type { SessionConfigOption } from '../../../lib/acp';
import { effectiveUsageMax, tokenLimitFromOptions } from './usageLimit';

const opt = (currentValue: string): SessionConfigOption => ({
  id: 'token-limit',
  name: 'Token Limit',
  type: 'select',
  currentValue,
  options: [],
});

describe('usage limit selection', () => {
  it('shows the effective runtime window even if the selected limit is higher', () => {
    expect(effectiveUsageMax(131072, [opt('1000000')])).toBe(131072);
    expect(effectiveUsageMax(0, [opt('1000000')])).toBe(1000000);
  });
  it('falls back to the reported window for chain default / 0 / garbage / missing', () => {
    expect(effectiveUsageMax(131072, [opt('0')])).toBe(131072);
    expect(effectiveUsageMax(131072, [opt('default')])).toBe(131072);
    expect(effectiveUsageMax(131072, [])).toBe(131072);
    expect(tokenLimitFromOptions([opt('')])).toBeNull();
  });
});
