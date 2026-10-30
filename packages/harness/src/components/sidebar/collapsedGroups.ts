import { useCallback, useState } from 'react';

const COLLAPSED_KEY = 'contenox_sidebar_collapsed_groups';
// Not a valid path, so it can never collide with a project root.
export const OTHER_GROUP_KEY = '<other>';

export function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

export function writeCollapsed(collapsed: Set<string>): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Persisting the folded state is a convenience only.
  }
}

/** Pure toggle used by the hook (kept separate for testing). */
export function toggleKey(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Which sidebar groups are folded; persisted across launches. */
export function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed);
  const toggle = useCallback(
    (key: string) =>
      setCollapsed(prev => {
        const next = toggleKey(prev, key);
        writeCollapsed(next);
        return next;
      }),
    [],
  );
  return { isOpen: (key: string) => !collapsed.has(key), toggle };
}
