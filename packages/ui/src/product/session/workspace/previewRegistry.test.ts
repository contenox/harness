import { describe, expect, it } from 'vitest';
import { previewableKinds, previewViewer } from './previewRegistry';

describe('previewRegistry', () => {
  it('registers a viewer for every rendered kind', () => {
    expect(previewableKinds()).toEqual(['image', 'markdown', 'pdf']);
    for (const kind of previewableKinds()) {
      expect(previewViewer(kind), kind).not.toBeNull();
    }
  });

  it('leaves code and unsupported outside the read-only pipe', () => {
    expect(previewViewer('code')).toBeNull();
    expect(previewViewer('unsupported')).toBeNull();
  });
});
