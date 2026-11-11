import type { EnvelopeItem } from './agentsConfig';

export type Grant = 'allow' | 'approve' | 'deny';
export type Substitution = 'approve' | 'deny' | 'off';

export const GRANTS: Grant[] = ['allow', 'approve', 'deny'];

export type AxisId = 'files.read' | 'files.write' | 'shell' | 'missions.fire' | 'missions.answer';

export type ListKey =
  | 'approve_paths'
  | 'deny_paths'
  | 'prefix_allowlist'
  | 'ask_always'
  | 'blacklist';

export const AXIS_PATH: Record<AxisId, string[]> = {
  'files.read': ['files', 'read'],
  'files.write': ['files', 'write'],
  shell: ['shell'],
  'missions.fire': ['missions', 'fire'],
  'missions.answer': ['missions', 'answer'],
};

export const AXIS_LISTS: Record<AxisId, ListKey[]> = {
  'files.read': ['approve_paths', 'deny_paths'],
  'files.write': ['approve_paths', 'deny_paths'],
  shell: ['prefix_allowlist', 'ask_always', 'blacklist'],
  'missions.fire': [],
  'missions.answer': [],
};

export const CHAT_ENVELOPE = 'default';

export const AREA_TOOLSETS = new Set(['local_fs', 'local_shell', 'mission']);

export type AxisValue = {
  grant: Grant;
  lists: Partial<Record<ListKey, string[]>>;
  substitution?: Substitution;
  extra: Record<string, unknown>;
};

export type Resolved<T> = { value: T; from: string };

export type RawEnvelopes = Map<string, Record<string, unknown>>;

const MAX_CHAIN = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGrant(value: unknown): value is Grant {
  return value === 'allow' || value === 'approve' || value === 'deny';
}

export function getAt(value: unknown, path: string[]): unknown {
  let cur: unknown = value;
  for (const key of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

export function rawEnvelopes(items: EnvelopeItem[] | undefined): RawEnvelopes {
  const out: RawEnvelopes = new Map();
  for (const item of items ?? []) {
    out.set(item.name, isRecord(item.effective) ? item.effective : {});
  }
  return out;
}

export function parseAxis(raw: unknown): AxisValue | undefined {
  if (isGrant(raw)) return { grant: raw, lists: {}, extra: {} };
  if (!isRecord(raw) || !isGrant(raw.grant)) return undefined;
  const value: AxisValue = { grant: raw.grant, lists: {}, extra: {} };
  for (const [key, entry] of Object.entries(raw)) {
    if (key === 'grant') continue;
    if (key === 'substitution' && (entry === 'approve' || entry === 'deny' || entry === 'off')) {
      value.substitution = entry;
      continue;
    }
    if (Array.isArray(entry) && isListKey(key)) {
      value.lists[key] = entry.filter((v): v is string => typeof v === 'string');
      continue;
    }
    value.extra[key] = entry;
  }
  return value;
}

function isListKey(key: string): key is ListKey {
  return (
    key === 'approve_paths' ||
    key === 'deny_paths' ||
    key === 'prefix_allowlist' ||
    key === 'ask_always' ||
    key === 'blacklist'
  );
}

export function parentOf(envelopes: RawEnvelopes, name: string): string | undefined {
  const extendsName = envelopes.get(name)?.extends;
  return typeof extendsName === 'string' && extendsName.trim() !== ''
    ? extendsName.trim()
    : undefined;
}

function chain(envelopes: RawEnvelopes, name: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let cur: string | undefined = name; cur && !seen.has(cur) && out.length <= MAX_CHAIN; ) {
    if (!envelopes.has(cur)) break;
    seen.add(cur);
    out.push(cur);
    cur = parentOf(envelopes, cur);
  }
  return out;
}

export function resolveAxis(
  envelopes: RawEnvelopes,
  name: string,
  axis: AxisId,
): Resolved<AxisValue> | undefined {
  for (const link of chain(envelopes, name)) {
    const value = parseAxis(getAt(envelopes.get(link), AXIS_PATH[axis]));
    if (value) return { value, from: link };
  }
  return undefined;
}

export function resolveDefaultAction(envelopes: RawEnvelopes, name: string): Grant {
  for (const link of chain(envelopes, name)) {
    const value = parseAxis(envelopes.get(link)?.default_action);
    if (value) return value.grant;
  }
  return 'approve';
}

export function resolveTools(envelopes: RawEnvelopes, name: string): Map<string, Resolved<Grant>> {
  const out = new Map<string, Resolved<Grant>>();
  for (const link of chain(envelopes, name)) {
    const tools = envelopes.get(link)?.tools;
    if (!isRecord(tools)) continue;
    for (const [pattern, raw] of Object.entries(tools)) {
      if (out.has(pattern)) continue;
      const value = parseAxis(raw);
      if (value) out.set(pattern, { value: value.grant, from: link });
    }
  }
  return out;
}

export function layerHas(layer: unknown, path: string[]): boolean {
  return getAt(layer, path) !== undefined;
}

export function serializeAxis(
  axis: AxisId,
  next: AxisValue,
  previous: AxisValue | undefined,
): unknown {
  const table: Record<string, unknown> = { ...next.extra, grant: next.grant };
  for (const key of AXIS_LISTS[axis]) {
    const values = next.lists[key] ?? [];
    if (values.length > 0 || (previous?.lists[key]?.length ?? 0) > 0) table[key] = values;
  }
  if (axis === 'shell' && (next.substitution || previous?.substitution)) {
    table.substitution = next.substitution ?? 'approve';
  }
  return Object.keys(table).length === 1 ? next.grant : table;
}

export function nestAt(path: string[], value: unknown): Record<string, unknown> {
  let out: unknown = value;
  for (let i = path.length - 1; i >= 0; i--) out = { [path[i]]: out };
  return out as Record<string, unknown>;
}

export function axisPatch(
  axis: AxisId,
  next: AxisValue,
  previous: AxisValue | undefined,
): Record<string, unknown> {
  return nestAt(AXIS_PATH[axis], serializeAxis(axis, next, previous));
}

export function displayName(name: string): string {
  const spaced = name.replace(/[_-]+/g, ' ').trim();
  return spaced === '' ? name : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function slugFor(title: string, taken: Iterable<string>): string {
  const base =
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'set';
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
}

export function policyEnvelopeName(policy: string | undefined | null): string | undefined {
  const trimmed = policy?.trim() ?? '';
  if (trimmed === '') return undefined;
  return trimmed.replace(/^hitl-policy-/, '').replace(/\.json$/, '');
}

export function sameValue(a: AxisValue | undefined, b: AxisValue | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.grant !== b.grant || (a.substitution ?? '') !== (b.substitution ?? '')) return false;
  const keys = new Set<ListKey>([
    ...(Object.keys(a.lists) as ListKey[]),
    ...(Object.keys(b.lists) as ListKey[]),
  ]);
  for (const key of keys) {
    const left = a.lists[key] ?? [];
    const right = b.lists[key] ?? [];
    if (left.length !== right.length || left.some((v, i) => v !== right[i])) return false;
  }
  return true;
}
