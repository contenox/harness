import { describe, expect, it } from 'vitest';
import type { DirCache } from '../pages/chat/lib/workspaceTree';
import {
  dropDirs,
  eventsStreamUrl,
  followWorkspaceEvents,
  parentDir,
  treeChangeFor,
  type WorkspaceEvent,
} from './workspaceEvents';

const cache: DirCache = {
  '': [
    { path: 'src', name: 'src', isDirectory: true },
    { path: 'README.md', name: 'README.md', isDirectory: false },
  ],
  src: [
    { path: 'src/main.go', name: 'main.go', isDirectory: false },
    { path: 'src/pkg', name: 'pkg', isDirectory: true },
  ],
  'src/pkg': [{ path: 'src/pkg/a.go', name: 'a.go', isDirectory: false }],
};

const ev = (type: string, subject: string, data?: Record<string, unknown>): WorkspaceEvent => ({
  nid: 1,
  type,
  source: 'watcher',
  subject,
  time: '2026-11-10T00:00:00Z',
  data,
});

describe('parentDir', () => {
  it('maps top-level paths to the root and nested ones to their folder', () => {
    expect(parentDir('README.md')).toBe('');
    expect(parentDir('src/pkg/a.go')).toBe('src/pkg');
  });
});

describe('treeChangeFor', () => {
  it('reloads the parent of a created path only when that folder is loaded', () => {
    expect(treeChangeFor(ev('fs.created', 'src/new.go'), cache)).toEqual({
      reload: ['src'],
      drop: [],
      all: false,
    });
    expect(treeChangeFor(ev('fs.created', 'docs/new.md'), cache)).toBeNull();
  });

  it('ignores a modified file the tree already lists, but adds one it does not', () => {
    expect(treeChangeFor(ev('fs.modified', 'src/main.go'), cache)).toBeNull();
    expect(treeChangeFor(ev('fs.modified', 'src/fresh.go'), cache)?.reload).toEqual(['src']);
    expect(treeChangeFor(ev('tool.wrote', 'notes.md'), cache)?.reload).toEqual(['']);
  });

  it('drops a deleted folder and everything cached under it', () => {
    expect(treeChangeFor(ev('fs.deleted', 'src', { isDir: true }), cache)).toEqual({
      reload: [''],
      drop: ['src'],
      all: false,
    });
  });

  it('reloads both ends of a move and forgets the old folder', () => {
    const change = treeChangeFor(ev('fs.moved', 'lib/pkg', { from: 'src/pkg' }), cache);
    expect(change?.reload).toEqual(['src']);
    expect(change?.drop).toEqual(['src/pkg']);
    expect(treeChangeFor(ev('fs.moved', 'README.txt', { from: 'README.md' }), cache)).toEqual({
      reload: [''],
      drop: [],
      all: false,
    });
  });

  it('asks for everything on a rescan and nothing for unrelated events', () => {
    expect(treeChangeFor(ev('fs.rescan', ''), cache)?.all).toBe(true);
    expect(treeChangeFor(ev('editor.opened', 'src/main.go'), cache)).toBeNull();
    expect(treeChangeFor(ev('approval.decided', 'abc'), cache)).toBeNull();
  });
});

describe('dropDirs', () => {
  it('removes the folder and its descendants, keeping siblings', () => {
    expect(Object.keys(dropDirs(cache, ['src']))).toEqual(['']);
    expect(Object.keys(dropDirs(cache, ['src/pkg']))).toEqual(['', 'src']);
    expect(dropDirs(cache, [])).toBe(cache);
  });
});

function sse(chunks: string[]): Response {
  const enc = new TextEncoder();
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length ? { done: false, value: enc.encode(chunks[i++]) } : { done: true },
      }),
    },
  } as unknown as Response;
}

describe('followWorkspaceEvents', () => {
  it('resumes from the last seen event after the stream drops', async () => {
    const urls: string[] = [];
    const seen: number[] = [];
    const connected: boolean[] = [];
    const controller = new AbortController();
    const responses = [
      sse([
        ': connected cursor=4\n\n',
        'id: 5\ndata: {"nid":5,"type":"fs.created","source":"watcher","subject":"a"}\n\n',
      ]),
      sse(['id: 6\ndata: {"nid":6,"type":"fs.deleted","source":"watcher","subject":"a"}\n\n']),
    ];
    await followWorkspaceEvents({
      root: '/repo',
      signal: controller.signal,
      retryMs: () => 0,
      fetchImpl: async url => {
        urls.push(url);
        const next = responses.shift();
        if (!next) {
          controller.abort();
          throw new Error('aborted');
        }
        return next;
      },
      onConnected: resumed => connected.push(resumed),
      onEvent: e => seen.push(e.nid),
    });
    expect(seen).toEqual([5, 6]);
    expect(connected).toEqual([false, true]);
    expect(urls[0]).toBe(eventsStreamUrl('/repo', null));
    expect(urls[1]).toBe(eventsStreamUrl('/repo', 5));
    expect(urls[2]).toBe(eventsStreamUrl('/repo', 6));
  });

  it('drops a silent connection and resumes from its cursor', async () => {
    const urls: string[] = [];
    const controller = new AbortController();
    const enc = new TextEncoder();
    let calls = 0;
    await followWorkspaceEvents({
      root: '/repo',
      signal: controller.signal,
      retryMs: () => 0,
      idleMs: 20,
      fetchImpl: async (url, init) => {
        urls.push(url);
        calls++;
        if (calls > 1) {
          controller.abort();
          throw new Error('aborted');
        }
        let sent = false;
        return {
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: () =>
                sent
                  ? new Promise((_, reject) =>
                      init.signal?.addEventListener('abort', () => reject(new Error('idle'))),
                    )
                  : ((sent = true),
                    Promise.resolve({
                      done: false,
                      value: enc.encode(
                        'id: 9\ndata: {"nid":9,"type":"fs.created","source":"watcher","subject":"a"}\n\n',
                      ),
                    })),
            }),
          },
        } as unknown as Response;
      },
      onConnected: () => {},
      onEvent: () => {},
    });
    expect(urls).toEqual([eventsStreamUrl('/repo', null), eventsStreamUrl('/repo', 9)]);
  });

  it('stops for good when the root is not granted', async () => {
    let calls = 0;
    await followWorkspaceEvents({
      root: '/elsewhere',
      signal: new AbortController().signal,
      retryMs: () => 0,
      fetchImpl: async () => {
        calls++;
        return { ok: false, status: 422, body: null } as unknown as Response;
      },
      onConnected: () => {},
      onEvent: () => {},
    });
    expect(calls).toBe(1);
  });
});
