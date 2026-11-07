const PREFIX = 'contenox.dismissedErrors.';
const MAX_ENTRIES = 200;

function keyFor(sessionId: string): string {
  return `${PREFIX}${sessionId}`;
}

export function loadDismissedErrors(sessionId: string | null): ReadonlySet<string> {
  if (!sessionId) return new Set();
  try {
    const raw = localStorage.getItem(keyFor(sessionId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'));
  } catch {
    return new Set();
  }
}

export function saveDismissedErrors(sessionId: string | null, ids: ReadonlySet<string>): void {
  if (!sessionId) return;
  try {
    localStorage.setItem(keyFor(sessionId), JSON.stringify([...ids].slice(-MAX_ENTRIES)));
  } catch {
    return;
  }
}

export function failureTurnKey(userTurnOrdinal: number): string {
  return `failure-turn-${userTurnOrdinal}`;
}
