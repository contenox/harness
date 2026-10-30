export type TitleBarInsets = { start: number; end: number };

export const WINDOWS_CAPTION_WIDTH = 138;
export const MAC_TRAFFIC_LIGHTS_WIDTH = 72;

type OverlayRect = { x: number; width: number };

/**
 * Space the top bar must keep free for native window controls. Web builds reserve nothing;
 * on Windows the caption-button overlay sits at the right edge (measured when the browser
 * exposes its geometry, otherwise a fixed fallback); on macOS the traffic lights sit at the left.
 */
export function computeTitleBarInsets(input: {
  platform: string | undefined;
  overlayRect?: OverlayRect | null;
  innerWidth: number;
}): TitleBarInsets {
  const { platform, overlayRect, innerWidth } = input;
  if (!platform) return { start: 0, end: 0 };
  if (platform === 'darwin') return { start: MAC_TRAFFIC_LIGHTS_WIDTH, end: 0 };
  if (platform === 'win32') {
    const measured = overlayRect ? Math.round(innerWidth - (overlayRect.x + overlayRect.width)) : 0;
    return { start: 0, end: measured > 0 ? measured : WINDOWS_CAPTION_WIDTH };
  }
  return { start: 0, end: 0 };
}
