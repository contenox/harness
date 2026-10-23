import { describe, expect, it } from 'vitest';
import { MAX_SELECTION_EXCERPT, makeQuote, sameQuote, selectionBlockText } from './selectionQuote';

describe('makeQuote', () => {
  it('normalizes inverted and empty ranges and keeps 1-based inclusive lines', () => {
    expect(makeQuote('a.go', 10, 5, 'x')).toEqual({
      path: 'a.go',
      startLine: 5,
      endLine: 10,
      excerpt: 'x',
    });
    expect(makeQuote('a.go', 7, 7, 'x').endLine).toBe(7);
  });

  it('caps the excerpt', () => {
    const q = makeQuote('a.go', 1, 1, 'x'.repeat(MAX_SELECTION_EXCERPT + 50));
    expect(q.excerpt.length).toBeLessThanOrEqual(MAX_SELECTION_EXCERPT + 1);
    expect(q.excerpt.endsWith('…')).toBe(true);
  });
});

describe('sameQuote', () => {
  it('distinguishes range and file changes', () => {
    const a = { path: 'a.go', startLine: 1, endLine: 2, excerpt: 'x' };
    expect(sameQuote(a, { ...a, path: 'b.go' })).toBe(false);
    expect(sameQuote(a, { ...a, startLine: 2 })).toBe(false);
    expect(sameQuote(a, { ...a })).toBe(true);
  });
});

describe('selectionBlockText', () => {
  it('renders file, range and excerpt for the agent', () => {
    expect(
      selectionBlockText({ path: 'src/x.go', startLine: 120, endLine: 140, excerpt: 'body' }),
    ).toBe('[Selection src/x.go:120-140]\nbody');
    expect(selectionBlockText({ path: 'src/x.go', startLine: 9, endLine: 9, excerpt: '' })).toBe(
      '[Selection src/x.go:9]\n',
    );
  });
});
