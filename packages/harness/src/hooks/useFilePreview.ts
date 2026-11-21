import { useEffect, useState } from 'react';
import {
  previewEntryFromPeek,
  selectPreview,
  type FilePreviewEntry,
  type FilePreviewState,
} from '../pages/chat/lib/filePreview';
import type { WorkspaceFilePeek } from './useWorkspaceFiles';

export function useFilePreview(
  path: string | null,
  readFile: (path: string) => Promise<WorkspaceFilePeek>,
  debounceMs = 160,
): FilePreviewState {
  const [result, setResult] = useState<{
    path: string;
    reader: typeof readFile;
    entry: FilePreviewEntry;
  } | null>(null);
  useEffect(() => {
    setResult(null);
    if (!path) return;
    let current = true;
    const timer = setTimeout(() => {
      void readFile(path)
        .then(previewEntryFromPeek)
        .catch((): FilePreviewEntry => ({ kind: 'error' }))
        .then(entry => {
          if (current) setResult({ path, reader: readFile, entry });
        });
    }, debounceMs);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [path, readFile, debounceMs]);
  return selectPreview(path, result?.reader === readFile ? { [result.path]: result.entry } : {});
}
