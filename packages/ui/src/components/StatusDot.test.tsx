import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusDot } from "./StatusDot";

const render = (props: Parameters<typeof StatusDot>[0]) => renderToStaticMarkup(createElement(StatusDot, props));

describe("StatusDot", () => {
  it("renders the label and hides the dot from assistive tech", () => {
    const html = render({ status: "available", label: "Ready" });
    expect(html).toContain("Ready");
    expect(html).toContain('aria-hidden="true"');
  });
  it("is an image with a name when it has no label", () => {
    const html = render({ status: "unavailable", "aria-label": "Down" });
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Down"');
  });
  it("pulses only while checking and only with motion-safe", () => {
    expect(render({ status: "checking", label: "x" })).toContain("motion-safe:animate-pulse");
    expect(render({ status: "available", label: "x" })).not.toContain("pulse");
  });
});
