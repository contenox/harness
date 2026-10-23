


export const DROPPED_CONTENT_META_KEY = 'contenox.droppedContent';


export const DROPPED_KIND_IMAGE = 'image';


export const DROPPED_KIND_AUDIO = 'audio';


function kindsOf(raw: unknown): string[] {
  if (typeof raw === 'string') return raw === '' ? [] : [raw];
  if (Array.isArray(raw)) return raw.filter((k): k is string => typeof k === 'string' && k !== '');
  if (typeof raw === 'object' && raw !== null) {
    return kindsOf((raw as Record<string, unknown>).kinds);
  }
  return [];
}

/**
 * The content kinds the runtime reported dropping for a turn, de-duplicated and in the order it named them.
 */
export function droppedContentKinds(meta: Record<string, unknown> | undefined | null): string[] {
  if (!meta) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const kind of kindsOf(meta[DROPPED_CONTENT_META_KEY])) {
    if (seen.has(kind)) continue;
    seen.add(kind);
    out.push(kind);
  }
  return out;
}

/**
 * Whether the turn's images were discarded — one of the two cases the composer can cause and the transcript marks.
 */
export function droppedImages(meta: Record<string, unknown> | undefined | null): boolean {
  return droppedContentKinds(meta).includes(DROPPED_KIND_IMAGE);
}

/**
 * Whether the turn's audio was discarded — the other composer-caused case, marked on the message that carried the clip.
 */
export function droppedAudio(meta: Record<string, unknown> | undefined | null): boolean {
  return droppedContentKinds(meta).includes(DROPPED_KIND_AUDIO);
}
