import type { DiffLine } from '@contenox/ui';
import { cwdRawFetch } from './projectRuntime';

export interface ReplaceQuery {
  pattern: string;
  replacement: string;
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  include?: string[];
}

export interface ReplaceHunk {
  line: number;
  before: string[];
  after: string[];
}

export interface ReplaceFile {
  path: string;
  etag: string;
  matches: number;
  hunks: ReplaceHunk[];
  hunksTruncated?: boolean;
}

export interface ReplacePreview {
  id: string;
  expiresAt: string;
  files: ReplaceFile[];
  totalMatches: number;
  filesScanned: number;
  truncated: boolean;
}

export interface ReplaceApplied {
  applied: { path: string; etag: string; matches: number }[];
  conflicts: { path: string; currentEtag: string }[];
  failed: { path: string; message: string }[];
  retry: boolean;
}

export function retryPreview(
  preview: ReplacePreview,
  result: ReplaceApplied,
): ReplacePreview | null {
  if (!result.retry || result.failed.length === 0) return null;
  const failed = new Set(result.failed.map(f => f.path));
  const files = preview.files.filter(f => failed.has(f.path));
  if (files.length === 0) return null;
  return { ...preview, files, totalMatches: files.reduce((n, f) => n + f.matches, 0) };
}

export type ReplaceResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

async function post<T>(root: string, endpoint: string, body: unknown): Promise<ReplaceResult<T>> {
  let response: Response;
  try {
    response = await cwdRawFetch(root, `${endpoint}?${new URLSearchParams({ root }).toString()}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? err.message : String(err) };
  }
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const error = (parsed as { error?: { message?: unknown } } | null)?.error;
    return {
      ok: false,
      status: response.status,
      message:
        typeof error?.message === 'string' ? error.message : `request failed (${response.status})`,
    };
  }
  return { ok: true, value: parsed as T };
}

export function splitGlobs(raw: string): string[] {
  return raw
    .split(',')
    .map(g => g.trim())
    .filter(Boolean);
}

export const previewReplace = (root: string, query: ReplaceQuery) =>
  post<ReplacePreview>(root, '/api/workspace/replace', query);

export const applyReplace = (root: string, id: string, paths: string[]) =>
  post<ReplaceApplied>(root, `/api/workspace/replace/${encodeURIComponent(id)}/apply`, { paths });

export function hunkLines(file: ReplaceFile): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const hunk of file.hunks) {
    hunk.before.forEach((content, i) =>
      lines.push({ type: 'remove', content, oldLineNumber: hunk.line + i }),
    );
    hunk.after.forEach((content, i) =>
      lines.push({ type: 'add', content, newLineNumber: hunk.line + i }),
    );
  }
  return lines;
}
