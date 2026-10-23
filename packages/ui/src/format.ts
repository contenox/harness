/**
 * Formats a number using locale-aware compact notation (e.g. 12345 -> "12.3K", 1500000 -> "1.5M").
 */
export function formatCompactNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
