
export const MAX_SELECTION_EXCERPT = 8000;

/**
 * A region of one workspace file the user selected in a preview and asked the agent about.
 */
export interface SelectionQuote {
  path: string;
  startLine: number;
  endLine: number;
  excerpt: string;
}

/**
 * Builds a quote from a raw selection, capping the excerpt and normalizing an inverted or empty range to a single line.
 */
export function makeQuote(
  path: string,
  startLine: number,
  endLine: number,
  text: string,
): SelectionQuote {
  const from = Math.max(1, Math.min(startLine, endLine));
  const to = Math.max(from, Math.max(startLine, endLine));
  const excerpt =
    text.length > MAX_SELECTION_EXCERPT ? `${text.slice(0, MAX_SELECTION_EXCERPT - 1)}…` : text;
  return { path, startLine: from, endLine: to, excerpt };
}

/**
 * One quote equals another when file, range and excerpt match — used to keep the composer from carrying two identical asks.
 */
export function sameQuote(a: SelectionQuote, b: SelectionQuote): boolean {
  return (
    a.path === b.path &&
    a.startLine === b.startLine &&
    a.endLine === b.endLine &&
    a.excerpt === b.excerpt
  );
}

/**
 * Renders a quote as prompt text the agent understands as context about a file region: the path with an explicit line range, then the quoted text, marked as a point-in-time selection (the agent still has the path to read current disk content when precision matters).
 */
export function selectionBlockText(q: SelectionQuote): string {
  const range = q.startLine === q.endLine ? `${q.startLine}` : `${q.startLine}-${q.endLine}`;
  return `[Selection ${q.path}:${range}]\n${q.excerpt}`;
}
