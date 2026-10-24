
export const MAX_SELECTION_EXCERPT = 8000;

export interface SelectionQuote {
  path: string;
  startLine: number;
  endLine: number;
  excerpt: string;
}

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

export function sameQuote(a: SelectionQuote, b: SelectionQuote): boolean {
  return (
    a.path === b.path &&
    a.startLine === b.startLine &&
    a.endLine === b.endLine &&
    a.excerpt === b.excerpt
  );
}

export function selectionBlockText(q: SelectionQuote): string {
  const range = q.startLine === q.endLine ? `${q.startLine}` : `${q.startLine}-${q.endLine}`;
  return `[Selection ${q.path}:${range}]\n${q.excerpt}`;
}
