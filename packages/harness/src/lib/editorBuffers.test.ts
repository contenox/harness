import { describe, expect, it } from 'vitest';
import { buffersReducer, isDirty, touchedPaths, type EditorBuffers } from './editorBuffers';

function opened(text = 'v1\n', etag = 'e1'): EditorBuffers {
  let s = buffersReducer({}, { type: 'opened', path: 'a.go' });
  s = buffersReducer(s, { type: 'loaded', path: 'a.go', text, etag, binary: false });
  return s;
}

describe('buffersReducer', () => {
  it('tracks dirty against the loaded base and clears it on save', () => {
    let s = opened();
    expect(isDirty(s['a.go'])).toBe(false);
    s = buffersReducer(s, { type: 'edited', path: 'a.go', text: 'v2\n' });
    expect(isDirty(s['a.go'])).toBe(true);
    s = buffersReducer(s, { type: 'saveStarted', path: 'a.go' });
    s = buffersReducer(s, { type: 'saved', path: 'a.go', text: 'v2\n', etag: 'e2' });
    expect(isDirty(s['a.go'])).toBe(false);
    expect(s['a.go'].etag).toBe('e2');
    expect(s['a.go'].saving).toBe(false);
  });

  it('keeps edits typed while a save was in flight', () => {
    let s = buffersReducer(opened(), { type: 'edited', path: 'a.go', text: 'v2\n' });
    s = buffersReducer(s, { type: 'saveStarted', path: 'a.go' });
    s = buffersReducer(s, { type: 'edited', path: 'a.go', text: 'v3\n' });
    s = buffersReducer(s, { type: 'saved', path: 'a.go', text: 'v2\n', etag: 'e2' });
    expect(s['a.go'].text).toBe('v3\n');
    expect(isDirty(s['a.go'])).toBe(true);
  });

  it('follows the disk silently while clean', () => {
    const s = buffersReducer(opened(), {
      type: 'diskChanged',
      path: 'a.go',
      text: 'agent\n',
      etag: 'e9',
    });
    expect(s['a.go'].text).toBe('agent\n');
    expect(s['a.go'].conflict).toBeNull();
  });

  it('ignores its own save coming back from the watcher', () => {
    let s = buffersReducer(opened(), { type: 'edited', path: 'a.go', text: 'v2\n' });
    s = buffersReducer(s, { type: 'saved', path: 'a.go', text: 'v2\n', etag: 'e2' });
    const echoed = buffersReducer(s, {
      type: 'diskChanged',
      path: 'a.go',
      text: 'v2\n',
      etag: 'e2',
    });
    expect(echoed).toBe(s);
  });

  it('raises a conflict when the disk changes under unsaved edits', () => {
    let s = buffersReducer(opened(), { type: 'edited', path: 'a.go', text: 'mine\n' });
    s = buffersReducer(s, { type: 'diskChanged', path: 'a.go', text: 'theirs\n', etag: 'e9' });
    expect(s['a.go'].text).toBe('mine\n');
    expect(s['a.go'].conflict).toEqual({
      reason: 'disk',
      currentEtag: 'e9',
      diskText: 'theirs\n',
      deleted: false,
    });
    const before = s['a.go'].reloads;
    s = buffersReducer(s, { type: 'reloaded', path: 'a.go', text: 'theirs\n', etag: 'e9' });
    expect(s['a.go'].conflict).toBeNull();
    expect(isDirty(s['a.go'])).toBe(false);
    expect(s['a.go'].reloads).toBe(before + 1);
  });

  it('settles without a conflict when the disk reached the same text', () => {
    let s = buffersReducer(opened(), { type: 'edited', path: 'a.go', text: 'same\n' });
    s = buffersReducer(s, { type: 'diskChanged', path: 'a.go', text: 'same\n', etag: 'e5' });
    expect(s['a.go'].conflict).toBeNull();
    expect(isDirty(s['a.go'])).toBe(false);
    expect(s['a.go'].etag).toBe('e5');
  });

  it('marks a deleted file as a conflict', () => {
    const s = buffersReducer(opened(), { type: 'diskChanged', path: 'a.go', text: null, etag: '' });
    expect(s['a.go'].conflict?.deleted).toBe(true);
  });

  it('moves buffers with a renamed folder', () => {
    let s = buffersReducer({}, { type: 'opened', path: 'src/a.go' });
    s = buffersReducer(s, { type: 'opened', path: 'srcx/b.go' });
    s = buffersReducer(s, { type: 'moved', from: 'src', to: 'lib' });
    expect(Object.keys(s).sort()).toEqual(['lib/a.go', 'srcx/b.go']);
    expect(s['lib/a.go'].path).toBe('lib/a.go');
  });
});

describe('touchedPaths', () => {
  const open = ['src/a.go', 'README.md'];
  it('matches files, their folders and both ends of a move', () => {
    expect(touchedPaths({ type: 'fs.modified', subject: 'src/a.go' }, open)).toEqual(['src/a.go']);
    expect(touchedPaths({ type: 'fs.deleted', subject: 'src' }, open)).toEqual(['src/a.go']);
    expect(
      touchedPaths(
        { type: 'fs.moved', subject: 'docs/README.md', data: { from: 'README.md' } },
        open,
      ),
    ).toEqual(['README.md']);
    expect(touchedPaths({ type: 'tool.wrote', subject: 'README.md' }, open)).toEqual(['README.md']);
    expect(touchedPaths({ type: 'editor.saved', subject: 'README.md' }, open)).toEqual([]);
    expect(touchedPaths({ type: 'fs.rescan', subject: '' }, open)).toEqual(open);
  });
});
