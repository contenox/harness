import { describe, expect, it, vi } from 'vitest';
import { cancelLoginAttempt, deriveLoginView } from './loginFlow';

describe('deriveLoginView', () => {
  it('prefers the polled status over the start response and the fallback', () => {
    const v = deriveLoginView(
      { provider: 'openai-codex', state: 'login_pending', url: 'https://a', code: 'AAAA' },
      { provider: 'openai-codex', state: 'login_pending', url: 'https://b', code: 'BBBB' },
      'login_required',
    );
    expect(v).toMatchObject({ pending: true, deviceUrl: 'https://a', deviceCode: 'AAAA' });
  });

  it('uses the start response until the first poll lands', () => {
    const v = deriveLoginView(
      undefined,
      { provider: 'p', state: 'login_pending', url: 'https://b', code: 'BBBB' },
      'login_required',
    );
    expect(v).toMatchObject({ pending: true, deviceCode: 'BBBB' });
  });

  it('falls back to the known auth state and hides the code once not pending', () => {
    expect(deriveLoginView(undefined, undefined, 'authenticated')).toMatchObject({
      signedIn: true,
      pending: false,
      deviceCode: undefined,
    });
    const v = deriveLoginView(
      { provider: 'p', state: 'login_required', code: 'OLD', url: 'https://x' },
      undefined,
      'authenticated',
    );
    expect(v).toMatchObject({ signedIn: false, pending: false, deviceCode: undefined });
  });
});

describe('cancelLoginAttempt', () => {
  it('cancels, then resets the start mutation and clears the handoff', async () => {
    const order: string[] = [];
    await cancelLoginAttempt({
      cancel: vi.fn(async () => {
        order.push('cancel');
      }),
      resetStart: () => order.push('reset'),
      clearHandoff: () => order.push('clear'),
    });
    expect(order).toEqual(['cancel', 'reset', 'clear']);
  });

  it('cleans up even when the runtime cancel fails', async () => {
    const resetStart = vi.fn();
    const clearHandoff = vi.fn();
    await expect(
      cancelLoginAttempt({
        cancel: async () => {
          throw new Error('offline');
        },
        resetStart,
        clearHandoff,
      }),
    ).rejects.toThrow('offline');
    expect(resetStart).toHaveBeenCalledOnce();
    expect(clearHandoff).toHaveBeenCalledOnce();
  });
});
