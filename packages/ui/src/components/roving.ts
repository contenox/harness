export type RovingKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End";

export type RovingOptions = {
  /** Which arrow keys move. Default "both". */
  orientation?: "vertical" | "horizontal" | "both";
  /** Wrap around at the ends. Default true. */
  wrap?: boolean;
  /** Handle Home/End. Default true. */
  homeEnd?: boolean;
};

/**
 * Index to focus after `key` from `current` within `count` items, or null when
 * the key is not a navigation key for these options.
 */
export function rovingTarget(
  key: string,
  current: number,
  count: number,
  { orientation = "both", wrap = true, homeEnd = true }: RovingOptions = {},
): number | null {
  if (count <= 0) return null;
  const vertical = orientation !== "horizontal";
  const horizontal = orientation !== "vertical";
  let delta = 0;
  if ((key === "ArrowDown" && vertical) || (key === "ArrowRight" && horizontal)) delta = 1;
  else if ((key === "ArrowUp" && vertical) || (key === "ArrowLeft" && horizontal)) delta = -1;
  else if (homeEnd && key === "Home") return 0;
  else if (homeEnd && key === "End") return count - 1;
  else return null;
  const next = current + delta;
  if (next < 0) return wrap ? count - 1 : 0;
  if (next >= count) return wrap ? 0 : count - 1;
  return next;
}
