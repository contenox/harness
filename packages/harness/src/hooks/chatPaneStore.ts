import { useCallback, useSyncExternalStore } from 'react';
import { EMPTY_SESSION_KEY } from './acpWorkspaceState';
import {
  initialPaneState,
  paneOf,
  reduceStore,
  type PaneAction,
  type PaneState,
  type PaneStoreState,
} from '../pages/chat/lib/panes';

/**
 * Module-level store for the right-hand pane of each chat tab. It lives outside React because the
 * top-bar toggles render in the Layout's navbar slot, outside the chat page's component tree, yet
 * must act on whichever session tab is active.
 */
interface Shared {
  store: PaneStoreState;
  listeners: Set<() => void>;
}
// Kept on globalThis so a duplicated module instance (Vite HMR re-imports an edited dependency
// under a `?t=` URL, leaving importers on different copies) still shares one store: otherwise
// the navbar toggles and the chat page would each see their own activeKey.
const SHARED_KEY = Symbol.for('contenox.chatPaneStore');
const g = globalThis as unknown as Record<symbol, Shared | undefined>;
const shared: Shared = (g[SHARED_KEY] ??= {
  store: { activeKey: EMPTY_SESSION_KEY, byKey: {} },
  listeners: new Set(),
});
const listeners = shared.listeners;

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dispatchChatPane(key: string, action: PaneAction): void {
  const next = reduceStore(shared.store, key, action);
  if (next === shared.store) return;
  shared.store = next;
  emit();
}

export function setActiveChatPaneKey(key: string): void {
  if (shared.store.activeKey === key) return;
  shared.store = { ...shared.store, activeKey: key };
  emit();
}

export function getChatPaneStore(): PaneStoreState {
  return shared.store;
}

/** Test hook. */
export function resetChatPaneStore(): void {
  shared.store = { activeKey: EMPTY_SESSION_KEY, byKey: {} };
  emit();
}

export interface ChatPaneControls {
  state: PaneState;
  dispatch: (action: PaneAction) => void;
}

/** Pane state of one tab plus a dispatcher bound to it. */
export function useChatPane(key: string): ChatPaneControls {
  const state = useSyncExternalStore(
    subscribe,
    () => paneOf(shared.store, key),
    () => initialPaneState,
  );
  const dispatch = useCallback((action: PaneAction) => dispatchChatPane(key, action), [key]);
  return { state, dispatch };
}

/** Pane state of whichever tab is active, for the top-bar toggles. */
export function useActiveChatPane(): ChatPaneControls & { key: string } {
  const key = useSyncExternalStore(
    subscribe,
    () => shared.store.activeKey,
    () => EMPTY_SESSION_KEY,
  );
  return { key, ...useChatPane(key) };
}
