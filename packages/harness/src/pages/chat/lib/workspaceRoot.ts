import type { SessionInfo } from '@contenox/acp-client';
import type { WorkspaceRoot } from '../../../lib/types';
import { projectForCwd } from '../../../lib/workspaceRoots';

export function resolveWorkspaceRoot(args: {
  onEmptyChat: boolean;
  stagedRoot: string | undefined;
  /** Project of the most recently updated session; preferred over the default root. */
  recentRoot?: string | null;
  defaultRoot: string | undefined;
  activeSessionCwd: string | null;
}): string | null {
  const { onEmptyChat, stagedRoot, recentRoot, defaultRoot, activeSessionCwd } = args;
  if (!onEmptyChat) return activeSessionCwd;
  if (stagedRoot) return stagedRoot;
  if (recentRoot) return recentRoot;
  return defaultRoot ?? null;
}

const ABSOLUTE_PATH = /^(?:[A-Za-z]:\/|\/)/;
const FILE_URI = /^file:(?:\/\/)?(?:localhost)?/i;
const WINDOWS_DRIVE_PATH = /^\/?[A-Za-z]:\//;

function normalizeRelativePath(value: string): string | null {
  const segments: string[] = [];
  for (const segment of value.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.length > 0 ? segments.join('/') : null;
}

function pathFromFileUrl(url: string): string | null {
  let rest: string;
  try {
    rest = decodeURIComponent(url.replace(FILE_URI, ''));
  } catch {
    return null;
  }
  if (!rest) return null;
  if (WINDOWS_DRIVE_PATH.test(rest)) return rest.replace(/^\//, '');
  if (rest.startsWith('/')) return rest;
  return `//${rest}`;
}

const WINDOWS_SHAPED_PATH = /^(?:[A-Za-z]:\/|\/\/)/;

function foldsCase(base: string, platform: string | undefined): boolean {
  return platform === 'win32' || platform === 'darwin' || WINDOWS_SHAPED_PATH.test(base);
}

export function relativeWorkspacePath(
  path: string,
  root: string | null,
  platform?: string,
): string | null {
  const reported = FILE_URI.test(path) ? pathFromFileUrl(path) : path;
  if (reported === null) return null;

  const target = reported.replace(/\\/g, '/');
  if (!ABSOLUTE_PATH.test(target)) return normalizeRelativePath(target);

  const rootPath = (root ?? '').replace(/\\/g, '/');
  if (!rootPath) return null;

  const base = rootPath.replace(/\/+$/, '');
  if (!base) return normalizeRelativePath(target);

  const baseSegments = base.split('/');
  const targetSegments = target.split('/');
  if (targetSegments.length <= baseSegments.length) return null;

  const sameSegment = foldsCase(base, platform)
    ? (a: string, b: string) =>
        a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase()
    : (a: string, b: string) => a === b;
  if (!baseSegments.every((segment, index) => sameSegment(segment, targetSegments[index]))) {
    return null;
  }
  return normalizeRelativePath(targetSegments.slice(baseSegments.length).join('/'));
}

/** Project (root path) of the most recently updated session that lives in a known project. */
export function mostRecentProjectRoot(
  sessions: readonly Pick<SessionInfo, 'cwd' | 'updatedAt'>[],
  roots: readonly WorkspaceRoot[],
): string | null {
  let best: { root: string; at: number } | null = null;
  for (const s of sessions) {
    const root = projectForCwd(s.cwd, roots);
    if (!root) continue;
    const parsed = s.updatedAt ? Date.parse(s.updatedAt) : NaN;
    const at = Number.isNaN(parsed) ? -1 : parsed;
    if (!best || at > best.at) best = { root: root.path, at };
  }
  return best?.root ?? null;
}
