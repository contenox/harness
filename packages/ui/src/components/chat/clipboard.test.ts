import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "./clipboard";

interface FakeTextarea {
  value: string;
  style: CSSStyleDeclaration;
  setAttribute: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  setSelectionRange: ReturnType<typeof vi.fn>;
}

function stubClipboard(
  options: { secure?: boolean; writeText?: (text: string) => Promise<void> } = {},
) {
  const area: FakeTextarea = {
    value: "",
    style: {} as CSSStyleDeclaration,
    setAttribute: vi.fn(),
    focus: vi.fn(),
    select: vi.fn(),
    setSelectionRange: vi.fn(),
  };
  const execCommand = vi.fn(() => true);
  const appendChild = vi.fn();
  const removeChild = vi.fn();
  vi.stubGlobal("window", { isSecureContext: options.secure ?? true });
  vi.stubGlobal("document", {
    activeElement: null,
    body: { appendChild, removeChild },
    createElement: vi.fn(() => area),
    execCommand,
  });
  vi.stubGlobal("navigator", {
    clipboard: options.writeText ? { writeText: options.writeText } : undefined,
  });
  return { area, execCommand, appendChild, removeChild };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyTextToClipboard", () => {
  it("writes through the async clipboard when it is available", async () => {
    const writeText = vi.fn(async () => {});
    const env = stubClipboard({ writeText });

    await expect(copyTextToClipboard("hello")).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith("hello");
    expect(env.execCommand).not.toHaveBeenCalled();
  });

  it("falls back to a hidden textarea when the async clipboard rejects", async () => {
    const env = stubClipboard({
      writeText: async () => {
        throw new Error("Write permission denied");
      },
    });

    await expect(copyTextToClipboard("hello")).resolves.toBe(true);

    expect(env.execCommand).toHaveBeenCalledWith("copy");
    expect(env.area.value).toBe("hello");
    expect(env.appendChild).toHaveBeenCalled();
    expect(env.removeChild).toHaveBeenCalled();
  });

  it("skips the async clipboard outside a secure context", async () => {
    const writeText = vi.fn(async () => {});
    const env = stubClipboard({ secure: false, writeText });

    await expect(copyTextToClipboard("hello")).resolves.toBe(true);

    expect(writeText).not.toHaveBeenCalled();
    expect(env.execCommand).toHaveBeenCalledWith("copy");
  });

  it("reports failure when both paths fail", async () => {
    const env = stubClipboard({
      writeText: async () => {
        throw new Error("Write permission denied");
      },
    });
    env.execCommand.mockReturnValue(false);

    await expect(copyTextToClipboard("hello")).resolves.toBe(false);
  });
});
