import { basename } from './fileLanguage';

/**
 * PreviewKind identifies the viewer suitable for a workspace asset.
 */
export type PreviewKind = 'code' | 'markdown' | 'image' | 'pdf' | 'unsupported';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif']);

const NON_TEXT_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'gif',
  'gltf',
  'glb',
  'fbx',
  'obj',
  'stl',
  'usd',
  'usda',
  'usdc',
  'ktx',
  'ktx2',
  'basis',
  'zip',
  'gz',
  'tar',
  'wasm',
  'woff',
  'woff2',
  'ttf',
]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * previewKind selects a viewer from a workspace path without inspecting its contents.
 */
export function previewKind(path: string): PreviewKind {
  const name = basename(path).toLowerCase();
  const ext = extensionOf(name);
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (NON_TEXT_EXTENSIONS.has(ext)) return 'unsupported';
  return 'code';
}
