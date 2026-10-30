import { describe, expect, it } from "vitest";
import { rovingTarget } from "./roving";

describe("rovingTarget", () => {
  it("moves down and up, wrapping by default", () => {
    expect(rovingTarget("ArrowDown", 0, 3)).toBe(1);
    expect(rovingTarget("ArrowDown", 2, 3)).toBe(0);
    expect(rovingTarget("ArrowUp", 0, 3)).toBe(2);
    expect(rovingTarget("ArrowUp", 2, 3)).toBe(1);
  });
  it("clamps without wrap", () => {
    expect(rovingTarget("ArrowDown", 2, 3, { wrap: false })).toBe(2);
    expect(rovingTarget("ArrowUp", 0, 3, { wrap: false })).toBe(0);
  });
  it("handles Home and End", () => {
    expect(rovingTarget("Home", 2, 4)).toBe(0);
    expect(rovingTarget("End", 0, 4)).toBe(3);
    expect(rovingTarget("Home", 2, 4, { homeEnd: false })).toBeNull();
  });
  it("respects orientation", () => {
    expect(rovingTarget("ArrowRight", 0, 3, { orientation: "vertical" })).toBeNull();
    expect(rovingTarget("ArrowDown", 0, 3, { orientation: "horizontal" })).toBeNull();
    expect(rovingTarget("ArrowRight", 0, 3, { orientation: "horizontal" })).toBe(1);
  });
  it("ignores other keys and empty lists", () => {
    expect(rovingTarget("a", 0, 3)).toBeNull();
    expect(rovingTarget("ArrowDown", 0, 0)).toBeNull();
  });
});
