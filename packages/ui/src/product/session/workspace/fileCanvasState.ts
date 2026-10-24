import { useCallback, useReducer } from 'react';
import { isWithin } from '../lib/workspaceTree';
import { basename } from '../../../components/editors/fileLanguage';
import { previewKind } from '../../../components/editors/previewKind';

export interface CanvasFileTab {
  path: string;
  name: string;
  state: 'loading' | 'loaded' | 'error';
  content: string;
  error?: string;
}

export interface CanvasState {
  panelOpen: boolean;
  tabs: CanvasFileTab[];
  activePath: string;
}

export type CanvasAction =
  | { type: 'panel_toggle' }
  | { type: 'open'; path: string }
  | { type: 'content'; path: string; content: string }
  | { type: 'error'; path: string; error: string }
  | { type: 'activate'; path: string }
  | { type: 'close'; path: string }
  | { type: 'close_within'; path: string };

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'panel_toggle':
      return { ...state, panelOpen: !state.panelOpen };
    case 'open': {
      if (state.tabs.some(t => t.path === action.path)) {
        return { ...state, activePath: action.path, panelOpen: true };
      }
      return {
        ...state,
        panelOpen: true,
        activePath: action.path,
        tabs: [
          ...state.tabs,
          { path: action.path, name: basename(action.path), state: 'loading', content: '' },
        ],
      };
    }
    case 'content':
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.path === action.path ? { ...t, state: 'loaded' as const, content: action.content } : t,
        ),
      };
    case 'error':
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.path === action.path ? { ...t, state: 'error' as const, error: action.error } : t,
        ),
      };
    case 'activate': {
      if (action.path === '' || state.tabs.some(t => t.path === action.path)) {
        return { ...state, activePath: action.path };
      }
      return state;
    }
    case 'close': {
      const tabs = state.tabs.filter(t => t.path !== action.path);
      let activePath = state.activePath;
      if (state.activePath === action.path) {
        const idx = state.tabs.findIndex(t => t.path === action.path);
        const neighbour = tabs[idx] ?? tabs[tabs.length - 1];
        activePath = neighbour ? neighbour.path : '';
      }
      return { ...state, tabs, activePath };
    }
    case 'close_within': {
      const tabs = state.tabs.filter(t => !isWithin(action.path, t.path));
      if (tabs.length === state.tabs.length) return state;
      const activePath = tabs.some(t => t.path === state.activePath)
        ? state.activePath
        : state.activePath === ''
          ? ''
          : (tabs[tabs.length - 1]?.path ?? '');
      return { ...state, tabs, activePath };
    }
  }
}

export function initialCanvasState(): CanvasState {
  return { panelOpen: false, tabs: [], activePath: '' };
}

export interface UseFileCanvasOptions {
  readFile: (path: string) => Promise<{ content: string; isDir: boolean }>;
  readFileRaw: (path: string) => Promise<{ content: string; isDir: boolean }>;
}

export interface UseFileCanvasResult {
  state: CanvasState;
  togglePanel: () => void;
  updateFileContent: (path: string, content: string) => void;
  openFile: (path: string) => void;
  reloadFile: (path: string) => void;
  closePathsWithin: (path: string) => void;
  activate: (path: string) => void;
  closeFile: (path: string) => void;
}

export function activeFileTab(state: CanvasState): CanvasFileTab | null {
  if (state.activePath === '') return null;
  return state.tabs.find(t => t.path === state.activePath) ?? null;
}

export function useFileCanvas({
  readFile,
  readFileRaw,
}: UseFileCanvasOptions): UseFileCanvasResult {
  const [state, dispatch] = useReducer(canvasReducer, undefined, initialCanvasState);

  const openFile = useCallback(
    (path: string) => {
      dispatch({ type: 'open', path });
      const loader = previewKind(path) === 'code' ? readFile : readFileRaw;
      void loader(path)
        .then(r => dispatch({ type: 'content', path, content: r.content }))
        .catch(err => {
          dispatch({
            type: 'error',
            path,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    },
    [readFile, readFileRaw],
  );

  const reloadFile = useCallback(
    (path: string) => {
      const loader = previewKind(path) === 'code' ? readFile : readFileRaw;
      void loader(path)
        .then(r => dispatch({ type: 'content', path, content: r.content }))
        .catch(err => {
          dispatch({
            type: 'error',
            path,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    },
    [readFile, readFileRaw],
  );

  return {
    state,
    togglePanel: useCallback(() => dispatch({ type: 'panel_toggle' }), []),
    updateFileContent: useCallback(
      (path: string, content: string) => dispatch({ type: 'content', path, content }),
      [],
    ),
    openFile,
    reloadFile,
    closePathsWithin: useCallback((path: string) => dispatch({ type: 'close_within', path }), []),
    activate: useCallback((path: string) => dispatch({ type: 'activate', path }), []),
    closeFile: useCallback((path: string) => dispatch({ type: 'close', path }), []),
  };
}
