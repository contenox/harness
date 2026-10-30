import { describe, expect, it } from 'vitest';
import { computeTitleBarInsets, WINDOWS_CAPTION_WIDTH } from './titleBarInsets';

describe('computeTitleBarInsets', () => {
  it('reserves nothing in the browser', () => {
    expect(computeTitleBarInsets({ platform: undefined, innerWidth: 1000 })).toEqual({ start: 0, end: 0 });
  });
  it('uses the fallback caption width on Windows without geometry', () => {
    expect(computeTitleBarInsets({ platform: 'win32', innerWidth: 1000 }).end).toBe(WINDOWS_CAPTION_WIDTH);
  });
  it('measures the overlay on Windows when available', () => {
    expect(
      computeTitleBarInsets({ platform: 'win32', overlayRect: { x: 0, width: 860 }, innerWidth: 1000 }).end,
    ).toBe(140);
  });
  it('reserves traffic lights on macOS', () => {
    expect(computeTitleBarInsets({ platform: 'darwin', innerWidth: 1000 }).start).toBeGreaterThan(0);
  });
});
