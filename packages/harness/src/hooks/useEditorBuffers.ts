import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { buffersReducer, touchedPaths, type EditorBuffers } from '../lib/editorBuffers';
import { ApiError } from '../lib/fetch';
import { cwdRawFetch } from '../lib/projectRuntime';
import type { WorkspaceEvent } from '../lib/workspaceEvents';

export interface FileVersion {
  text: string;
  etag: string;
  isBinary: boolean;
}

export type PutResult =
  | { kind: 'saved'; etag: string }
  | { kind: 'conflict'; currentEtag: string }
  | { kind: 'error'; message: string };

export interface EditorApi {
  buffers: EditorBuffers;
  open: (path: string) => void;
  edit: (path: string, text: string) => void;
  save: (path: string) => Promise<boolean>;
  reload: (path: string) => Promise<void>;
  overwrite: (path: string) => Promise<boolean>;
  close: (path: string) => void;
  moved: (from: string, to: string) => void;
  handleEvent: (event: WorkspaceEvent) => void;
}

export async function putFile(
  root: string,
  path: string,
  text: string,
  ifMatch: string | null,
): Promise<PutResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ifMatch) headers['If-Match'] = `"${ifMatch}"`;
  let response: Response;
  try {
    response = await cwdRawFetch(root, `/api/files?${new URLSearchParams({ root }).toString()}`, {
      method: ifMatch ? 'PUT' : 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ path, content: text }),
    });
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const record = (body ?? {}) as Record<string, unknown>;
  if (response.status === 409) {
    const error = (record.error ?? {}) as Record<string, unknown>;
    return {
      kind: 'conflict',
      currentEtag: typeof error.currentEtag === 'string' ? error.currentEtag : '',
    };
  }
  if (!response.ok) {
    const error = (record.error ?? {}) as Record<string, unknown>;
    return {
      kind: 'error',
      message:
        typeof error.message === 'string' ? error.message : `save failed (${response.status})`,
    };
  }
  return { kind: 'saved', etag: typeof record.etag === 'string' ? record.etag : '' };
}

function postEditorEvent(root: string, type: string, subject: string) {
  void cwdRawFetch(root, `/api/workspace/events?${new URLSearchParams({ root }).toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ type, subject }),
  }).catch(() => undefined);
}

export function useEditorBuffers(
  root: string | null,
  readVersion: (path: string) => Promise<FileVersion>,
): EditorApi {
  const [buffers, dispatch] = useReducer(buffersReducer, {});
  const ref = useRef(buffers);
  ref.current = buffers;
  const checks = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const reported = useRef(new Map<string, boolean>());

  const report = useCallback(
    (path: string, dirty: boolean) => {
      if (!root || !reported.current.has(path) || reported.current.get(path) === dirty) return;
      reported.current.set(path, dirty);
      postEditorEvent(root, dirty ? 'editor.dirty' : 'editor.clean', path);
    },
    [root],
  );

  useEffect(() => {
    dispatch({ type: 'reset' });
    reported.current.clear();
    const pending = checks.current;
    return () => {
      pending.forEach(timer => clearTimeout(timer));
      pending.clear();
    };
  }, [root]);

  const load = useCallback(
    async (path: string) => {
      try {
        const v = await readVersion(path);
        dispatch({ type: 'loaded', path, text: v.text, etag: v.etag, binary: v.isBinary });
      } catch {
        dispatch({ type: 'loadFailed', path });
      }
    },
    [readVersion],
  );

  const open = useCallback(
    (path: string) => {
      if (!root || reported.current.has(path)) return;
      reported.current.set(path, false);
      dispatch({ type: 'opened', path });
      postEditorEvent(root, 'editor.opened', path);
      void load(path);
    },
    [root, load],
  );

  const edit = useCallback(
    (path: string, text: string) => {
      const before = ref.current[path];
      if (!before || before.status !== 'ready' || before.text === text) return;
      dispatch({ type: 'edited', path, text });
      report(path, text !== before.base);
    },
    [report],
  );

  const conflictFrom = useCallback(
    async (path: string, reason: 'save' | 'disk', currentEtag: string) => {
      try {
        const v = await readVersion(path);
        dispatch({
          type: 'conflicted',
          path,
          conflict: { reason, currentEtag: v.etag, diskText: v.text, deleted: false },
        });
      } catch (err) {
        const deleted = err instanceof ApiError && err.status === 404;
        dispatch({
          type: 'conflicted',
          path,
          conflict: { reason, currentEtag, diskText: null, deleted },
        });
      }
    },
    [readVersion],
  );

  const write = useCallback(
    async (path: string, ifMatch: string | null): Promise<boolean> => {
      const b = ref.current[path];
      if (!root || !b || b.status !== 'ready' || b.saving) return false;
      const text = b.text;
      dispatch({ type: 'saveStarted', path });
      const result = await putFile(root, path, text, ifMatch);
      if (result.kind === 'saved') {
        dispatch({ type: 'saved', path, text, etag: result.etag });
        if (ref.current[path]?.text === text) report(path, false);
        return true;
      }
      if (result.kind === 'conflict') {
        await conflictFrom(path, 'save', result.currentEtag);
        return false;
      }
      dispatch({ type: 'saveFailed', path, message: result.message });
      return false;
    },
    [root, conflictFrom, report],
  );

  const save = useCallback((path: string) => write(path, ref.current[path]?.etag || null), [write]);

  const overwrite = useCallback(
    (path: string) => {
      const conflict = ref.current[path]?.conflict;
      return write(path, conflict?.deleted ? null : conflict?.currentEtag || null);
    },
    [write],
  );

  const reload = useCallback(
    async (path: string) => {
      try {
        const v = await readVersion(path);
        dispatch({ type: 'reloaded', path, text: v.text, etag: v.etag });
        report(path, false);
      } catch {
        dispatch({ type: 'loadFailed', path });
      }
    },
    [readVersion, report],
  );

  const close = useCallback(
    (path: string) => {
      if (!reported.current.has(path)) return;
      reported.current.delete(path);
      dispatch({ type: 'closed', path });
      if (root) postEditorEvent(root, 'editor.closed', path);
    },
    [root],
  );

  const moved = useCallback((from: string, to: string) => {
    for (const [p, dirty] of [...reported.current]) {
      if (p === from || p.startsWith(`${from}/`)) {
        reported.current.delete(p);
        reported.current.set(to + p.slice(from.length), dirty);
      }
    }
    dispatch({ type: 'moved', from, to });
  }, []);

  const handleEvent = useCallback(
    (event: WorkspaceEvent) => {
      for (const path of touchedPaths(event, Object.keys(ref.current))) {
        const existing = checks.current.get(path);
        if (existing) clearTimeout(existing);
        checks.current.set(
          path,
          setTimeout(() => {
            checks.current.delete(path);
            const b = ref.current[path];
            if (!b || b.status !== 'ready' || b.saving) return;
            void readVersion(path)
              .then(v => dispatch({ type: 'diskChanged', path, text: v.text, etag: v.etag }))
              .catch(err => {
                if (err instanceof ApiError && err.status === 404) {
                  dispatch({ type: 'diskChanged', path, text: null, etag: '' });
                }
              });
          }, 200),
        );
      }
    },
    [readVersion],
  );

  return useMemo(
    () => ({ buffers, open, edit, save, reload, overwrite, close, moved, handleEvent }),
    [buffers, open, edit, save, reload, overwrite, close, moved, handleEvent],
  );
}
