const STEP_FAILURE = /^\[step "[^"]*" \([^)]*\) (?:failed: ([\s\S]*)|was cancelled before completion|timed out)\]$/;
const CHAIN_FAILURE = /^\[chain failed: ([\s\S]*)\]$/;

const INTERNAL_SEGMENT =
  /^(?:task [\w-]+|route task [\w-]+|prompt execution failed|chain execution failed|task chain-[\w-]+ failed after \d+ retries|step "[^"]*".*)$/i;

const MAX_SUMMARY = 220;

export type PersistedFailure = {
  summary: string;
  details: string;
};

export function isPersistedFailure(text: string): boolean {
  const trimmed = text.trim();
  return STEP_FAILURE.test(trimmed) || CHAIN_FAILURE.test(trimmed);
}

function reasonOf(text: string): string {
  const trimmed = text.trim();
  const body = STEP_FAILURE.exec(trimmed)?.[1] ?? CHAIN_FAILURE.exec(trimmed)?.[1] ?? '';
  const segments = body
    .split(': ')
    .map(segment => segment.trim())
    .filter(segment => segment && !INTERNAL_SEGMENT.test(segment));
  const reason = segments.join(': ');
  if (reason.length <= MAX_SUMMARY) return reason;
  return `${reason.slice(0, MAX_SUMMARY - 1).trimEnd()}…`;
}

export function describePersistedFailures(texts: string[]): PersistedFailure {
  const summary = texts.map(reasonOf).find(Boolean) ?? '';
  return { summary, details: texts.map(text => text.trim()).join('\n\n') };
}
