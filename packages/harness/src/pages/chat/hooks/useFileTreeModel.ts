import type { FileTreeIndicator, FileTreeNode } from '@contenox/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil } from 'lucide-react';
import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistentToggle } from '../../../hooks/usePersistentToggle';
import { useWorkspaceAccess } from '../../../hooks/useWorkspaceAccess';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import { useWorkspaceFind } from '../../../hooks/useWorkspaceFind';
import { workspaceAccessKeys } from '../../../lib/queryKeys';
import { availableFilterTypes, buildTreeFromMatches, type WorkspaceFilterType } from '../lib/workspaceFilter';
import {
  toFileTreeNodes,
  verdictToAccess,
  type AccessLabels,
  type NodeAccess,
  type NodeDecoration,
  type NodeDecorator,
} from '../lib/workspaceTree';

function accessDecoration(a: NodeAccess): NodeDecoration {
  const indicators: FileTreeIndicator[] = [];
  if (a.read) {
    indicators.push({
      key: 'read',
      icon: createElement(Eye, { className: 'size-3.5' }),
      status: a.read.status,
      title: a.read.title,
    });
  }
  if (a.write) {
    indicators.push({
      key: 'write',
      icon: createElement(Pencil, { className: 'size-3.5' }),
      status: a.write.status,
      title: a.write.title,
    });
  }
  return {
    ...(indicators.length ? { indicators } : {}),
    ...(a.dimmed ? { dimmed: true, title: a.read?.title ?? a.write?.title } : {}),
  };
}

/** Tree nodes for the file pane: plain directory cache, or the filtered / access-decorated view. */
export function useFileTreeModel(root: string | null, files: UseWorkspaceFilesResult) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { agentView, cache, refresh } = files;

  const accessLabels = useMemo<AccessLabels>(
    () => ({
      read: t('workspace.access_read'),
      write: t('workspace.access_write'),
      unreachable: t('workspace.access_unreachable'),
      actionAllow: t('workspace.legend_allowed'),
      actionApprove: t('workspace.legend_approval'),
      actionDeny: t('workspace.legend_blocked'),
      reasonRule: t('workspace.access_reason_rule'),
      reasonDefault: t('workspace.access_reason_default'),
      format: (dim, action, reason) => t('workspace.access_tooltip', { dim, action, reason }),
    }),
    [t],
  );

  const cachePaths = useMemo(() => {
    const out: string[] = [];
    for (const entries of Object.values(cache)) {
      if (!entries) continue;
      for (const e of entries) out.push(e.path);
    }
    return out;
  }, [cache]);

  const filterPanel = usePersistentToggle('workspace.filterOpen');
  const filterTypes = useMemo(() => availableFilterTypes({ agentView }), [agentView]);
  const [filterTypeId, setFilterTypeId] = useState(filterTypes[0]?.id ?? 'ext');
  const [filterValue, setFilterValue] = useState('');
  const [appliedValue, setAppliedValue] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setAppliedValue(filterValue), 200);
    return () => clearTimeout(id);
  }, [filterValue]);

  const activeType: WorkspaceFilterType | undefined =
    filterTypes.find(ft => ft.id === filterTypeId) ?? filterTypes[0];
  const query = useMemo(() => activeType?.toQuery(appliedValue) ?? null, [activeType, appliedValue]);
  const filterActive = filterPanel.open && query !== null;

  const findGlobs = useMemo(
    () => (filterActive && query ? (query.globs.length > 0 ? query.globs : ['*']) : []),
    [filterActive, query],
  );
  const find = useWorkspaceFind({ globs: findGlobs, root: root ?? undefined });

  const accessPaths = useMemo(
    () => (filterActive ? find.entries.map(e => e.path) : cachePaths),
    [filterActive, find.entries, cachePaths],
  );
  const access = useWorkspaceAccess({ root, policy: files.hitlPolicyName, paths: accessPaths, enabled: agentView });

  const decorate = useCallback<NodeDecorator>(
    path => {
      const verdict = access.verdicts.get(path);
      return verdict ? accessDecoration(verdictToAccess(verdict, accessLabels)) : undefined;
    },
    [access.verdicts, accessLabels],
  );

  const baseNodes = useMemo(
    () => toFileTreeNodes(cache, undefined, agentView ? decorate : undefined),
    [cache, agentView, decorate],
  );
  const filteredNodes = useMemo<FileTreeNode[]>(() => {
    if (!query) return [];
    const refined = query.refine
      ? find.entries.filter(m => query.refine!(m, access.verdicts.get(m.path)))
      : find.entries;
    return buildTreeFromMatches(refined, agentView ? decorate : undefined);
  }, [query, find.entries, agentView, decorate, access.verdicts]);

  const handleRefresh = useCallback(() => {
    refresh();
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.all });
  }, [refresh, queryClient]);

  const selectFilterType = useCallback((id: string) => {
    setFilterTypeId(id);
    setFilterValue('');
  }, []);

  return {
    baseNodes,
    nodes: filterActive ? filteredNodes : baseNodes,
    filterActive,
    filterOpen: filterPanel.open,
    toggleFilter: filterPanel.toggle,
    filterTypes,
    activeType,
    filterValue,
    setFilterValue,
    appliedValue,
    selectFilterType,
    find,
    access,
    handleRefresh,
  };
}

export type FileTreeModel = ReturnType<typeof useFileTreeModel>;
