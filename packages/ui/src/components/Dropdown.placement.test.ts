import { describe, expect, it } from "vitest";
import { computePanelPlacement } from "./Dropdown";

const viewport = { width: 800, height: 600 };
const panel = { width: 200, height: 150 };

describe("computePanelPlacement", () => {
  it("opens below and start-aligned by default", () => {
    const p = computePanelPlacement({ anchor: { top: 100, bottom: 130, left: 50, right: 150 }, panel, viewport, side: "bottom", align: "start" });
    expect(p).toMatchObject({ side: "bottom", left: 50, top: 136 });
  });
  it("flips up when there is no room below", () => {
    const p = computePanelPlacement({ anchor: { top: 560, bottom: 590, left: 50, right: 150 }, panel, viewport, side: "bottom", align: "start" });
    expect(p.side).toBe("top");
    expect(p.top + panel.height).toBeLessThanOrEqual(560);
  });
  it("end-aligns and clamps horizontally", () => {
    const p = computePanelPlacement({ anchor: { top: 100, bottom: 130, left: 10, right: 60 }, panel, viewport, side: "bottom", align: "end" });
    expect(p.left).toBe(8);
  });
});
