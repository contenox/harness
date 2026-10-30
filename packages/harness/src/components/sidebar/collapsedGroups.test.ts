import { describe, expect, it } from 'vitest';
import { toggleKey } from './collapsedGroups';

describe('toggleKey', () => {
  it('adds a missing key and removes a present one without mutating', () => {
    const base = new Set(['a']);
    const added = toggleKey(base, 'b');
    expect([...added].sort()).toEqual(['a', 'b']);
    expect([...base]).toEqual(['a']);
    expect([...toggleKey(added, 'a')]).toEqual(['b']);
  });
});
