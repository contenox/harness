import { beforeEach, describe, expect, it, vi } from 'vitest';

const cwdRawFetch = vi.fn();
vi.mock('../lib/projectRuntime', () => ({
  cwdRawFetch: (...args: unknown[]) => cwdRawFetch(...args),
}));

import { putFile } from './useEditorBuffers';

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sent(): { method: string; headers: Record<string, string> } {
  const init = cwdRawFetch.mock.calls[0][2] as RequestInit;
  return { method: String(init.method), headers: init.headers as Record<string, string> };
}

beforeEach(() => cwdRawFetch.mockReset());

describe('putFile', () => {
  it('replaces the version it read', async () => {
    cwdRawFetch.mockResolvedValue(reply(200, { etag: 'v2' }));
    expect(await putFile('/w', 'a.txt', 'x', 'v1')).toEqual({ kind: 'saved', etag: 'v2' });
    expect(sent().method).toBe('PUT');
    expect(sent().headers['If-Match']).toBe('"v1"');
  });

  it('creates the file when no version is known, never overwriting one', async () => {
    cwdRawFetch.mockResolvedValue(reply(201, { etag: 'new' }));
    expect(await putFile('/w', 'a.txt', 'x', null)).toEqual({ kind: 'saved', etag: 'new' });
    expect(sent().method).toBe('POST');
    expect(sent().headers['If-Match']).toBeUndefined();
  });

  it('reports a file that reappeared before the create as a conflict', async () => {
    cwdRawFetch.mockResolvedValue(reply(409, { error: { message: 'file already exists' } }));
    expect(await putFile('/w', 'a.txt', 'x', null)).toEqual({ kind: 'conflict', currentEtag: '' });
  });
});
