import type { SessionConfigOption, SessionConfigValue } from "@contenox/acp-client";
import { isGroupedOptions } from "./configOptions";

/** Above this many values a select shows a search field. */
export const SEARCH_THRESHOLD = 8;

export type ChoiceEntry =
  | { kind: "header"; key: string; label: string }
  | {
      kind: "item";
      value: string;
      label: string;
      description?: string;
      /** Name of the group the value sits in (grouped options only). */
      group?: string;
    };

export type ChoiceItem = Extract<ChoiceEntry, { kind: "item" }>;

function itemOf(v: SessionConfigValue, group?: string): ChoiceItem {
  return {
    kind: "item",
    value: v.value,
    label: v.name || v.value,
    description: v.description,
    group,
  };
}

function matches(item: ChoiceItem, q: string): boolean {
  return [item.label, item.value, item.group ?? "", item.description ?? ""].some((s) =>
    s.toLowerCase().includes(q),
  );
}

/**
 * Entries of a select option in runtime order: group headers followed by their values.
 * With a query, only matching values remain (and headers that still have values).
 */
export function buildChoiceEntries(option: SessionConfigOption, query = ""): ChoiceEntry[] {
  const q = query.trim().toLowerCase();
  const keep = (i: ChoiceItem) => q === "" || matches(i, q);
  const raw = Array.isArray(option.options) ? option.options : [];
  if (isGroupedOptions(option.options)) {
    const groups = new Map<string, { key: string; label: string; items: ChoiceItem[] }>();
    option.options.forEach((g, gi) => {
      const id = g.group || g.name;
      let bucket = groups.get(id);
      if (!bucket) {
        bucket = { key: `${gi}:${g.group}`, label: g.name || g.group, items: [] };
        groups.set(id, bucket);
      }
      const seen = new Set(bucket.items.map((i) => i.value));
      for (const v of g.options ?? []) {
        if (seen.has(v.value)) continue;
        seen.add(v.value);
        bucket.items.push(itemOf(v, bucket.label));
      }
    });
    return [...groups.values()].flatMap((bucket) => {
      const items = bucket.items.filter(keep);
      return items.length === 0
        ? []
        : [{ kind: "header" as const, key: bucket.key, label: bucket.label }, ...items];
    });
  }
  const seen = new Set<string>();
  return (raw as SessionConfigValue[])
    .filter((v) => !seen.has(v.value) && !!seen.add(v.value))
    .map((v) => itemOf(v))
    .filter(keep);
}

/** Values only, in display order: what keyboard navigation walks (headers are skipped). */
export function choiceItems(entries: readonly ChoiceEntry[]): ChoiceItem[] {
  return entries.filter((e): e is ChoiceItem => e.kind === "item");
}

export function needsSearch(option: SessionConfigOption): boolean {
  return choiceItems(buildChoiceEntries(option)).length > SEARCH_THRESHOLD;
}

export interface ChoiceSummary {
  /** Selected value's name, or null when nothing (valid) is selected. */
  label: string | null;
  /** Secondary label: the group the selected value sits in. */
  badge?: string;
  /** Tooltip text: "group · name" or just the name. */
  title: string | null;
}

/** What the chip shows for the option's current value; the value is opaque (never parsed). */
export function summarizeChoice(option: SessionConfigOption): ChoiceSummary {
  if (option.currentValue === "") return { label: null, title: null };
  const item = choiceItems(buildChoiceEntries(option)).find((i) => i.value === option.currentValue);
  if (!item) return { label: null, title: null };
  return {
    label: item.label,
    badge: item.group,
    title: item.group ? `${item.group} · ${item.label}` : item.label,
  };
}
