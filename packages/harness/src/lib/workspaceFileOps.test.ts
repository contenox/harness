import { describe, expect, it } from 'vitest';
import { foldersDownTo } from './workspaceFileOps';

describe('foldersDownTo', () => {
  it('opens the folder the entry was created in', () => {
    expect(foldersDownTo('src', 'src/new.ts')).toEqual(['src']);
  });

  it('opens every folder a nested name created on the way', () => {
    expect(foldersDownTo('src', 'src/a/b/new.ts')).toEqual(['src', 'src/a', 'src/a/b']);
  });

  it('opens nothing for an entry at the top of the workspace', () => {
    expect(foldersDownTo('', 'new.ts')).toEqual([]);
    expect(foldersDownTo('', 'a/new.ts')).toEqual(['a']);
  });
});
