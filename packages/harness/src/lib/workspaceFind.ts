import { parseSSEFrames } from './workspaceSearch';


export interface WorkspaceFindMatch {
  path: string;
  name: string;
  isDirectory: boolean;
  size?: number;
}

export interface WorkspaceFindDone {
  done: boolean;
  matches: number;
  truncated: boolean;
}

export type FindRefusal = { status: number; code?: string; message: string };

export type FindFetch = (
  url: string,
  init: { signal?: AbortSignal; headers: Record<string, string>; credentials: 'same-origin' },
) => Promise<FindResponseLike>;

export interface FindResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  body: {
    getReader(): {
      read(): Promise<{ done: boolean; value?: Uint8Array }>;
    };
  } | null;
}

export interface RunWorkspaceFindOptions {
  globs: string[];
  root?: string;
  path?: string;
  filter?: string;
  policy?: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FindFetch;
  onMatch: (match: WorkspaceFindMatch) => void;
  onDone: (done: WorkspaceFindDone) => void;
  onRefusal: (refusal: FindRefusal) => void;
  onError: (message: string) => void;
}

export function buildFindUrl(opts: RunWorkspaceFindOptions): string {
  const params = new URLSearchParams({ glob: opts.globs.join(',') });
  if (opts.root) params.set('root', opts.root);
  if (opts.path && opts.path !== '.') params.set('path', opts.path);
  if (opts.filter) params.set('filter', opts.filter);
  if (opts.policy) params.set('policy', opts.policy);
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  return `/api/workspace/find?${params.toString()}`;
}

function messageFromErrorBody(body: unknown): { message?: string; code?: string } {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'object' && err !== null) {
      const e = err as { message?: unknown; code?: unknown };
      return {
        message: typeof e.message === 'string' ? e.message : undefined,
        code: typeof e.code === 'string' ? e.code : undefined,
      };
    }
  }
  return {};
}

const defaultFetch: FindFetch = (url, init) =>
  fetch(url, init) as unknown as Promise<FindResponseLike>;

export async function runWorkspaceFind(opts: RunWorkspaceFindOptions): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? defaultFetch;
  const url = buildFindUrl(opts);

  let response: FindResponseLike;
  try {
    response = await fetchImpl(url, {
      signal: opts.signal,
      credentials: 'same-origin',
      headers: { Accept: 'text/event-stream' },
    });
  } catch (err) {
    if (isAbort(err)) return;
    opts.onError(err instanceof Error ? err.message : String(err));
    return;
  }

  if (!response.ok) {
    let parsed: { message?: string; code?: string } = {};
    try {
      parsed = messageFromErrorBody(await response.json());
    } catch {
    }
    const message = parsed.message ?? `find failed (${response.status})`;
    if (response.status === 422) {
      opts.onRefusal({ status: 422, code: parsed.code, message });
    } else {
      opts.onError(message);
    }
    return;
  }

  if (!response.body) {
    opts.onDone({ done: true, matches: 0, truncated: false });
    return;
  }

  const reader = response.body.getReader();
  const streamDecoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += streamDecoder.decode(value, { stream: true });
      const { frames, rest } = parseSSEFrames(buffer);
      buffer = rest;
      for (const frame of frames) {
        if (frame.event === 'match') {
          const m = safeParse<WorkspaceFindMatch>(frame.data);
          if (m) opts.onMatch(m);
        } else if (frame.event === 'done') {
          const d = safeParse<WorkspaceFindDone>(frame.data);
          opts.onDone(d ?? { done: true, matches: 0, truncated: false });
          return;
        }
      }
    }
  } catch (err) {
    if (isAbort(err)) return;
    opts.onError(err instanceof Error ? err.message : String(err));
  }
}

function safeParse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException ? err.name === 'AbortError' : false;
}
