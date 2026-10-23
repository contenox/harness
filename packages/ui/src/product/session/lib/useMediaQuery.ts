import { useEffect, useState } from 'react';

/**
 * Whether a media query currently matches, re-evaluated on change.
 *
 * The layout uses it to keep the tree and preview beside the chat on wide
 * screens and to collapse them into one pane on narrow ones. Non-browser
 * environments (tests, SSR) report false.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}
