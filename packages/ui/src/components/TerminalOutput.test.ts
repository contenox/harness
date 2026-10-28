import { describe, expect, it } from "vitest";
import { tailLines } from "./TerminalOutput";

describe("tailLines", () => {
  it("returns the last n lines", () => {
    expect(tailLines("a\nb\nc\nd\ne", 3)).toEqual(["c", "d", "e"]);
  });
  it("ignores trailing blank lines", () => {
    expect(tailLines("a\nb\n\n\n", 2)).toEqual(["a", "b"]);
    expect(tailLines(["a", "b", ""], 5)).toEqual(["a", "b"]);
  });
  it("handles short, empty and CRLF input", () => {
    expect(tailLines("a", 4)).toEqual(["a"]);
    expect(tailLines("", 4)).toEqual([]);
    expect(tailLines("a\r\nb\r\n", 1)).toEqual(["b"]);
    expect(tailLines("a", 0)).toEqual([]);
  });
});
