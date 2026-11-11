export interface EditorConflict {
  reason: 'save' | 'disk';
  currentEtag: string;
  diskText: string | null;
  deleted: boolean;
}

export interface EditorBuffer {
  path: string;
  status: 'loading' | 'ready' | 'binary' | 'error';
  base: string;
  etag: string;
  text: string;
  saving: boolean;
  saveError: string | null;
  conflict: EditorConflict | null;
  reloads: number;
}

export type EditorBuffers = Record<string, EditorBuffer>;

export type BufferAction =
  | { type: 'opened'; path: string }
  | { type: 'loaded'; path: string; text: string; etag: string; binary: boolean }
  | { type: 'loadFailed'; path: string }
  | { type: 'edited'; path: string; text: string }
  | { type: 'saveStarted'; path: string }
  | { type: 'saved'; path: string; text: string; etag: string }
  | { type: 'saveFailed'; path: string; message: string }
  | { type: 'conflicted'; path: string; conflict: EditorConflict }
  | { type: 'diskChanged'; path: string; text: string | null; etag: string }
  | { type: 'reloaded'; path: string; text: string; etag: string }
  | { type: 'closed'; path: string }
  | { type: 'moved'; from: string; to: string }
  | { type: 'reset' };

export function isDirty(buffer: EditorBuffer | undefined): boolean {
  return !!buffer && buffer.status === 'ready' && buffer.text !== buffer.base;
}

function update(
  state: EditorBuffers,
  path: string,
  fn: (b: EditorBuffer) => EditorBuffer,
): EditorBuffers {
  const current = state[path];
  if (!current) return state;
  const next = fn(current);
  return next === current ? state : { ...state, [path]: next };
}

export function buffersReducer(state: EditorBuffers, action: BufferAction): EditorBuffers {
  switch (action.type) {
    case 'reset':
      return {};
    case 'opened':
      if (state[action.path]) return state;
      return {
        ...state,
        [action.path]: {
          path: action.path,
          status: 'loading',
          base: '',
          etag: '',
          text: '',
          saving: false,
          saveError: null,
          conflict: null,
          reloads: 0,
        },
      };
    case 'loaded':
      return update(state, action.path, b => ({
        ...b,
        status: action.binary ? 'binary' : 'ready',
        base: action.text,
        text: action.text,
        etag: action.etag,
        conflict: null,
      }));
    case 'loadFailed':
      return update(state, action.path, b => ({ ...b, status: 'error' }));
    case 'edited':
      return update(state, action.path, b =>
        b.status === 'ready' ? { ...b, text: action.text, saveError: null } : b,
      );
    case 'saveStarted':
      return update(state, action.path, b => ({ ...b, saving: true, saveError: null }));
    case 'saved':
      return update(state, action.path, b => ({
        ...b,
        saving: false,
        base: action.text,
        etag: action.etag,
        conflict: null,
      }));
    case 'saveFailed':
      return update(state, action.path, b => ({ ...b, saving: false, saveError: action.message }));
    case 'conflicted':
      return update(state, action.path, b => ({ ...b, saving: false, conflict: action.conflict }));
    case 'diskChanged':
      return update(state, action.path, b => {
        if (b.status !== 'ready' || action.etag === b.etag) return b;
        if (action.text === null) {
          return {
            ...b,
            conflict: { reason: 'disk', currentEtag: '', diskText: null, deleted: true },
          };
        }
        if (!isDirty(b)) {
          return { ...b, base: action.text, text: action.text, etag: action.etag, conflict: null };
        }
        if (action.text === b.text) {
          return { ...b, base: action.text, etag: action.etag, conflict: null };
        }
        return {
          ...b,
          conflict: {
            reason: 'disk',
            currentEtag: action.etag,
            diskText: action.text,
            deleted: false,
          },
        };
      });
    case 'reloaded':
      return update(state, action.path, b => ({
        ...b,
        status: 'ready',
        base: action.text,
        text: action.text,
        etag: action.etag,
        conflict: null,
        saveError: null,
        reloads: b.reloads + 1,
      }));
    case 'closed': {
      if (!state[action.path]) return state;
      const next = { ...state };
      delete next[action.path];
      return next;
    }
    case 'moved': {
      const moving = Object.keys(state).filter(
        p => p === action.from || p.startsWith(`${action.from}/`),
      );
      if (moving.length === 0) return state;
      const next = { ...state };
      for (const p of moving) {
        const to = action.to + p.slice(action.from.length);
        next[to] = { ...state[p], path: to };
        delete next[p];
      }
      return next;
    }
  }
}

export function touchedPaths(
  event: { type: string; subject: string; data?: Record<string, unknown> },
  open: readonly string[],
): string[] {
  const hits = new Set<string>();
  const consider = (p: string | null) => {
    if (!p) return;
    for (const o of open) {
      if (o === p || o.startsWith(`${p}/`)) hits.add(o);
    }
  };
  switch (event.type) {
    case 'fs.created':
    case 'fs.modified':
    case 'fs.deleted':
    case 'tool.wrote':
      consider(event.subject);
      break;
    case 'fs.moved':
      consider(typeof event.data?.from === 'string' ? event.data.from : null);
      consider(event.subject);
      break;
    case 'fs.rescan':
      open.forEach(o => hits.add(o));
      break;
  }
  return [...hits];
}
