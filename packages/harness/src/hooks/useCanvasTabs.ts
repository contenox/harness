import { useCallback, useReducer } from 'react';
import {
  canvasTabsReducer,
  initialCanvasTabsState,
  type CanvasTab,
} from '../pages/chat/lib/canvasTabs';

export interface UseCanvasTabsResult {
  tabs: CanvasTab[];
  activeId: string | null;
  open: (tab: CanvasTab) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
}

export function useCanvasTabs(): UseCanvasTabsResult {
  const [state, dispatch] = useReducer(canvasTabsReducer, initialCanvasTabsState);

  const open = useCallback((tab: CanvasTab) => dispatch({ type: 'open', tab }), []);
  const close = useCallback((id: string) => dispatch({ type: 'close', id }), []);
  const focus = useCallback((id: string) => dispatch({ type: 'focus', id }), []);

  return { tabs: state.tabs, activeId: state.activeId, open, close, focus };
}
