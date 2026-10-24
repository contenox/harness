import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';


export function clampFraction(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function fractionFromPointer(
  containerStart: number,
  containerSize: number,
  pointer: number,
): number {
  if (containerSize <= 0) return 0;
  return (pointer - containerStart) / containerSize;
}

export interface ResizableSplitOptions {
  storageKey: string;
  defaultFraction?: number;
  min?: number;
  max?: number;
  orientation?: 'horizontal' | 'vertical';
}

export interface ResizableSplit {
  fraction: number;
  containerRef: RefObject<HTMLDivElement | null>;
  firstPaneStyle: CSSProperties;
  onHandlePointerDown: (e: ReactPointerEvent) => void;
  isDragging: boolean;
}

function readPersistedFraction(key: string, fallback: number, min: number, max: number): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw !== null) return clampFraction(parseFloat(raw), min, max);
    }
  } catch {
  }
  return clampFraction(fallback, min, max);
}

function writePersistedFraction(key: string, value: number): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value.toFixed(4));
  } catch {
  }
}

export function useResizableSplit(options: ResizableSplitOptions): ResizableSplit {
  const { storageKey, defaultFraction = 0.5, min = 0.15, max = 0.85, orientation = 'horizontal' } =
    options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fraction, setFraction] = useState(() =>
    readPersistedFraction(storageKey, defaultFraction, min, max),
  );
  const [isDragging, setIsDragging] = useState(false);

  const onHandlePointerDown = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const next =
        orientation === 'horizontal'
          ? fractionFromPointer(rect.left, rect.width, e.clientX)
          : fractionFromPointer(rect.top, rect.height, e.clientY);
      setFraction(clampFraction(next, min, max));
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, orientation, min, max]);

  useEffect(() => {
    if (!isDragging) writePersistedFraction(storageKey, fraction);
  }, [isDragging, fraction, storageKey]);

  const percent = `${(fraction * 100).toFixed(2)}%`;
  const firstPaneStyle: CSSProperties =
    orientation === 'horizontal' ? { width: percent } : { height: percent };

  return { fraction, containerRef, firstPaneStyle, onHandlePointerDown, isDragging };
}
