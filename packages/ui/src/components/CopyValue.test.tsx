import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopyValueButton } from "./CopyValue";

describe("CopyValueButton", () => {
  it("shows the label before copying", () => {
    const html = renderToStaticMarkup(
      createElement(CopyValueButton, { value: "v", label: "Kopieren", copiedLabel: "Kopiert" }),
    );
    expect(html).toContain("Kopieren");
    expect(html).not.toContain("Kopiert");
  });
});
