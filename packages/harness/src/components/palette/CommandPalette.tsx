import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadFrecency, recordUsage, saveFrecency, type FrecencyStore } from '../../lib/palette/frecency';
import {
  computeResults,
  createPaletteSearcher,
  INITIAL_PALETTE_STATE,
  paletteReducer,
} from '../../lib/palette/paletteState';
import type { PaletteItem } from '../../lib/palette/types';
import { PaletteOverlay } from './PaletteOverlay';
import { usePaletteSources } from './usePaletteSources';

export function CommandPalette() {
  const [state, dispatch] = useReducer(paletteReducer, INITIAL_PALETTE_STATE);
  const [frecency, setFrecency] = useState<FrecencyStore>(() => loadFrecency());

  const items = usePaletteSources(state.open);
  const searcher = useMemo(() => createPaletteSearcher(items), [items]);
  const results = useMemo(
    () => computeResults(searcher, items, state.query, frecency, Date.now()),
    [searcher, items, state.query, frecency],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k' && !e.isComposing) {
        e.preventDefault();
        dispatch({ type: 'toggle' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [state.open]);

  const execute = useCallback(
    (item: PaletteItem) => {
      const next = recordUsage(frecency, item.id, Date.now());
      setFrecency(next);
      saveFrecency(next);
      dispatch({ type: 'close' });
      item.action();
    },
    [frecency],
  );

  const onEnter = useCallback(() => {
    const item = results[state.selected]?.item;
    if (item) execute(item);
  }, [results, state.selected, execute]);

  if (!state.open) return null;

  return createPortal(
    <PaletteOverlay
      query={state.query}
      results={results}
      selected={state.selected}
      onQueryChange={query => dispatch({ type: 'setQuery', query })}
      onArrow={delta => dispatch({ type: 'move', delta, count: results.length })}
      onEnter={onEnter}
      onEscape={() => dispatch({ type: 'close' })}
      onHover={index => dispatch({ type: 'setSelected', index, count: results.length })}
      onExecute={execute}
      onClose={() => dispatch({ type: 'close' })}
    />,
    document.body,
  );
}
