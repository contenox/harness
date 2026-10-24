import { describe, expect, it } from 'vitest';
import { filesUrl } from './useWorkspaceFiles';
import { ROOT_DIR } from '../pages/chat/lib/workspaceTree';

describe('filesUrl', () => {
  const parse = (url: string) => new URLSearchParams(url.split('?')[1]);

  it('builds a raw root listing URL (no filter, no policy — byte-identical under any overlay)', () => {
    const params = parse(filesUrl(ROOT_DIR, '/ws'));
    expect(params.get('path')).toBe('.');
    expect(params.get('root')).toBe('/ws');
    expect(params.get('filter')).toBeNull();
    expect(params.get('policy')).toBeNull();
  });

  it('passes a concrete directory path through unchanged', () => {
    const params = parse(filesUrl('src/lib', '/ws'));
    expect(params.get('path')).toBe('src/lib');
    expect(params.get('root')).toBe('/ws');
  });
});
