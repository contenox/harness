import type { FileTreeIndicatorStatus, FileTreeNode } from '@contenox/ui';
import type { DimensionVerdict, PathVerdict } from '../../../lib/workspaceAccess';
import type { WorkspaceFileRef } from './mentions';

export interface AccessLabels {
  read: string;
  write: string;
  unreachable: string;
  actionAllow: string;
  actionApprove: string;
  actionDeny: string;
  reasonRule: string;
  reasonDefault: string;
  format: (dim: string, action: string, reason: string) => string;
}

export interface AxisIndicator {
  status: FileTreeIndicatorStatus;
  title: string;
}

export interface NodeAccess {
  dimmed: boolean;
  read?: AxisIndicator;
  write?: AxisIndicator;
}

function actionLabel(action: DimensionVerdict['action'], labels: AccessLabels): string {
  switch (action) {
    case 'allow':
      return labels.actionAllow;
    case 'approve':
      return labels.actionApprove;
    case 'deny':
      return labels.actionDeny;
  }
}

function reasonLabel(dim: DimensionVerdict, labels: AccessLabels): string {
  return dim.reason === 'matched_rule' ? labels.reasonRule : labels.reasonDefault;
}

function axisIndicator(dimName: string, dim: DimensionVerdict, labels: AccessLabels): AxisIndicator {
  return {
    status: dim.action,
    title: labels.format(dimName, actionLabel(dim.action, labels), reasonLabel(dim, labels)),
  };
}

export function verdictToAccess(verdict: PathVerdict, labels: AccessLabels): NodeAccess {
  if (!verdict.reachable) {
    const marker: AxisIndicator = { status: 'unreachable', title: labels.unreachable };
    return { dimmed: true, read: marker, write: marker };
  }
  return {
    dimmed: false,
    ...(verdict.read ? { read: axisIndicator(labels.read, verdict.read, labels) } : {}),
    ...(verdict.write ? { write: axisIndicator(labels.write, verdict.write, labels) } : {}),
  };
}

export type NodeDecoration = Pick<FileTreeNode, 'indicators' | 'dimmed' | 'title'>;

export type NodeDecorator = (path: string) => NodeDecoration | undefined;

export interface WorkspaceEntry {
  path: string;
  name: string;
  isDirectory: boolean;
}

export type DirCache = Record<string, WorkspaceEntry[] | undefined>;

export const ROOT_DIR = '';

export function toFileTreeNodes(
  cache: DirCache,
  dirPath: string = ROOT_DIR,
  decorate?: NodeDecorator,
): FileTreeNode[] {
  const entries = cache[dirPath];
  if (!entries) return [];
  return entries.map(e => ({
    id: e.path,
    name: e.name,
    path: e.path,
    isDirectory: e.isDirectory,
    children: e.isDirectory ? (cache[e.path] ? toFileTreeNodes(cache, e.path, decorate) : undefined) : undefined,
    ...(decorate?.(e.path) ?? {}),
  }));
}

export function flattenFiles(cache: DirCache): WorkspaceFileRef[] {
  const seen = new Set<string>();
  const out: WorkspaceFileRef[] = [];
  for (const entries of Object.values(cache)) {
    if (!entries) continue;
    for (const e of entries) {
      if (e.isDirectory || seen.has(e.path)) continue;
      seen.add(e.path);
      out.push({ path: e.path, name: e.name });
    }
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}
