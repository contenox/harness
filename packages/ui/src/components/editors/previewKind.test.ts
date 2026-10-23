import { describe, expect, it } from 'vitest';
import { previewKind } from './previewKind';

describe('previewKind', () => {
  it('renders markdown files as markdown', () => {
    expect(previewKind('README.md')).toBe('markdown');
    expect(previewKind('docs/notes.markdown')).toBe('markdown');
    expect(previewKind('README.MD')).toBe('markdown');
  });

  it('keeps every text-shaped file on the code viewer', () => {
    expect(previewKind('src/main.go')).toBe('code');
    expect(previewKind('go.mod')).toBe('code');
    expect(previewKind('Makefile')).toBe('code');
    expect(previewKind('.env.example')).toBe('code');
    expect(previewKind('unknown.xyz')).toBe('code');
  });

  it('refuses known binary and media types instead of dumping bytes', () => {
    expect(previewKind('texture.png')).toBe('image');
    expect(previewKind('shot.webp')).toBe('image');
    expect(previewKind('model.glb')).toBe('unsupported');
    expect(previewKind('guide.pdf')).toBe('pdf');
    expect(previewKind('scene.usdc')).toBe('unsupported');
    expect(previewKind('font.woff2')).toBe('unsupported');
  });
});
