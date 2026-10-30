import type { SessionConfigOption } from '@contenox/acp-client';
import { describe, expect, it } from 'vitest';
import { currentChoiceLabel, optionChoices, splitComposerOptions } from './composerChips';

function opt(id: string, extra: Partial<SessionConfigOption> = {}): SessionConfigOption {
  return {
    id,
    name: id,
    type: 'select',
    currentValue: 'a',
    options: [
      { value: 'a', name: 'Alpha' },
      { value: 'b', name: 'Beta' },
    ],
    ...extra,
  };
}

describe('splitComposerOptions', () => {
  it('picks the approval and model options and leaves the rest for overflow', () => {
    const out = splitComposerOptions([
      opt('think'),
      opt('model'),
      opt('hitl-policy'),
      opt('token-limit'),
      opt('workspace-root'),
    ]);
    expect(out.mode?.id).toBe('hitl-policy');
    expect(out.model?.id).toBe('model');
    expect(out.rest.map(o => o.id)).toEqual(['think', 'token-limit']);
  });

  it('recognizes external-agent mode and model by id or category', () => {
    const out = splitComposerOptions([opt('mode'), opt('x', { category: 'model' })]);
    expect(out.mode?.id).toBe('mode');
    expect(out.model?.id).toBe('x');
    expect(out.rest).toEqual([]);
  });

  it('handles an empty list', () => {
    expect(splitComposerOptions([])).toEqual({ mode: undefined, model: undefined, rest: [] });
  });
});

describe('choices', () => {
  it('lists flat choices and labels the current value', () => {
    const o = opt('model', { currentValue: 'b' });
    expect(optionChoices(o)).toEqual([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
    expect(currentChoiceLabel(o)).toBe('Beta');
  });

  it('flattens groups and falls back to the raw value', () => {
    const o = opt('model', {
      currentValue: 'zzz',
      options: [{ group: 'g', name: 'Group', options: [{ value: 'a', name: 'Alpha' }] }],
    });
    expect(optionChoices(o)).toEqual([{ value: 'a', label: 'Group / Alpha' }]);
    expect(currentChoiceLabel(o)).toBe('zzz');
  });
});
