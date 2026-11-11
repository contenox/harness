import { ROOT_DIR, type DirCache } from '../pages/chat/lib/workspaceTree';
import { cwdRawFetch } from './projectRuntime';
import { parseSSEFrames } from './workspaceSearch';

export interface WorkspaceEvent {
  nid: number;
  type: string;
  source: string;
  subject: string;
  time: string;
  data?: Record<string, unknown>;
}

export interface TreeChange {
  reload: string[];
  drop: string[];
  all: boolean;
}

export function parentDir(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? ROOT_DIR : path.slice(0, i);
}

function listed(cache: DirCache, path: string): boolean {
  return !!cache[parentDir(path)]?.some(e => e.path === path);
}

function loaded(cache: DirCache, dir: string): boolean {
  return cache[dir] !== undefined;
}

export function treeChangeFor(event: WorkspaceEvent, cache: DirCache): TreeChange | null {
  const path = event.subject;
  const reload = new Set<string>();
  const drop: string[] = [];
  const touch = (p: string) => {
    if (loaded(cache, parentDir(p))) reload.add(parentDir(p));
  };
  switch (event.type) {
    case 'fs.rescan':
      return { reload: [], drop: [], all: true };
    case 'fs.created':
      touch(path);
      break;
    case 'fs.modified':
    case 'tool.wrote':
      if (!listed(cache, path)) touch(path);
      break;
    case 'fs.deleted':
      touch(path);
      drop.push(path);
      break;
    case 'fs.moved': {
      touch(path);
      const from = typeof event.data?.from === 'string' ? event.data.from : null;
      if (from) {
        touch(from);
        drop.push(from);
      }
      break;
    }
    default:
      return null;
  }
  const dropped = drop.filter(p => Object.keys(cache).some(k => k === p || k.startsWith(`${p}/`)));
  if (reload.size === 0 && dropped.length === 0) return null;
  return { reload: [...reload], drop: dropped, all: false };
}

export function dropDirs(cache: DirCache, paths: readonly string[]): DirCache {
  if (paths.length === 0) return cache;
  const next: DirCache = {};
  for (const [key, entries] of Object.entries(cache)) {
    if (paths.some(p => key === p || key.startsWith(`${p}/`))) continue;
    next[key] = entries;
  }
  return next;
}

export function eventsStreamUrl(root: string, since: number | null): string {
  const params = new URLSearchParams({ root });
  if (since !== null) params.set('since', String(since));
  return `/api/workspace/events/stream?${params.toString()}`;
}

export interface FollowOptions {
  root: string;
  signal: AbortSignal;
  onEvent: (event: WorkspaceEvent) => void;
  onConnected: (resumed: boolean) => void;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  retryMs?: (attempt: number) => number;
  idleMs?: number;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>(resolve => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

const defaultRetry = (attempt: number) => Math.min(1000 * 2 ** attempt, 15000);

export async function followWorkspaceEvents(opts: FollowOptions): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? ((url, init) => cwdRawFetch(opts.root, url, init));
  const retry = opts.retryMs ?? defaultRetry;
  const idleMs = opts.idleMs ?? 45000;
  let cursor: number | null = null;
  let connections = 0;
  let attempt = 0;
  while (!opts.signal.aborted) {
    const connection = new AbortController();
    const abort = () => connection.abort();
    opts.signal.addEventListener('abort', abort, { once: true });
    let idle: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (idle) clearTimeout(idle);
      idle = setTimeout(abort, idleMs);
    };
    try {
      arm();
      const response = await fetchImpl(eventsStreamUrl(opts.root, cursor), {
        signal: connection.signal,
        credentials: 'same-origin',
        headers: { Accept: 'text/event-stream' },
      });
      if (response.status === 422 || response.status === 404) return;
      if (response.ok && response.body) {
        opts.onConnected(connections > 0);
        connections++;
        attempt = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          arm();
          buffer += decoder.decode(value, { stream: true });
          const { frames, rest } = parseSSEFrames(buffer);
          buffer = rest;
          for (const frame of frames) {
            let event: WorkspaceEvent;
            try {
              event = JSON.parse(frame.data) as WorkspaceEvent;
            } catch {
              continue;
            }
            if (typeof event.nid === 'number') cursor = Math.max(cursor ?? 0, event.nid);
            opts.onEvent(event);
          }
        }
      }
    } catch {
      if (opts.signal.aborted) return;
    } finally {
      if (idle) clearTimeout(idle);
      opts.signal.removeEventListener('abort', abort);
    }
    await sleep(retry(attempt++), opts.signal);
  }
}
