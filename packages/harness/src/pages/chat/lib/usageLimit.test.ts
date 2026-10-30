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
  it('follows the selected token limit', () => {
    expect(effectiveUsageMax(131072, [opt('272000')])).toBe(272000);
  });
  it('falls back to the reported window for chain default / 0 / garbage / missing', () => {
    expect(effectiveUsageMax(131072, [opt('0')])).toBe(131072);
    expect(effectiveUsageMax(131072, [opt('default')])).toBe(131072);
    expect(effectiveUsageMax(131072, [])).toBe(131072);
    expect(tokenLimitFromOptions([opt('')])).toBeNull();
  });
});
