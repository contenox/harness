import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsGroup, SettingsRow } from "./SettingsGroup";

const render = (el: ReactElement) => renderToStaticMarkup(el);

describe("SettingsRow", () => {
  it("renders a header button wired to its body", () => {
    const html = render(
      createElement(SettingsGroup, {
        title: "Group",
        children: createElement(SettingsRow, { title: "Row", expanded: true }, "body"),
      }),
    );
    expect(html).toMatch(/<button[^>]*aria-expanded="true"/);
    const controls = /aria-controls="([^"]+)"/.exec(html)![1];
    expect(html).toContain(`id="${controls}"`);
    expect(html).toContain("Group");
  });
  it("is collapsed and inert by default", () => {
    const html = render(createElement(SettingsRow, { title: "Row" }, "body"));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/inert/);
  });
  it("is not expandable without a body", () => {
    const html = render(createElement(SettingsRow, { title: "Row", trailing: "Ready" }));
    expect(html).not.toContain("<button");
    expect(html).not.toContain("aria-expanded");
    expect(html).toContain("Ready");
  });
  it("disables the header when disabled", () => {
    const html = render(createElement(SettingsRow, { title: "Row", disabled: true }, "body"));
    expect(html).toMatch(/<button[^>]*disabled/);
  });
});
