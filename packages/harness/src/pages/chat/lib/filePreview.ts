
export type FilePreviewEntry =
  | { kind: 'text'; text: string }
  | { kind: 'binary' }
  | { kind: 'error' };

export type FilePreviewCache = Record<string, FilePreviewEntry>;

export type FilePreviewState =
  | { status: 'hidden' }
  | { status: 'loading'; path: string }
  | { status: 'text'; path: string; text: string }
  | { status: 'binary'; path: string }
  | { status: 'error'; path: string };

export function previewEntryFromPeek(peek: { text: string; isBinary: boolean }): FilePreviewEntry {
  return peek.isBinary ? { kind: 'binary' } : { kind: 'text', text: peek.text };
}

export function selectPreview(path: string | null, cache: FilePreviewCache): FilePreviewState {
  if (!path) return { status: 'hidden' };
  const entry = cache[path];
  if (!entry) return { status: 'loading', path };
  if (entry.kind === 'text') return { status: 'text', path, text: entry.text };
  if (entry.kind === 'binary') return { status: 'binary', path };
  return { status: 'error', path };
}
