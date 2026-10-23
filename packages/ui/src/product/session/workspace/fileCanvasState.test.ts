import { describe, expect, it } from 'vitest';
import { canvasReducer, initialCanvasState } from './fileCanvasState';

describe('canvasReducer', () => {
  it('opens a file as a loading tab and activates it', () => {
    let s = initialCanvasState();
    s = canvasReducer(s, { type: 'open', path: 'src/main.ts' });
    expect(s.activePath).toBe('src/main.ts');
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0]).toMatchObject({ path: 'src/main.ts', name: 'main.ts', state: 'loading' });
  });

  it('does not duplicate an open tab, but still activates it', () => {
    let s = initialCanvasState();
    s = canvasReducer(s, { type: 'open', path: 'a.ts' });
    s = canvasReducer(s, { type: 'content', path: 'a.ts', content: 'x' });
    s = canvasReducer(s, { type: 'activate', path: '' });
    s = canvasReducer(s, { type: 'open', path: 'a.ts' });
    expect(s.tabs).toHaveLength(1);
    expect(s.activePath).toBe('a.ts');
    expect(s.panelOpen).toBe(true);
  });

  it('stores content and errors per path', () => {
    let s = initialCanvasState();
    s = canvasReducer(s, { type: 'open', path: 'a.ts' });
    s = canvasReducer(s, { type: 'content', path: 'a.ts', content: 'code' });
    expect(s.tabs[0]).toMatchObject({ state: 'loaded', content: 'code' });
    s = canvasReducer(s, { type: 'open', path: 'b.ts' });
    s = canvasReducer(s, { type: 'error', path: 'b.ts', error: 'boom' });
    expect(s.tabs[1]).toMatchObject({ state: 'error', error: 'boom' });
  });

  it('closing the active tab activates its neighbour, or returns to chat', () => {
    let s = initialCanvasState();
    s = canvasReducer(s, { type: 'open', path: 'a.ts' });
    s = canvasReducer(s, { type: 'content', path: 'a.ts', content: '' });
    s = canvasReducer(s, { type: 'open', path: 'b.ts' });
    s = canvasReducer(s, { type: 'activate', path: 'a.ts' });
    s = canvasReducer(s, { type: 'close', path: 'a.ts' });
    expect(s.activePath).toBe('b.ts');
    s = canvasReducer(s, { type: 'close', path: 'b.ts' });
    expect(s.activePath).toBe('');
  });
});
