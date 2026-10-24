import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkspaceFilePeek } from './useWorkspaceFiles';
import {
  previewEntryFromPeek,
  selectPreview,
  type FilePreviewCache,
  type FilePreviewState,
} from '../pages/chat/lib/filePreview';

const DEFAULT_DEBOUNCE_MS = 160;

export function useFilePreview(
  path: string | null,
  readFile: (path: string) => Promise<WorkspaceFilePeek>,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): FilePreviewState {
  const [cache, setCache] = useState<FilePreviewCache>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    setCache({});
    inFlight.current = new Set();
  }, [readFile]);

  useEffect(() => {
    if (!path) return;
    if (cacheRef.current[path] || inFlight.current.has(path)) return;
    const timer = setTimeout(() => {
      inFlight.current.add(path);
      void readFile(path)
        .then(peek => setCache(prev => ({ ...prev, [path]: previewEntryFromPeek(peek) })))
        .catch(() => setCache(prev => ({ ...prev, [path]: { kind: 'error' } })))
        .finally(() => inFlight.current.delete(path));
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [path, readFile, debounceMs]);

  return useMemo(() => selectPreview(path, cache), [path, cache]);
}
