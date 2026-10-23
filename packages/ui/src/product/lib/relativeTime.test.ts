import { afterEach, describe, expect, it, vi } from 'vitest';
import { UI_LOCALE, formatDate, formatDateTime, relativeTime } from './relativeTime';

const NOW = Date.parse('2026-08-21T12:00:00Z');


function at(offsetMs: number): string {
  return new Date(NOW - offsetMs).toISOString();
}

function freeze(): void {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
}


const LOCAL_NOON = '2026-08-12T12:00:00';

afterEach(() => {
  vi.useRealTimers();
});

describe('UI_LOCALE', () => {
  it('is English, because the product is', () => {
    expect(UI_LOCALE).toBe('en');
  });
});

describe('relativeTime', () => {
  it('is English rather than the reader locale', () => {
    freeze();
    expect(relativeTime(at(17 * 60 * 60 * 1000), 'just now')).toBe('17 hours ago');
  });

  it('rounds to the coarsest sensible unit', () => {
    freeze();
    expect(relativeTime(at(90 * 1000), 'just now')).toBe('2 minutes ago');
    expect(relativeTime(at(3 * 60 * 60 * 1000), 'just now')).toBe('3 hours ago');
    expect(relativeTime(at(3 * 24 * 60 * 60 * 1000), 'just now')).toBe('3 days ago');
    expect(relativeTime(at(90 * 24 * 60 * 60 * 1000), 'just now')).toBe('3 months ago');
    expect(relativeTime(at(800 * 24 * 60 * 60 * 1000), 'just now')).toBe('2 years ago');
  });

  it('returns the caller-supplied string below 45 seconds', () => {
    freeze();
    expect(relativeTime(at(10 * 1000), 'just now')).toBe('just now');
  });

  it('hands back an unparseable timestamp rather than "Invalid Date"', () => {
    expect(relativeTime('not a date', 'just now')).toBe('not a date');
  });
});

describe('formatDate', () => {
  it('is English rather than the reader locale', () => {
    expect(formatDate(LOCAL_NOON)).toBe('Aug 12, 2026');
  });

  it('hands back an unparseable timestamp', () => {
    expect(formatDate('nope')).toBe('nope');
  });
});

describe('formatDateTime', () => {
  it('is English rather than the reader locale, and carries a clock time', () => {
    expect(formatDateTime(LOCAL_NOON)).toBe('Aug 12, 2026, 12:00 PM');
  });

  it('hands back an unparseable timestamp', () => {
    expect(formatDateTime('nope')).toBe('nope');
  });
});
