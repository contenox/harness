import { useState } from 'react';

export function useCursorPages() {
  const [pages, setPages] = useState<string[]>(['']);
  return {
    cursor: pages[pages.length - 1],
    previous: () => setPages(p => (p.length > 1 ? p.slice(0, -1) : p)),
    next: (cursor: string) => setPages(p => [...p, cursor]),
    reset: () => setPages(['']),
  };
}
