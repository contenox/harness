import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acpSessionsReducer,
  initialAcpSessionsState,
  selectFocusedSession,
  selectOpenSessionIds,
} from '../../hooks/acpWorkspaceState';
import { createDeferredDisposer } from './AcpWorkspaceProvider';


beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createDeferredDisposer (AcpWorkspaceProvider StrictMode safety, BUG 3)', () => {
  it('disposes after the deferred delay when armed and never cancelled — the genuine-unmount case', async () => {
    const dispose = vi.fn();
    const disposer = createDeferredDisposer(dispose);

    disposer.armForCleanup();
    expect(dispose).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('never disposes if cancelled before the timer fires — the StrictMode double-invoke (mount, cleanup, mount) case', async () => {
    const dispose = vi.fn();
    const disposer = createDeferredDisposer(dispose);

    disposer.armForCleanup();
    disposer.cancelPendingDispose();

    await vi.runAllTimersAsync();
    expect(dispose).not.toHaveBeenCalled();
  });

  it('cancelPendingDispose() is a harmless no-op when nothing is armed', () => {
    const dispose = vi.fn();
    const disposer = createDeferredDisposer(dispose);

    expect(() => disposer.cancelPendingDispose()).not.toThrow();
    expect(dispose).not.toHaveBeenCalled();
  });

  it('a second armForCleanup() after a cancelled one still disposes on a genuine final unmount', async () => {
    const dispose = vi.fn();
    const disposer = createDeferredDisposer(dispose);

    disposer.armForCleanup();
    disposer.cancelPendingDispose();
    disposer.armForCleanup();

    await vi.runAllTimersAsync();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('AcpWorkspaceProvider context-value composition (multiplexing wiring)', () => {
  it('exposes the focused slice as `session` while keeping every open slice reachable', () => {
    let sessions = initialAcpSessionsState;
    const dispatch = (action: Parameters<typeof acpSessionsReducer>[1]) => {
      sessions = acpSessionsReducer(sessions, action);
    };

    dispatch({ type: 'session_dispatch', key: 'sess-a', action: { type: 'session_reset', sessionId: 'sess-a' } });
    dispatch({ type: 'session_dispatch', key: 'sess-b', action: { type: 'session_reset', sessionId: 'sess-b' } });
    dispatch({ type: 'session_dispatch', key: 'sess-a', action: { type: 'message_chunk', id: 'ma', text: 'A background' } });
    dispatch({ type: 'session_focused', key: 'sess-b' });

    expect(selectFocusedSession(sessions).sessionId).toBe('sess-b');
    expect(selectOpenSessionIds(sessions).sort()).toEqual(['sess-a', 'sess-b']);
    expect(sessions.slices['sess-a'].messages['ma']).toMatchObject({ text: 'A background' });

    dispatch({ type: 'session_focused', key: 'sess-a' });
    expect(selectFocusedSession(sessions).sessionId).toBe('sess-a');
    expect(selectFocusedSession(sessions).messages['ma']).toMatchObject({ text: 'A background' });
  });
});
