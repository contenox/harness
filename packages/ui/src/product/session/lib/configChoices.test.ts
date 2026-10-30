import { describe, expect, it } from 'vitest';
import type { SessionConfigOption } from '@contenox/acp-client';
import { buildChoiceEntries, choiceItems, needsSearch, summarizeChoice } from './configChoices';

const grouped = (currentValue: string): SessionConfigOption => ({
  id: 'model',
  name: 'Model',
  type: 'select',
  currentValue,
  options: [
    { group: 'any', name: 'Any provider', options: [{ value: 'auto/x', name: 'x' }] },
    {
      group: 'openai-codex',
      name: 'openai-codex',
      options: [
        { value: 'openai-codex/gpt-5', name: 'gpt-5' },
        { value: 'weird/va/lue', name: 'gpt-mini', description: 'small' },
      ],
    },
  ],
});

describe('buildChoiceEntries', () => {
  it('keeps runtime order with group headers', () => {
    const e = buildChoiceEntries(grouped(''));
    expect(e.map(x => (x.kind === 'header' ? `# ${x.label}` : x.label))).toEqual([
      '# Any provider',
      'x',
      '# openai-codex',
      'gpt-5',
      'gpt-mini',
    ]);
  });
  it('filters by name, value, group or description and drops empty groups', () => {
    const e = buildChoiceEntries(grouped(''), 'small');
    expect(e.map(x => (x.kind === 'header' ? x.label : x.value))).toEqual(['openai-codex', 'weird/va/lue']);
    expect(choiceItems(buildChoiceEntries(grouped(''), 'zzz'))).toEqual([]);
  });
  it('keyboard order skips headers', () => {
    expect(choiceItems(buildChoiceEntries(grouped(''))).map(i => i.value)).toEqual([
      'auto/x',
      'openai-codex/gpt-5',
      'weird/va/lue',
    ]);
  });
  it('flat options have no headers', () => {
    const o: SessionConfigOption = { id: 'think', name: 'T', type: 'select', currentValue: 'a', options: [{ value: 'a', name: 'A' }] };
    expect(buildChoiceEntries(o).every(e => e.kind === 'item')).toBe(true);
  });
  it('searches only above the threshold', () => {
    expect(needsSearch(grouped(''))).toBe(false);
    const many: SessionConfigOption = {
      id: 'm', name: 'M', type: 'select', currentValue: '',
      options: Array.from({ length: 9 }, (_, i) => ({ value: `v${i}`, name: `V${i}` })),
    };
    expect(needsSearch(many)).toBe(true);
  });
});

describe('summarizeChoice', () => {
  it('shows name, group badge and "group · name" title; value is opaque', () => {
    expect(summarizeChoice(grouped('weird/va/lue'))).toEqual({ label: 'gpt-mini', badge: 'openai-codex', title: 'openai-codex · gpt-mini' });
  });
  it('is unset for "" or unknown values', () => {
    expect(summarizeChoice(grouped('')).label).toBeNull();
    expect(summarizeChoice(grouped('nope')).label).toBeNull();
  });
});
