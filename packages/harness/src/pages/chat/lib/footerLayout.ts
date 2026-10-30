import type { SessionConfigOption } from '@contenox/acp-client';
import type { ComposerChipOptions } from './composerChips';

/** Footer widths (px) under which the footer degrades. */
const FOOTER_COMPACT_USAGE_BELOW = 620;
export const FOOTER_ATTACH_MENU_BELOW = 480;
const FOOTER_CHIPS_TO_OVERFLOW_BELOW = 360;

/**
 * Which footer pieces collapse at a measured width. `null` (not measured yet, or no ResizeObserver)
 * means the wide layout: model and mode stay chips, only `options.rest` is behind the "…" menu.
 */
export function footerEndLayout(
  width: number | null,
  options: ComposerChipOptions,
): { compactUsage: boolean; chipsInOverflow: boolean; overflowOptions: SessionConfigOption[] } {
  const chipsInOverflow = width !== null && width > 0 && width < FOOTER_CHIPS_TO_OVERFLOW_BELOW;
  return {
    compactUsage: width !== null && width > 0 && width < FOOTER_COMPACT_USAGE_BELOW,
    chipsInOverflow,
    overflowOptions: chipsInOverflow
      ? [options.mode, options.model, ...options.rest].filter((o): o is SessionConfigOption => o != null)
      : options.rest,
  };
}
