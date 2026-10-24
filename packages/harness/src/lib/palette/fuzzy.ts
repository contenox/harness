import fuzzysort from 'fuzzysort';


export interface ScoreResult {
  score: number;
  indexes: number[];
}

export interface InnerScorer {
  prepare(normalized: string): unknown;
  score(query: string, prepared: unknown): ScoreResult | null;
}

export const fuzzysortScorer: InnerScorer = {
  prepare: (normalized: string) => fuzzysort.prepare(normalized),
  score: (query: string, prepared: unknown): ScoreResult | null => {
    const result = fuzzysort.single(query, prepared as ReturnType<typeof fuzzysort.prepare>);
    if (!result) return null;
    return { score: result.score, indexes: Array.from(result.indexes) };
  },
};

export interface WeightedField {
  text: string;
  weight: number;
  highlight?: boolean;
}

export interface SearchMatch<T> {
  item: T;
  score: number;
  matchIndexes: number[];
}

export interface FuzzySearcher<T> {
  search(query: string): SearchMatch<T>[];
}

export function buildNormalized(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const decomposed = text[i].normalize('NFKD').replace(/\p{M}/gu, '');
    for (let j = 0; j < decomposed.length; j++) {
      norm += decomposed[j];
      map.push(i);
    }
  }
  return { norm, map };
}

export function isCaseSensitive(query: string): boolean {
  return /\p{Lu}/u.test(query);
}

interface PreparedField {
  weight: number;
  highlight: boolean;
  norm: string;
  map: number[];
  prepared: unknown;
}

interface IndexedItem<T> {
  item: T;
  fields: PreparedField[];
}

export function createSearcher<T>(
  items: T[],
  toFields: (item: T) => WeightedField[],
  scorer: InnerScorer = fuzzysortScorer,
): FuzzySearcher<T> {
  const index: IndexedItem<T>[] = items.map(item => ({
    item,
    fields: toFields(item)
      .filter(f => f.text.length > 0)
      .map(f => {
        const { norm, map } = buildNormalized(f.text);
        return {
          weight: f.weight,
          highlight: f.highlight ?? false,
          norm,
          map,
          prepared: scorer.prepare(norm),
        };
      }),
  }));

  const search = (query: string): SearchMatch<T>[] => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const caseSensitive = isCaseSensitive(trimmed);
    const tokens = trimmed
      .split(/\s+/)
      .map(tok => buildNormalized(tok).norm)
      .filter(Boolean);
    if (tokens.length === 0) return [];

    const matches: SearchMatch<T>[] = [];

    for (const entry of index) {
      let total = 0;
      const highlightIndexes = new Set<number>();
      let allTokensMatched = true;

      for (const token of tokens) {
        let bestWeighted = -Infinity;

        for (const field of entry.fields) {
          const result = scorer.score(token, field.prepared);
          if (!result) continue;
          if (caseSensitive && !caseMatches(field.norm, token, result.indexes)) continue;

          const weighted = result.score * field.weight;
          if (weighted > bestWeighted) bestWeighted = weighted;

          if (field.highlight) {
            for (const idx of result.indexes) highlightIndexes.add(field.map[idx]);
          }
        }

        if (bestWeighted === -Infinity) {
          allTokensMatched = false;
          break;
        }
        total += bestWeighted;
      }

      if (!allTokensMatched) continue;
      matches.push({
        item: entry.item,
        score: total,
        matchIndexes: [...highlightIndexes].sort((a, b) => a - b),
      });
    }

    matches.sort((a, b) => b.score - a.score);
    return matches;
  };

  return { search };
}

function caseMatches(norm: string, token: string, indexes: number[]): boolean {
  if (indexes.length !== token.length) return false;
  for (let k = 0; k < indexes.length; k++) {
    if (norm[indexes[k]] !== token[k]) return false;
  }
  return true;
}
