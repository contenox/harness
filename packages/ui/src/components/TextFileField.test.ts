import { describe, expect, it } from "vitest";
import { checkTextFile } from "./TextFileField";

const labels = { tooLarge: "too large", invalidJson: "bad json" };

describe("checkTextFile", () => {
  it("accepts empty text", () => {
    expect(checkTextFile("", { labels, requireJson: true })).toBeNull();
  });
  it("accepts valid JSON", () => {
    expect(checkTextFile('{"a":1}', { labels, requireJson: true })).toBeNull();
  });
  it("rejects invalid JSON only when JSON is required", () => {
    expect(checkTextFile("{nope", { labels, requireJson: true })).toBe("bad json");
    expect(checkTextFile("{nope", { labels, requireJson: false })).toBeNull();
  });
  it("enforces the byte limit using UTF-8 length", () => {
    expect(checkTextFile("12345", { labels, maxBytes: 4 })).toBe("too large");
    expect(checkTextFile("12345", { labels, maxBytes: 5 })).toBeNull();
    // 3 characters but 6 bytes
    expect(checkTextFile("äöü", { labels, maxBytes: 5 })).toBe("too large");
  });
  it("defaults the limit to 64 KiB", () => {
    expect(checkTextFile("a".repeat(65536), { labels })).toBeNull();
    expect(checkTextFile("a".repeat(65537), { labels })).toBe("too large");
  });
  it("runs the custom validator last", () => {
    const validate = (t: string) => (t === "x" ? "custom" : null);
    expect(checkTextFile("x", { labels, validate })).toBe("custom");
    expect(checkTextFile("y", { labels, validate })).toBeNull();
    expect(checkTextFile("{bad", { labels, requireJson: true, validate })).toBe("bad json");
  });
});
