import { describe, expect, it } from 'vitest';
import { splitLeadingThinking } from './thinkingTags';

describe('splitLeadingThinking', () => {
  it('leaves answers without a leading thinking tag alone', () => {
    expect(splitLeadingThinking('Hello <thinking>x</thinking>')).toEqual({
      thinking: null,
      answer: 'Hello <thinking>x</thinking>',
    });
  });

  it('splits a closed leading thinking block from the answer', () => {
    expect(
      splitLeadingThinking('<thinking> I need to read the README.md file </thinking>\n\nThe project is a CLI.'),
    ).toEqual({ thinking: 'I need to read the README.md file', answer: 'The project is a CLI.' });
  });

  it('treats an unclosed block as thinking still streaming', () => {
    expect(splitLeadingThinking('<thinking>\nstill going')).toEqual({ thinking: 'still going', answer: '' });
  });
});
