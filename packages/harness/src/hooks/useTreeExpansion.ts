import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  dirsToLoad,
  expandedForEvent,
  movedUnder,
  withOpen,
  withoutUnder,
  type Expanded,
} from '../lib/treeExpansion';
import type { WorkspaceEvent } from '../lib/workspaceEvents';
import type { DirCache } from '../pages/chat/lib/workspaceTree';

export interface TreeExpansionApi {
  expanded: Expanded;
  setExpanded: (dir: string, open: boolean) => void;
  reveal: (dirs: readonly string[]) => void;
  moved: (from: string, to: string) => void;
  deleted: (path: string) => void;
  handleEvent: (event: WorkspaceEvent) => void;
}

const NONE: Expanded = new Set();

export function useTreeExpansion(
  root: string | null,
  cache: DirCache,
  ensureLoaded: (dir: string) => void,
): TreeExpansionApi {
  const [state, setState] = useState<{ root: string | null; dirs: Expanded }>({
    root,
    dirs: NONE,
  });
  const expanded = state.root === root ? state.dirs : NONE;

  const update = useCallback(
    (change: (dirs: Expanded) => Expanded) =>
      setState(prev => {
        const current = prev.root === root ? prev.dirs : NONE;
        const next = change(current);
        return next === current && prev.root === root ? prev : { root, dirs: next };
      }),
    [root],
  );

  useEffect(() => {
    for (const dir of dirsToLoad(expanded, cache)) ensureLoaded(dir);
  }, [expanded, cache, ensureLoaded]);

  const setExpanded = useCallback(
    (dir: string, open: boolean) => update(dirs => withOpen(dirs, [dir], open)),
    [update],
  );
  const reveal = useCallback(
    (dirs: readonly string[]) => update(current => withOpen(current, dirs, true)),
    [update],
  );
  const moved = useCallback(
    (from: string, to: string) => update(dirs => movedUnder(dirs, from, to)),
    [update],
  );
  const deleted = useCallback((path: string) => update(dirs => withoutUnder(dirs, path)), [update]);
  const handleEvent = useCallback(
    (event: WorkspaceEvent) => update(dirs => expandedForEvent(dirs, event)),
    [update],
  );

  return useMemo(
    () => ({ expanded, setExpanded, reveal, moved, deleted, handleEvent }),
    [expanded, setExpanded, reveal, moved, deleted, handleEvent],
  );
}
