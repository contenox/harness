import type { TranslationKey } from '../i18n';
import type { MissionChangeStatus, MissionChangedFile } from './types';


export const CHANGE_STATUS_BADGE_VARIANT: Record<
  MissionChangeStatus,
  'success' | 'warning' | 'error'
> = {
  added: 'success',
  modified: 'warning',
  deleted: 'error',
};

export const CHANGE_STATUS_LABEL_KEY: Record<MissionChangeStatus, TranslationKey> = {
  added: 'changes.status_added',
  modified: 'changes.status_modified',
  deleted: 'changes.status_deleted',
};

export function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

export function dirname(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx <= 0 ? '' : trimmed.slice(0, idx);
}

const EXT_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  go: 'go',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  c: 'c',
  h: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  sql: 'sql',
  xml: 'xml',
  dockerfile: 'dockerfile',
};

export function languageForPath(path: string): string {
  const name = basename(path).toLowerCase();
  if (name === 'dockerfile') return 'dockerfile';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return 'plaintext';
  return EXT_LANGUAGE[name.slice(dot + 1)] ?? 'plaintext';
}

export function matchChangedFile(
  files: readonly MissionChangedFile[],
  relPath: string,
  root?: string,
): MissionChangedFile | undefined {
  const rel = relPath.replace(/^\.?\/+/, '');
  if (root) {
    const joined = `${root.replace(/\/+$/, '')}/${rel}`;
    const exact = files.find(f => f.path === joined);
    if (exact) return exact;
  }
  return files.find(f => f.path === rel || f.path.endsWith(`/${rel}`));
}
