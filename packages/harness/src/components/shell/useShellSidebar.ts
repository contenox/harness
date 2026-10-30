import { useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 640px)';

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** Sidebar open state: starts open on desktop, and folds away whenever the viewport becomes narrow. */
export function useShellSidebar(defaultOpen = true) {
  const [isOpen, setIsOpen] = useState(() => defaultOpen && isDesktopViewport());

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const fold = () => {
      if (!media.matches) setIsOpen(false);
    };
    fold();
    media.addEventListener('change', fold);
    return () => media.removeEventListener('change', fold);
  }, []);

  return { isOpen, setIsOpen, toggle: () => setIsOpen(open => !open) };
}
