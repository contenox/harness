import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecoveryCard } from "./RecoveryCard";

describe("RecoveryCard", () => {
  it("alerts on error and uses status otherwise", () => {
    expect(renderToStaticMarkup(createElement(RecoveryCard, { title: "t" }))).toContain('role="alert"');
    expect(renderToStaticMarkup(createElement(RecoveryCard, { title: "t", tone: "info" }))).toContain('role="status"');
  });
  it("renders the details toggle only when details exist", () => {
    const without = renderToStaticMarkup(createElement(RecoveryCard, { title: "t", detailsLabel: "Details" }));
    expect(without).not.toContain("Details");
    const withDetails = renderToStaticMarkup(
      createElement(RecoveryCard, { title: "t", detailsLabel: "Details", details: "raw error" }),
    );
    expect(withDetails).toContain("Details");
    expect(withDetails).toContain("raw error");
    expect(withDetails).toContain("font-mono");
  });
});
