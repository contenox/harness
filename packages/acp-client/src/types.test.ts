import { describe, expect, it } from 'vitest';
import {
  ARGUMENT_COMPLETIONS_META_KEY,
  argumentCompletionsFromCommand,
  FIRST_ARGUMENT_KEY,
} from './types';

describe('argumentCompletionsFromCommand', () => {
  it('reads the first argument and named flags the runtime advertises', () => {
    const completions = argumentCompletionsFromCommand({
      _meta: {
        [ARGUMENT_COMPLETIONS_META_KEY]: {
          '': { values: ['coder', 'reviewer'], hint: '<agent>' },
          '--policy': { values: ['strict'], hint: '<envelope>' },
        },
      },
    });
    expect(completions.get(FIRST_ARGUMENT_KEY)).toEqual({
      values: ['coder', 'reviewer'],
      hint: '<agent>',
    });
    expect(completions.get('--policy')).toEqual({ values: ['strict'], hint: '<envelope>' });
  });

  it('keeps a hint-only entry so the composer can explain an open argument', () => {
    const completions = argumentCompletionsFromCommand({
      _meta: { [ARGUMENT_COMPLETIONS_META_KEY]: { '': { values: [], hint: 'free text' } } },
    });
    expect(completions.get('')).toEqual({ values: [], hint: 'free text' });
  });

  it('trims, de-duplicates and drops non-string values', () => {
    const completions = argumentCompletionsFromCommand({
      _meta: {
        [ARGUMENT_COMPLETIONS_META_KEY]: { '': { values: [' a ', 'a', 3, '', null, 'b'] } },
      },
    });
    expect(completions.get('')).toEqual({ values: ['a', 'b'], hint: '' });
  });

  it('is empty for a command without metadata or with malformed metadata', () => {
    expect(argumentCompletionsFromCommand({}).size).toBe(0);
    expect(
      argumentCompletionsFromCommand({ _meta: { [ARGUMENT_COMPLETIONS_META_KEY]: ['x'] } }).size,
    ).toBe(0);
    expect(
      argumentCompletionsFromCommand({
        _meta: { [ARGUMENT_COMPLETIONS_META_KEY]: { '': 'x', '--policy': { values: [] } } },
      }).size,
    ).toBe(0);
  });
});
