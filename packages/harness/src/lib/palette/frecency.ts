
export interface FrecencyEntry {
  count: number;
  lastUsed: number;
}

export type FrecencyStore = Record<string, FrecencyEntry>;

const STORAGE_KEY = 'contenox_palette_frecency';
const HALF_LIFE_MS = 3 * 24 * 60 * 60 * 1000;
const BOOST_FACTOR = 0.6;
const MAX_ENTRIES = 250;

export function recordUsage(store: FrecencyStore, id: string, now: number): FrecencyStore {
  const prev = store[id];
  return {
    ...store,
    [id]: { count: (prev?.count ?? 0) + 1, lastUsed: now },
  };
}

export function frecencyBoost(entry: FrecencyEntry | undefined, now: number): number {
  if (!entry || entry.count <= 0) return 1;
  const ageMs = Math.max(0, now - entry.lastUsed);
  const recency = Math.pow(0.5, ageMs / HALF_LIFE_MS);
  const strength = Math.log2(1 + entry.count);
  return 1 + BOOST_FACTOR * strength * recency;
}

export function blend(matchScore: number, boost: number): number {
  return matchScore * boost;
}


const memoryFallback = new Map<string, string>();

function getRaw(): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(STORAGE_KEY);
  } catch {
  }
  return memoryFallback.get(STORAGE_KEY) ?? null;
}

function setRaw(value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value);
      return;
    }
  } catch {
  }
  memoryFallback.set(STORAGE_KEY, value);
}

export function loadFrecency(): FrecencyStore {
  const raw = getRaw();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: FrecencyStore = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        v &&
        typeof v === 'object' &&
        typeof (v as FrecencyEntry).count === 'number' &&
        typeof (v as FrecencyEntry).lastUsed === 'number'
      ) {
        out[id] = { count: (v as FrecencyEntry).count, lastUsed: (v as FrecencyEntry).lastUsed };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveFrecency(store: FrecencyStore): void {
  setRaw(JSON.stringify(pruneStore(store)));
}

export function pruneStore(store: FrecencyStore): FrecencyStore {
  const ids = Object.keys(store);
  if (ids.length <= MAX_ENTRIES) return store;
  const kept = ids
    .sort((a, b) => store[b].lastUsed - store[a].lastUsed)
    .slice(0, MAX_ENTRIES);
  const out: FrecencyStore = {};
  for (const id of kept) out[id] = store[id];
  return out;
}
