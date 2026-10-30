import { describe, expect, it } from 'vitest';
import { initialPaneState, paneOf, paneReducer, reduceStore } from './panes';

describe('paneReducer', () => {
  it('toggles a pane open, switches kinds, and closes on repeat', () => {
    let s = paneReducer(initialPaneState, { type: 'toggle', pane: 'terminal' });
    expect(s.pane).toBe('terminal');
    s = paneReducer(s, { type: 'toggle', pane: 'diff' });
    expect(s.pane).toBe('diff');
    s = paneReducer(s, { type: 'toggle', pane: 'diff' });
    expect(s.pane).toBeNull();
  });

  it('show is idempotent and close is a no-op when closed', () => {
    const s = paneReducer(initialPaneState, { type: 'show', pane: 'files' });
    expect(paneReducer(s, { type: 'show', pane: 'files' })).toBe(s);
    expect(paneReducer(initialPaneState, { type: 'close' })).toBe(initialPaneState);
  });

  it('opening a file switches to the files pane and focuses it without duplicates', () => {
    let s = paneReducer({ ...initialPaneState, pane: 'terminal' }, { type: 'openFile', path: 'a.ts' });
    expect(s).toEqual({ pane: 'files', files: ['a.ts'], activeFile: 'a.ts' });
    s = paneReducer(s, { type: 'openFile', path: 'b.ts' });
    s = paneReducer(s, { type: 'openFile', path: 'a.ts' });
    expect(s.files).toEqual(['a.ts', 'b.ts']);
    expect(s.activeFile).toBe('a.ts');
  });

  it('closing the active file focuses its left neighbour, keeping the pane open', () => {
    let s = paneReducer(initialPaneState, { type: 'openFile', path: 'a' });
    s = paneReducer(s, { type: 'openFile', path: 'b' });
    s = paneReducer(s, { type: 'openFile', path: 'c' });
    s = paneReducer(s, { type: 'closeFile', path: 'c' });
    expect(s.activeFile).toBe('b');
    s = paneReducer(s, { type: 'closeFile', path: 'a' });
    expect(s.activeFile).toBe('b');
    s = paneReducer(s, { type: 'closeFile', path: 'b' });
    expect(s).toMatchObject({ files: [], activeFile: null, pane: 'files' });
  });

  it('focusFile ignores unknown paths', () => {
    const s = paneReducer(initialPaneState, { type: 'openFile', path: 'a' });
    expect(paneReducer(s, { type: 'focusFile', path: 'zzz' })).toBe(s);
  });
});

describe('reduceStore', () => {
  it('keeps pane state independent per tab key', () => {
    let store = { activeKey: 'x', byKey: {} };
    store = reduceStore(store, 'x', { type: 'toggle', pane: 'terminal' });
    store = reduceStore(store, 'y', { type: 'toggle', pane: 'diff' });
    expect(paneOf(store, 'x').pane).toBe('terminal');
    expect(paneOf(store, 'y').pane).toBe('diff');
    expect(paneOf(store, 'z').pane).toBeNull();
  });

  it('returns the same store when nothing changes', () => {
    const store = { activeKey: 'x', byKey: {} };
    expect(reduceStore(store, 'x', { type: 'close' })).toBe(store);
  });
});
