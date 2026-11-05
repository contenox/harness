import { describe, expect, it } from 'vitest';
import {
  isValidLocale,
  isValidMaxTokens,
  resolveLocaleOverride,
  resolveTelemetryEnabled,
  resolveUpdateCheckEnabled,
} from './settingsValidation';

describe('isValidMaxTokens', () => {
  it('accepts empty (clears the override)', () => {
    expect(isValidMaxTokens('')).toBe(true);
    expect(isValidMaxTokens('   ')).toBe(true);
  });

  it('accepts non-negative integers', () => {
    expect(isValidMaxTokens('0')).toBe(true);
    expect(isValidMaxTokens('8192')).toBe(true);
  });

  it('rejects negative numbers, decimals, and non-numeric text', () => {
    expect(isValidMaxTokens('-1')).toBe(false);
    expect(isValidMaxTokens('3.14')).toBe(false);
    expect(isValidMaxTokens('abc')).toBe(false);
  });
});

describe('resolveTelemetryEnabled', () => {
  it('is opt-in: off unless literally "true"', () => {
    expect(resolveTelemetryEnabled(undefined)).toBe(false);
    expect(resolveTelemetryEnabled('')).toBe(false);
    expect(resolveTelemetryEnabled('false')).toBe(false);
    expect(resolveTelemetryEnabled('TRUE')).toBe(false);
    expect(resolveTelemetryEnabled('true')).toBe(true);
  });
});

describe('resolveUpdateCheckEnabled', () => {
  it('is opt-out: on unless literally "false"', () => {
    expect(resolveUpdateCheckEnabled(undefined)).toBe(true);
    expect(resolveUpdateCheckEnabled('')).toBe(true);
    expect(resolveUpdateCheckEnabled('true')).toBe(true);
    expect(resolveUpdateCheckEnabled('false')).toBe(false);
  });
});

describe('isValidLocale', () => {
  it('accepts empty (back to the detected locale)', () => {
    expect(isValidLocale('')).toBe(true);
    expect(isValidLocale('  ')).toBe(true);
  });

  it('accepts language tags in either separator style', () => {
    expect(isValidLocale('de-DE')).toBe(true);
    expect(isValidLocale('en_US')).toBe(true);
    expect(isValidLocale('zh-Hant-TW')).toBe(true);
    expect(isValidLocale('es-419')).toBe(true);
    expect(isValidLocale('fr')).toBe(true);
  });

  it('rejects words and malformed tags', () => {
    expect(isValidLocale('German')).toBe(false);
    expect(isValidLocale('de-')).toBe(false);
    expect(isValidLocale('d')).toBe(false);
    expect(isValidLocale('de DE')).toBe(false);
  });
});

describe('resolveLocaleOverride', () => {
  it('shows the saved value only when it was set by the operator', () => {
    expect(resolveLocaleOverride('de-DE', 'set')).toBe('de-DE');
    expect(resolveLocaleOverride('de-DE', 'detected')).toBe('');
    expect(resolveLocaleOverride(undefined, undefined)).toBe('');
  });
});
