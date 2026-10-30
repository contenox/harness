export type PaneKind = 'terminal' | 'files' | 'diff';

export interface PaneState {
  /** Which pane is showing in the right-hand region; null = region closed. */
  pane: PaneKind | null;
  /** Files opened in the Dateien pane, in open order. */
  files: string[];
  activeFile: string | null;
}

export const initialPaneState: PaneState = { pane: null, files: [], activeFile: null };

export type PaneAction =
  | { type: 'toggle'; pane: PaneKind }
  | { type: 'show'; pane: PaneKind }
  | { type: 'close' }
  | { type: 'openFile'; path: string }
  | { type: 'closeFile'; path: string }
  | { type: 'focusFile'; path: string };

export function paneReducer(state: PaneState, action: PaneAction): PaneState {
  switch (action.type) {
    case 'toggle':
      return { ...state, pane: state.pane === action.pane ? null : action.pane };
    case 'show':
      return state.pane === action.pane ? state : { ...state, pane: action.pane };
    case 'close':
      return state.pane === null ? state : { ...state, pane: null };
    case 'openFile': {
      const files = state.files.includes(action.path) ? state.files : [...state.files, action.path];
      return { pane: 'files', files, activeFile: action.path };
    }
    case 'closeFile': {
      const index = state.files.indexOf(action.path);
      if (index === -1) return state;
      const files = state.files.filter(p => p !== action.path);
      const activeFile =
        state.activeFile === action.path ? (files[Math.max(0, index - 1)] ?? null) : state.activeFile;
      return { ...state, files, activeFile };
    }
    case 'focusFile':
      if (!state.files.includes(action.path) || state.activeFile === action.path) return state;
      return { ...state, activeFile: action.path };
    default:
      return state;
  }
}

/** Per-tab pane states plus which tab the top-bar toggles act on. */
export interface PaneStoreState {
  activeKey: string;
  byKey: Readonly<Record<string, PaneState>>;
}

export function paneOf(store: PaneStoreState, key: string): PaneState {
  return store.byKey[key] ?? initialPaneState;
}

export function reduceStore(store: PaneStoreState, key: string, action: PaneAction): PaneStoreState {
  const current = paneOf(store, key);
  const next = paneReducer(current, action);
  if (next === current) return store;
  return { ...store, byKey: { ...store.byKey, [key]: next } };
}
