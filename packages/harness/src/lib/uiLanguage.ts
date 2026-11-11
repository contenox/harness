import type { i18n as I18n } from 'i18next';

export const UI_LANGUAGE_STORAGE_KEY = 'i18nextLng';

export function uiLanguageFor(locale: string, detected: string, navigatorLanguage: string): string {
  return locale.trim() || detected.trim() || navigatorLanguage.trim() || 'en';
}

export async function applyUiLanguage(
  i18n: Pick<I18n, 'changeLanguage'>,
  locale: string,
  detected: string,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null,
  navigatorLanguage: string,
): Promise<void> {
  const trimmed = locale.trim();
  try {
    if (trimmed) storage?.setItem(UI_LANGUAGE_STORAGE_KEY, trimmed);
    else storage?.removeItem(UI_LANGUAGE_STORAGE_KEY);
  } catch {
    return i18n
      .changeLanguage(uiLanguageFor(trimmed, detected, navigatorLanguage))
      .then(() => undefined);
  }
  await i18n.changeLanguage(uiLanguageFor(trimmed, detected, navigatorLanguage));
}
