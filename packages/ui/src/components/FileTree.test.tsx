import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FileTree, type FileTreeNode } from "./FileTree";

const nodes: FileTreeNode[] = [
  {
    id: "src",
    name: "src",
    isDirectory: true,
    children: [
      {
        id: "src/lib",
        name: "lib",
        isDirectory: true,
        children: [{ id: "src/lib/new.ts", name: "new.ts" }],
      },
    ],
  },
  { id: "docs", name: "docs", isDirectory: true, children: [{ id: "docs/a.md", name: "a.md" }] },
];

describe("FileTree", () => {
  it("keeps folders closed when nothing is revealed", () => {
    const html = renderToStaticMarkup(
      createElement(FileTree, { nodes, defaultExpanded: new Set<string>() }),
    );
    expect(html).not.toContain("new.ts");
  });

  it("opens exactly the folders it is given when expansion is controlled", () => {
    const html = renderToStaticMarkup(
      createElement(FileTree, { nodes, expandedIds: new Set(["src", "src/lib"]) }),
    );
    expect(html).toContain("new.ts");
    expect(html).not.toContain("a.md");
  });

  it("ignores defaultExpanded when expansion is controlled", () => {
    const html = renderToStaticMarkup(
      createElement(FileTree, {
        nodes,
        defaultExpanded: new Set(["docs"]),
        expandedIds: new Set<string>(),
      }),
    );
    expect(html).not.toContain("a.md");
  });
});
