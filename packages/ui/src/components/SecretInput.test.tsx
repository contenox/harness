import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SecretInput } from "./SecretInput";

const props = { showLabel: "Show", hideLabel: "Hide", storedLabel: "Key saved", replaceLabel: "Replace" };

describe("SecretInput", () => {
  it("renders a hardened password input", () => {
    const html = renderToStaticMarkup(createElement(SecretInput, { ...props, value: "", onChange: () => {} }));
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('spellCheck="false"');
    expect(html).toContain('autoCapitalize="off"');
    expect(html).toContain('aria-label="Show"');
  });
  it("in stored mode renders no input and never the value", () => {
    const html = renderToStaticMarkup(
      createElement(SecretInput, { ...props, stored: true, value: "sk-leak", onChange: () => {} }),
    );
    expect(html).not.toContain("<input");
    expect(html).not.toContain("sk-leak");
    expect(html).toContain("Key saved");
    expect(html).toContain("Replace");
  });
});
