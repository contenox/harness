export function isValidMaxTokens(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  return /^\d+$/.test(trimmed);
}

const LOCALE_TAG = /^[A-Za-z]{2,3}([-_]([A-Za-z]{4}|[A-Za-z]{2}|\d{3}|[A-Za-z0-9]{5,8}))*$/;

export function isValidLocale(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  return LOCALE_TAG.test(trimmed);
}

export function resolveLocaleOverride(
  locale: string | undefined,
  resolvedFrom: string | undefined,
): string {
  if (resolvedFrom !== 'set') return '';
  return locale ?? '';
}

export function resolveTelemetryEnabled(value: string | undefined): boolean {
  return value === 'true';
}

export function resolveUpdateCheckEnabled(value: string | undefined): boolean {
  return value !== 'false';
}
