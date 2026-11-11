import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failureTurnKey, loadDismissedErrors, saveDismissedErrors } from './dismissedErrors';

function stubStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  });
  return store;
}

describe('dismissedErrors', () => {
  beforeEach(() => {
    stubStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps dismissals per session', () => {
    saveDismissedErrors('s1', new Set(['failure-a-1']));
    expect([...loadDismissedErrors('s1')]).toEqual(['failure-a-1']);
    expect(loadDismissedErrors('s2').size).toBe(0);
    expect(loadDismissedErrors(null).size).toBe(0);
  });

  it('survives unreadable or malformed storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '{not json',
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(loadDismissedErrors('s1').size).toBe(0);
    expect(() => saveDismissedErrors('s1', new Set(['x']))).not.toThrow();
  });

  it('keys a failure by the user turn it follows, independent of text and message ids', () => {
    expect(failureTurnKey(2)).toBe('failure-turn-2');
    expect(failureTurnKey(2)).not.toBe(failureTurnKey(3));
    saveDismissedErrors('s1', new Set([failureTurnKey(1)]));
    expect(loadDismissedErrors('s1').has(failureTurnKey(1))).toBe(true);
    expect(loadDismissedErrors('s1').has(failureTurnKey(2))).toBe(false);
  });
});
