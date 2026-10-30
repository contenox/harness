import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OneTimeCode } from "./OneTimeCode";

const base = { value: "PLGQ-T2YJJ", copyLabel: "Copy", copiedLabel: "Copied" };

describe("OneTimeCode copy state", () => {
  it("shows the copy label initially", () => {
    const html = renderToStaticMarkup(createElement(OneTimeCode, base));
    expect(html).toContain("PLGQ-T2YJJ");
    expect(html).toContain(">Copy<");
    expect(html).not.toContain("Copied");
  });
  it("starts in the copied state when asked", () => {
    const html = renderToStaticMarkup(createElement(OneTimeCode, { ...base, copied: true }));
    expect(html).toContain(">Copied<");
    expect(html).not.toContain(">Copy<");
  });
});
