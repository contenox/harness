import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Width of the parent element of the returned ref's element, or `null` until measured
 * (and in environments without ResizeObserver). Lets a footer degrade by the room it actually has.
 */
export function useParentWidth<T extends HTMLElement>(): [RefObject<T | null>, number | null] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent || typeof ResizeObserver === 'undefined') return;
    const measure = () => setWidth(parent.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
