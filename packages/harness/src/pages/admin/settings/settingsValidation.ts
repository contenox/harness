
export function isValidMaxTokens(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  return /^\d+$/.test(trimmed);
}

export function resolveTelemetryEnabled(value: string | undefined): boolean {
  return value === 'true';
}

export function resolveUpdateCheckEnabled(value: string | undefined): boolean {
  return value !== 'false';
}
