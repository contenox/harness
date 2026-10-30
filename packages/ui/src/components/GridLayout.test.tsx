import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GridLayout } from "./GridLayout";

const render = (props: Omit<ComponentProps<typeof GridLayout>, "children">) =>
  renderToStaticMarkup(createElement(GridLayout, props, "x"));

describe("GridLayout", () => {
  it("is a container-query context", () => {
    expect(render({})).toContain("@container");
  });
  it("uses container variants for responsive columns, never viewport ones", () => {
    const html = render({ responsive: { base: 1, sm: 2, md: 3 } });
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("@xl:grid-cols-2");
    expect(html).toContain("@3xl:grid-cols-3");
    expect(html).not.toMatch(/[ "]sm:grid|[ "]md:grid/);
  });
  it("collapses a fixed column count with the container", () => {
    const html = render({ columns: 4 });
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("@xl:grid-cols-2");
    expect(html).toContain("@3xl:grid-cols-4");
  });
  it("keeps auto-fit minmax by default", () => {
    expect(render({})).toContain("repeat(auto-fit, minmax(min(400px, 100%), 1fr))");
  });
});
