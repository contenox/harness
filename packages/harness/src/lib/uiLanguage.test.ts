import { describe, expect, it, vi } from 'vitest';
import { UI_LANGUAGE_STORAGE_KEY, applyUiLanguage, uiLanguageFor } from './uiLanguage';

describe('uiLanguageFor', () => {
  it('prefers the saved locale, then the detected one, then the browser', () => {
    expect(uiLanguageFor('de-DE', 'en-US', 'fr')).toBe('de-DE');
    expect(uiLanguageFor('', 'en-US', 'fr')).toBe('en-US');
    expect(uiLanguageFor(' ', '', 'fr')).toBe('fr');
    expect(uiLanguageFor('', '', '')).toBe('en');
  });
});

describe('applyUiLanguage', () => {
  it('stores the locale for the next start and switches the UI now', async () => {
    const changeLanguage = vi.fn(async () => ({}) as never);
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    await applyUiLanguage({ changeLanguage }, 'en-US', 'de-DE', storage, 'de');
    expect(storage.setItem).toHaveBeenCalledWith(UI_LANGUAGE_STORAGE_KEY, 'en-US');
    expect(changeLanguage).toHaveBeenCalledWith('en-US');
  });

  it('clears the stored override and follows the detected locale when emptied', async () => {
    const changeLanguage = vi.fn(async () => ({}) as never);
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    await applyUiLanguage({ changeLanguage }, '', 'de-DE', storage, 'en');
    expect(storage.removeItem).toHaveBeenCalledWith(UI_LANGUAGE_STORAGE_KEY);
    expect(changeLanguage).toHaveBeenCalledWith('de-DE');
  });
});
