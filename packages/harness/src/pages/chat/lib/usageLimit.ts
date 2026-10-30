import type { SessionConfigOption } from '../../../lib/acp';

export const TOKEN_LIMIT_CONFIG_ID = 'token-limit';

/** Token count of the selected token-limit option; null for "chain default" / 0 / unparsable values. */
export function tokenLimitFromOptions(options: readonly SessionConfigOption[]): number | null {
  const opt = options.find(o => o.id === TOKEN_LIMIT_CONFIG_ID);
  const raw = opt?.currentValue?.trim();
  if (!raw || !/^\d+/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The meter's max: the selected token limit when set, else the runtime-reported context window. */
export function effectiveUsageMax(reportedSize: number, options: readonly SessionConfigOption[]): number {
  return tokenLimitFromOptions(options) ?? reportedSize;
}
