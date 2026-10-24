import type { FileTreeNode } from '@contenox/ui';
import type { PathVerdict } from '../../../lib/workspaceAccess';
import type { WorkspaceFindMatch } from '../../../lib/workspaceFind';
import type { NodeDecorator } from './workspaceTree';

export type FilterInput =
  | { kind: 'text'; placeholderKey: string }
  | { kind: 'options'; options: string[] };

export interface FindQuery {
  globs: string[];
  refine?: (match: WorkspaceFindMatch, verdict?: PathVerdict) => boolean;
}

export interface WorkspaceFilterType {
  id: string;
  labelKey: string;
  input: FilterInput;
  appliesTo?: (ctx: { agentView: boolean }) => boolean;
  toQuery: (value: string) => FindQuery | null;
}

function tokens(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function axisMatches(
  verdict: PathVerdict | undefined,
  dimension: 'read' | 'write',
  value: string,
): boolean {
  if (!verdict) return false;
  if (value === 'unreachable') return !verdict.reachable;
  if (!verdict.reachable) return false;
  return verdict[dimension]?.action === value;
}

const ACCESS_AXIS_OPTIONS = ['allow', 'approve', 'deny', 'unreachable'];

export const WORKSPACE_FILTER_TYPES: WorkspaceFilterType[] = [
  {
    id: 'ext',
    labelKey: 'workspace.filter_type_ext',
    input: { kind: 'text', placeholderKey: 'workspace.filter_placeholder_ext' },
    toQuery: value => {
      const exts = tokens(value)
        .map(s => s.replace(/^[*.]+/, '').toLowerCase())
        .filter(Boolean);
      if (exts.length === 0) return null;
      return { globs: exts.map(ext => `*.${ext}`) };
    },
  },
  {
    id: 'glob',
    labelKey: 'workspace.filter_type_glob',
    input: { kind: 'text', placeholderKey: 'workspace.filter_placeholder_glob' },
    toQuery: value => {
      const globs = tokens(value);
      if (globs.length === 0) return null;
      return { globs };
    },
  },
  {
    id: 'name',
    labelKey: 'workspace.filter_type_name',
    input: { kind: 'text', placeholderKey: 'workspace.filter_placeholder_name' },
    toQuery: value => {
      const v = value.trim();
      if (!v) return null;
      return { globs: [`*${v}*`] };
    },
  },
  {
    id: 'access_read',
    labelKey: 'workspace.filter_type_access_read',
    input: { kind: 'options', options: ACCESS_AXIS_OPTIONS },
    appliesTo: ({ agentView }) => agentView,
    toQuery: value => {
      const v = value.trim();
      if (!v) return null;
      return { globs: ['*'], refine: (_m, verdict) => axisMatches(verdict, 'read', v) };
    },
  },
  {
    id: 'access_write',
    labelKey: 'workspace.filter_type_access_write',
    input: { kind: 'options', options: ACCESS_AXIS_OPTIONS },
    appliesTo: ({ agentView }) => agentView,
    toQuery: value => {
      const v = value.trim();
      if (!v) return null;
      return { globs: ['*'], refine: (_m, verdict) => axisMatches(verdict, 'write', v) };
    },
  },
];

export function filterTypeById(id: string): WorkspaceFilterType | undefined {
  return WORKSPACE_FILTER_TYPES.find(t => t.id === id);
}

export function availableFilterTypes(ctx: { agentView: boolean }): WorkspaceFilterType[] {
  return WORKSPACE_FILTER_TYPES.filter(t => !t.appliesTo || t.appliesTo(ctx));
}

interface DirBuild {
  dirs: Map<string, DirBuild>;
  files: FileTreeNode[];
}

function serializeDir(dir: DirBuild, prefix: string): FileTreeNode[] {
  const dirNodes: FileTreeNode[] = [];
  for (const [name, child] of dir.dirs) {
    const path = prefix ? `${prefix}/${name}` : name;
    dirNodes.push({ id: path, name, path, isDirectory: true, children: serializeDir(child, path) });
  }
  dirNodes.sort((a, b) => a.name.localeCompare(b.name));
  const fileNodes = [...dir.files].sort((a, b) => a.name.localeCompare(b.name));
  return [...dirNodes, ...fileNodes];
}

export function buildTreeFromMatches(
  matches: readonly WorkspaceFindMatch[],
  decorate?: NodeDecorator,
): FileTreeNode[] {
  const root: DirBuild = { dirs: new Map(), files: [] };
  for (const m of matches) {
    const parts = m.path.split('/').filter(Boolean);
    if (parts.length === 0) continue;
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      let child = cur.dirs.get(parts[i]);
      if (!child) {
        child = { dirs: new Map(), files: [] };
        cur.dirs.set(parts[i], child);
      }
      cur = child;
    }
    cur.files.push({
      id: m.path,
      name: parts[parts.length - 1],
      path: m.path,
      isDirectory: false,
      ...(decorate?.(m.path) ?? {}),
    });
  }
  return serializeDir(root, '');
}
