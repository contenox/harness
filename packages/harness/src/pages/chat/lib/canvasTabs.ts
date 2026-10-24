
export type CanvasTabKind = 'terminal' | 'file';

export interface CanvasTab {
  id: string;
  kind: CanvasTabKind;
  path?: string;
  title?: string;
}

export interface CanvasTabsState {
  tabs: CanvasTab[];
  activeId: string | null;
}

export const initialCanvasTabsState: CanvasTabsState = {
  tabs: [],
  activeId: null,
};

export type CanvasTabsAction =
  | { type: 'open'; tab: CanvasTab }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string };

function neighborAfterRemoval(tabs: CanvasTab[], index: number): string | null {
  if (tabs.length === 0) return null;
  if (index > 0) return tabs[index - 1].id;
  return tabs[0].id;
}

export function canvasTabsReducer(state: CanvasTabsState, action: CanvasTabsAction): CanvasTabsState {
  switch (action.type) {
    case 'open': {
      if (state.tabs.some(tab => tab.id === action.tab.id)) {
        return state.activeId === action.tab.id ? state : { ...state, activeId: action.tab.id };
      }
      return { tabs: [...state.tabs, action.tab], activeId: action.tab.id };
    }

    case 'close': {
      const index = state.tabs.findIndex(tab => tab.id === action.id);
      if (index === -1) return state;
      const tabs = state.tabs.filter(tab => tab.id !== action.id);
      const activeId = state.activeId === action.id ? neighborAfterRemoval(tabs, index) : state.activeId;
      return { tabs, activeId };
    }

    case 'focus':
      if (!state.tabs.some(tab => tab.id === action.id)) return state;
      return state.activeId === action.id ? state : { ...state, activeId: action.id };

    default:
      return state;
  }
}

export const TERMINAL_CANVAS_TAB: CanvasTab = { id: 'terminal', kind: 'terminal' };

export const FILE_CANVAS_TAB_PREFIX = 'file:';

export function fileCanvasTab(path: string): CanvasTab {
  const name = path.split('/').filter(Boolean).pop() ?? path;
  return { id: `${FILE_CANVAS_TAB_PREFIX}${path}`, kind: 'file', path, title: name };
}
