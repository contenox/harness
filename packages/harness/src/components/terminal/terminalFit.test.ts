import { describe, expect, it, vi } from 'vitest';
import { canFitTerminal, safeFit } from './terminalFit';

const host = (w: number, h: number, connected = true) => ({
  clientWidth: w,
  clientHeight: h,
  isConnected: connected,
});

describe('canFitTerminal', () => {
  it('allows a laid-out, connected host', () => {
    expect(canFitTerminal(host(300, 200), false)).toBe(true);
  });
  it('rejects zero size, detached, missing or disposed', () => {
    expect(canFitTerminal(host(0, 200), false)).toBe(false);
    expect(canFitTerminal(host(300, 0), false)).toBe(false);
    expect(canFitTerminal(host(300, 200, false), false)).toBe(false);
    expect(canFitTerminal(null, false)).toBe(false);
    expect(canFitTerminal(host(300, 200), true)).toBe(false);
  });
});

describe('safeFit', () => {
  it('skips fit when guarded', () => {
    const fit = vi.fn();
    expect(safeFit(host(0, 0), false, fit)).toBe(false);
    expect(fit).not.toHaveBeenCalled();
  });
  it('swallows errors thrown by fit', () => {
    expect(
      safeFit(host(10, 10), false, () => {
        throw new TypeError('dimensions');
      }),
    ).toBe(false);
  });
  it('fits when allowed', () => {
    const fit = vi.fn();
    expect(safeFit(host(10, 10), false, fit)).toBe(true);
    expect(fit).toHaveBeenCalledOnce();
  });
});
