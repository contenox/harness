import { describe, expect, it } from "vitest";
import type { AvailableCommand } from "@contenox/acp-client";
import {
  mergeRuntimeValueDomains,
  runtimeArgumentCompletions,
  runtimeArgumentHint,
  runtimeFlagValues,
} from "./runtimeArgumentCompletions";
import { deriveSlashFlagArgument, flagValueCompletion } from "./slashMenu";

const COMPLETIONS_KEY = "contenox.argumentCompletions";

const COMMANDS: AvailableCommand[] = [
  {
    name: "mission",
    description: "Fire a mission.",
    input: { hint: "<intent>" },
    _meta: {
      [COMPLETIONS_KEY]: {
        "": { values: [], hint: "one line describing the work" },
        "--policy": { values: ["strict", "dev"], hint: "<envelope>" },
      },
    },
  },
  {
    name: "mission-agent",
    description: "Default mission agent.",
    _meta: { [COMPLETIONS_KEY]: { "": { values: ["coder", "reviewer"], hint: "<agent>" } } },
  },
  {
    name: "policy",
    description: "Switch policy.",
    _meta: { [COMPLETIONS_KEY]: { "": { values: ["runtime-only"], hint: "" } } },
  },
  { name: "compact", description: "Compact." },
];

describe("runtimeArgumentCompletions", () => {
  it("indexes only the commands that carry completions", () => {
    const runtime = runtimeArgumentCompletions(COMMANDS);
    expect([...runtime.keys()]).toEqual(["mission", "mission-agent", "policy"]);
  });

  it("lets runtime first-argument values win over config-option domains, keeping the rest", () => {
    const runtime = runtimeArgumentCompletions(COMMANDS);
    const config = new Map<string, readonly string[]>([
      ["policy", ["from-config"]],
      ["model", ["a/b"]],
    ]);
    const merged = mergeRuntimeValueDomains(config, runtime);
    expect(merged.get("policy")).toEqual(["runtime-only"]);
    expect(merged.get("mission-agent")).toEqual(["coder", "reviewer"]);
    expect(merged.get("model")).toEqual(["a/b"]);
    expect(merged.has("mission")).toBe(false);
  });

  it("keeps the config domains untouched when the runtime advertises nothing", () => {
    const config = new Map<string, readonly string[]>([["model", ["a/b"]]]);
    expect(mergeRuntimeValueDomains(config, runtimeArgumentCompletions([]))).toBe(config);
  });

  it("serves flag values and hints by key", () => {
    const runtime = runtimeArgumentCompletions(COMMANDS);
    expect(runtimeFlagValues(runtime, "mission", "--policy")).toEqual(["strict", "dev"]);
    expect(runtimeFlagValues(runtime, "mission", "--other")).toBeNull();
    expect(runtimeArgumentHint(runtime, "mission", "")).toBe("one line describing the work");
    expect(runtimeArgumentHint(runtime, "policy", "")).toBeNull();
    expect(runtimeArgumentHint(runtime, "compact", "")).toBeNull();
  });
});

describe("deriveSlashFlagArgument", () => {
  it("finds the flag right before the value being typed", () => {
    expect(deriveSlashFlagArgument("/mission --policy ")).toEqual({
      command: "mission",
      flag: "--policy",
      arg: "",
      prefix: "/mission --policy ",
    });
    expect(deriveSlashFlagArgument("/mission fix the build --policy st")).toEqual({
      command: "mission",
      flag: "--policy",
      arg: "st",
      prefix: "/mission fix the build --policy ",
    });
  });

  it("is null when the value is not right after a flag", () => {
    expect(deriveSlashFlagArgument("/mission --policy strict and more")).toBeNull();
    expect(deriveSlashFlagArgument("/mission --policy")).toBeNull();
    expect(deriveSlashFlagArgument("/mission fix it")).toBeNull();
    expect(deriveSlashFlagArgument("say /mission --policy x")).toBeNull();
    expect(deriveSlashFlagArgument("/mission line\n--policy x")).toBeNull();
  });

  it("completes the value in place, keeping everything typed before it", () => {
    expect(flagValueCompletion("/mission fix it --policy ", "strict")).toBe(
      "/mission fix it --policy strict ",
    );
  });
});
