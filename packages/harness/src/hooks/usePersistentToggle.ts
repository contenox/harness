import { useCallback, useSyncExternalStore } from 'react';

export interface ToggleStore {
  getSnapshot: () => boolean;
  subscribe: (listener: () => void) => () => void;
  set: (value: boolean) => void;
  toggle: () => void;
}

const stores = new Map<string, ToggleStore>();

function readPersisted(key: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key) === '1';
  } catch {
  }
  return false;
}

function writePersisted(key: string, value: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value ? '1' : '0');
  } catch {
  }
}

export function toggleStore(key: string): ToggleStore {
  const existing = stores.get(key);
  if (existing) return existing;

  const listeners = new Set<() => void>();
  let value = readPersisted(key);

  const store: ToggleStore = {
    getSnapshot: () => value,
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: next => {
      if (next === value) return;
      value = next;
      writePersisted(key, next);
      listeners.forEach(listener => listener());
    },
    toggle: () => store.set(!value),
  };
  stores.set(key, store);
  return store;
}

export interface PersistentToggle {
  open: boolean;
  toggle: () => void;
  set: (value: boolean) => void;
}

export function usePersistentToggle(key: string): PersistentToggle {
  const store = toggleStore(key);
  const open = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const toggle = useCallback(() => store.toggle(), [store]);
  const set = useCallback((value: boolean) => store.set(value), [store]);
  return { open, toggle, set };
}
