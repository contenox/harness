import { describe, expect, it } from 'vitest';
import { retryPreview, type ReplaceApplied, type ReplacePreview } from './workspaceReplace';

const file = (path: string, matches: number) => ({ path, etag: 'e', matches, hunks: [] });

const preview: ReplacePreview = {
  id: 'rp_1',
  expiresAt: '2026-11-10T12:10:00Z',
  files: [file('a.txt', 2), file('b.txt', 3), file('c.txt', 1)],
  totalMatches: 6,
  filesScanned: 3,
  truncated: false,
};

const result = (over: Partial<ReplaceApplied>): ReplaceApplied => ({
  applied: [],
  conflicts: [],
  failed: [],
  retry: false,
  ...over,
});

describe('retryPreview', () => {
  it('keeps only the files that failed, under the same preview', () => {
    const next = retryPreview(
      preview,
      result({ failed: [{ path: 'b.txt', message: 'access denied' }], retry: true }),
    );
    expect(next?.id).toBe('rp_1');
    expect(next?.files.map(f => f.path)).toEqual(['b.txt']);
    expect(next?.totalMatches).toBe(3);
  });

  it('closes the preview when nothing is left to retry', () => {
    expect(
      retryPreview(preview, result({ applied: [{ path: 'a.txt', etag: 'x', matches: 2 }] })),
    ).toBeNull();
    expect(
      retryPreview(preview, result({ conflicts: [{ path: 'a.txt', currentEtag: 'z' }] })),
    ).toBeNull();
  });
});
