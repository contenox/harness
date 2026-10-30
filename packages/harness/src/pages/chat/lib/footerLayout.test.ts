import type { SessionConfigOption } from '@contenox/acp-client';
import { describe, expect, it } from 'vitest';
import { splitComposerOptions } from './composerChips';
import { footerEndLayout } from './footerLayout';

const sel = (id: string, category?: string): SessionConfigOption =>
  ({ id, name: id, type: 'select', category, currentValue: 'a', options: [{ value: 'a', name: 'A' }] }) as SessionConfigOption;

const options = splitComposerOptions([
  sel('workspace-root'),
  sel('model', 'model'),
  sel('hitl-policy'),
  sel('think'),
  sel('token-limit'),
]);

describe('splitComposerOptions', () => {
  it('makes model and hitl-policy chips and leaves the rest for the overflow', () => {
    expect(options.model?.id).toBe('model');
    expect(options.mode?.id).toBe('hitl-policy');
    expect(options.rest.map(o => o.id)).toEqual(['think', 'token-limit']);
  });
});

describe('footerEndLayout', () => {
  it('uses the wide layout until measured (null or 0)', () => {
    for (const w of [null, 0]) {
      const l = footerEndLayout(w, options);
      expect(l.chipsInOverflow).toBe(false);
      expect(l.compactUsage).toBe(false);
      expect(l.overflowOptions.map(o => o.id)).toEqual(['think', 'token-limit']);
    }
  });
  it('compacts usage below 620px but keeps the chips', () => {
    const l = footerEndLayout(500, options);
    expect(l.compactUsage).toBe(true);
    expect(l.chipsInOverflow).toBe(false);
  });
  it('moves mode and model into the overflow below 360px', () => {
    const l = footerEndLayout(300, options);
    expect(l.chipsInOverflow).toBe(true);
    expect(l.overflowOptions.map(o => o.id)).toEqual(['hitl-policy', 'model', 'think', 'token-limit']);
  });
});
