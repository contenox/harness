import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearBrowserHandoff } from './useBrowserHandoff';

afterEach(() => vi.unstubAllGlobals());

describe('clearBrowserHandoff', () => {
  it('removes the remembered code so the next attempt reopens the browser', () => {
    const removeItem = vi.fn();
    vi.stubGlobal('sessionStorage', { removeItem });
    clearBrowserHandoff();
    expect(removeItem).toHaveBeenCalledWith('contenox_signin_handed_off_code');
  });

  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('sessionStorage', {
      removeItem: () => {
        throw new Error('denied');
      },
    });
    expect(() => clearBrowserHandoff()).not.toThrow();
  });
});
