import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToolCallCard } from "./ToolCallCard";

describe("ToolCallCard preview", () => {
  it("renders the preview when collapsed", () => {
    const html = renderToStaticMarkup(
      createElement(ToolCallCard, { tool: "execute", title: "t", detail: "d", preview: "tail-line" }),
    );
    expect(html).toContain("tail-line");
    expect(html).toContain('data-testid="tool-call-preview"');
  });
  it("renders nothing extra without a preview", () => {
    const html = renderToStaticMarkup(createElement(ToolCallCard, { tool: "execute", title: "t", detail: "d" }));
    expect(html).not.toContain("tool-call-preview");
  });
});
