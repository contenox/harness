import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RadioCardGroup } from "./RadioCard";

const options = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "c", label: "C" },
];
const tabIndexes = (html: string) => [...html.matchAll(/tabindex="(-?\d)"/g)].map((m) => m[1]);
const render = (value: string) =>
  renderToStaticMarkup(
    createElement(RadioCardGroup<string>, { options, value, onChange: () => {}, "aria-label": "x" }),
  );

describe("RadioCardGroup roving tabindex", () => {
  it("makes only the selected option a tab stop", () => {
    expect(tabIndexes(render("b"))).toEqual(["-1", "0", "-1"]);
  });
  it("falls back to the first option when nothing matches", () => {
    expect(tabIndexes(render("zzz"))).toEqual(["0", "-1", "-1"]);
  });
});
