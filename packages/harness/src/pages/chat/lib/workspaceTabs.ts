
export interface WorkspaceTabsState {
  tabs: string[];
  activeId: string | null;
}

export const initialWorkspaceTabsState: WorkspaceTabsState = {
  tabs: [],
  activeId: null,
};

export type WorkspaceTabsAction =
  | { type: 'open'; id: string }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'focus_empty' }
  | { type: 'sync'; openIds: readonly string[] };

function neighborAfterRemoval(tabs: string[], index: number): string | null {
  if (tabs.length === 0) return null;
  if (index > 0) return tabs[index - 1];
  return tabs[0];
}

export function workspaceTabsReducer(state: WorkspaceTabsState, action: WorkspaceTabsAction): WorkspaceTabsState {
  switch (action.type) {
    case 'open': {
      if (state.tabs.includes(action.id)) {
        return state.activeId === action.id ? state : { ...state, activeId: action.id };
      }
      return { tabs: [...state.tabs, action.id], activeId: action.id };
    }

    case 'close': {
      const index = state.tabs.indexOf(action.id);
      if (index === -1) return state;
      const tabs = state.tabs.filter(id => id !== action.id);
      const activeId = state.activeId === action.id ? neighborAfterRemoval(tabs, index) : state.activeId;
      return { tabs, activeId };
    }

    case 'focus':
      if (!state.tabs.includes(action.id)) return state;
      return state.activeId === action.id ? state : { ...state, activeId: action.id };

    case 'focus_empty':
      return state.activeId === null ? state : { ...state, activeId: null };

    case 'sync': {
      const openSet = new Set(action.openIds);
      const kept = state.tabs.filter(id => openSet.has(id));
      const appended = action.openIds.filter(id => !state.tabs.includes(id));
      const tabs = [...kept, ...appended];
      let activeId = state.activeId;
      if (activeId !== null && !openSet.has(activeId)) {
        const oldIndex = state.tabs.indexOf(activeId);
        activeId = neighborAfterRemoval(tabs, oldIndex === -1 ? 0 : oldIndex);
      }
      const unchanged =
        tabs.length === state.tabs.length &&
        tabs.every((id, i) => id === state.tabs[i]) &&
        activeId === state.activeId;
      return unchanged ? state : { tabs, activeId };
    }

    default:
      return state;
  }
}

export function routeForActiveTab(activeId: string | null, intentionalEmpty: boolean): string | null {
  if (activeId !== null) return `/chat/${activeId}`;
  return intentionalEmpty ? '/chat' : null;
}
