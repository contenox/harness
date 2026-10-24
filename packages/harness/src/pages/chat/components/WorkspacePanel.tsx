import { Button, FileTree, SearchBar, Select, type FileTreeIndicator, type FileTreeNode } from '@contenox/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Filter, Pencil, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RootChip } from '../../../components/workspace/RootChip';
import { WorkspaceBoundaryNotice } from '../../../components/workspace/WorkspaceBoundaryNotice';
import { usePersistentToggle } from '../../../hooks/usePersistentToggle';
import { useWorkspaceAccess } from '../../../hooks/useWorkspaceAccess';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { type UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import { useWorkspaceFind } from '../../../hooks/useWorkspaceFind';
import { workspaceAccessKeys } from '../../../lib/queryKeys';
import type { WorkspaceRoot } from '../../../lib/types';
import { availableFilterTypes, buildTreeFromMatches, type WorkspaceFilterType } from '../lib/workspaceFilter';
import {
  toFileTreeNodes,
  verdictToAccess,
  type AccessLabels,
  type NodeAccess,
  type NodeDecoration,
  type NodeDecorator,
} from '../lib/workspaceTree';

export interface WorkspacePanelProps {
  root: string | null;
  files: UseWorkspaceFilesResult;
  onOpenFile: (path: string) => void;
  selectedFilePath?: string | null;
}

const ACCESS_OPTION_LABEL_KEY: Record<string, string> = {
  allow: 'workspace.legend_allowed',
  approve: 'workspace.legend_approval',
  deny: 'workspace.legend_blocked',
  unreachable: 'workspace.legend_unreachable',
};

function accessDecoration(a: NodeAccess): NodeDecoration {
  const indicators: FileTreeIndicator[] = [];
  if (a.read) {
    indicators.push({ key: 'read', icon: <Eye className="h-3.5 w-3.5" />, status: a.read.status, title: a.read.title });
  }
  if (a.write) {
    indicators.push({ key: 'write', icon: <Pencil className="h-3.5 w-3.5" />, status: a.write.status, title: a.write.title });
  }
  return {
    ...(indicators.length ? { indicators } : {}),
    ...(a.dimmed ? { dimmed: true, title: a.read?.title ?? a.write?.title } : {}),
  };
}

export function WorkspacePanel({ root, files, onOpenFile, selectedFilePath }: WorkspacePanelProps) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const queryClient = useQueryClient();
  const { roots } = useWorkspaceRoots();
  const { agentView, setAgentView, cache, ensureLoaded } = files;

  const handleNodeSelect = useCallback(
    (node: FileTreeNode) => {
      const path = node.path ?? node.id;
      if (node.isDirectory) {
        ensureLoaded(path);
        return;
      }
      onOpenFile(path);
    },
    [ensureLoaded, onOpenFile],
  );

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
  const inputSpec = activeType?.input;
  const filterPlaceholder = inputSpec?.kind === 'text' ? tk(inputSpec.placeholderKey) : '';
  const optionValues = inputSpec?.kind === 'options' ? inputSpec.options : [];
  const query = useMemo(() => activeType?.toQuery(appliedValue) ?? null, [activeType, appliedValue]);
  const filterActive = filterPanel.open && query !== null;

  const findGlobs = useMemo(
    () => (filterActive && query ? (query.globs.length > 0 ? query.globs : ['*']) : []),
    [filterActive, query],
  );
  const find = useWorkspaceFind({
    globs: findGlobs,
    root: root ?? undefined,
  });

  const accessPaths = useMemo(
    () => (filterActive ? find.entries.map(e => e.path) : cachePaths),
    [filterActive, find.entries, cachePaths],
  );
  const access = useWorkspaceAccess({
    root,
    policy: files.hitlPolicyName,
    paths: accessPaths,
    enabled: agentView,
  });

  const decorate = useCallback<NodeDecorator>(
    path => {
      const verdict = access.verdicts.get(path);
      if (!verdict) return undefined;
      return accessDecoration(verdictToAccess(verdict, accessLabels));
    },
    [access.verdicts, accessLabels],
  );

  const baseNodes = useMemo(
    () => toFileTreeNodes(cache, undefined, agentView ? decorate : undefined),
    [cache, agentView, decorate],
  );

  const filteredNodes = useMemo(() => {
    if (!query) return [];
    const refined = query.refine
      ? find.entries.filter(m => query.refine!(m, access.verdicts.get(m.path)))
      : find.entries;
    return buildTreeFromMatches(refined, agentView ? decorate : undefined);
  }, [query, find.entries, agentView, decorate, access.verdicts]);

  const nodes = filterActive ? filteredNodes : baseNodes;

  const handleRefresh = useCallback(() => {
    files.refresh();
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.all });
  }, [files, queryClient]);

  if (!root) return null;

  const isEmptyRoot = !files.rootLoading && !files.error && baseNodes.length === 0;
  const activeRoot: WorkspaceRoot = roots.find(r => r.path === root) ?? { path: root, default: false };

  return (
    <div className="border-surface-200 bg-surface-50 dark:border-dark-surface-600 dark:bg-dark-surface-100 flex h-full w-64 min-w-0 shrink-0 flex-col border-r sm:w-72">
      <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-text dark:text-dark-text truncate text-sm font-medium">{t('workspace.panel_title')}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant={agentView ? 'primary' : 'ghost'}
            palette="neutral"
            size="icon"
            aria-pressed={agentView}
            aria-label={t('workspace.agent_view')}
            title={t('workspace.agent_view')}
            onClick={() => setAgentView(!agentView)}>
            <ShieldCheck className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant={filterPanel.open ? 'primary' : 'ghost'}
            palette="neutral"
            size="icon"
            aria-pressed={filterPanel.open}
            aria-label={t('workspace.filter_toggle')}
            title={t('workspace.filter_toggle')}
            onClick={() => filterPanel.toggle()}>
            <Filter className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('workspace.refresh')}
            onClick={handleRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="border-surface-200 dark:border-dark-surface-600 shrink-0 border-b px-3 py-1.5">
        <RootChip root={activeRoot} />
      </div>

      {filterPanel.open && (
        <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 flex-col gap-1.5 border-b px-3 py-2">
          <Select
            aria-label={t('workspace.filter_type')}
            value={activeType?.id ?? ''}
            onChange={e => {
              setFilterTypeId(e.target.value);
              setFilterValue('');
            }}
            options={filterTypes.map(ft => ({ value: ft.id, label: tk(ft.labelKey) }))}
            className="w-full"
          />
          {inputSpec?.kind === 'options' ? (
            <Select
              aria-label={t('workspace.filter_label')}
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              placeholder={t('workspace.filter_label')}
              options={optionValues.map(o => ({ value: o, label: ACCESS_OPTION_LABEL_KEY[o] ? tk(ACCESS_OPTION_LABEL_KEY[o]) : o }))}
              className="w-full"
            />
          ) : (
            <SearchBar
              aria-label={t('workspace.filter_label')}
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              onClear={() => setFilterValue('')}
              placeholder={filterPlaceholder}
            />
          )}
          {filterActive && find.status === 'searching' && (
            <span className="text-text-muted dark:text-dark-text-muted px-0.5 text-[11px]">
              {t('workspace.filter_searching')}
            </span>
          )}
          {filterActive && find.truncated && (
            <span className="text-text-muted dark:text-dark-text-muted px-0.5 text-[11px]">
              {t('workspace.filter_truncated', { count: find.count })}
            </span>
          )}
        </div>
      )}

      {agentView && (
        <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 flex-col gap-1 border-b px-3 py-1.5 text-[11px] text-text-muted dark:text-dark-text-muted">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3 shrink-0" aria-hidden="true" />
              {t('workspace.access_read')}
            </span>
            <span className="inline-flex items-center gap-1">
              <Pencil className="h-3 w-3 shrink-0" aria-hidden="true" />
              {t('workspace.access_write')}
            </span>
            {access.error ? (
              <span className="text-error-600 dark:text-dark-error-500">{t('workspace.access_error')}</span>
            ) : access.isLoading ? (
              <span>{t('workspace.access_evaluating')}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <LegendItem dotClass="ring-1 ring-inset ring-success-500/60" label={t('workspace.legend_allowed')} />
            <LegendItem dotClass="bg-warning-500 dark:bg-dark-warning-500" label={t('workspace.legend_approval')} />
            <LegendItem dotClass="bg-error-500 dark:bg-dark-error-500" label={t('workspace.legend_blocked')} />
            <LegendItem dotClass="bg-text-muted dark:bg-dark-text-muted opacity-50" label={t('workspace.legend_unreachable')} />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {files.error ? (
          <WorkspaceBoundaryNotice
            message={files.error}
            roots={roots}
            onRetry={handleRefresh}
          />
        ) : null}

        {files.rootLoading && baseNodes.length === 0 ? (
          <span className="text-text-muted dark:text-dark-text-muted block px-1 py-2 text-xs">{t('workspace.loading')}</span>
        ) : isEmptyRoot ? (
          <span className="text-text-muted dark:text-dark-text-muted block px-1 py-2 text-xs">{t('workspace.empty')}</span>
        ) : filterActive ? (
          find.status === 'refusal' || find.status === 'error' ? (
            <span className="text-error-600 dark:text-dark-error-500 block px-1 py-2 text-xs">
              {find.refusalMessage ?? find.errorMessage}
            </span>
          ) : nodes.length === 0 ? (
            <span className="text-text-muted dark:text-dark-text-muted block px-1 py-2 text-xs">
              {find.status === 'searching' ? t('workspace.filter_searching') : t('workspace.filter_no_matches')}
            </span>
          ) : (
            <FileTree
              key={`f:${activeType?.id}:${appliedValue}`}
              nodes={nodes}
              directoryClickMode="expand"
              defaultExpanded={undefined}
              selectedId={selectedFilePath ?? undefined}
              onNodeSelect={handleNodeSelect}
            />
          )
        ) : (
          <FileTree
            key="all"
            nodes={baseNodes}
            directoryClickMode="expand"
            defaultExpanded={new Set<string>()}
            selectedId={selectedFilePath ?? undefined}
            onNodeSelect={handleNodeSelect}
          />
        )}
      </div>
    </div>
  );
}

function LegendItem({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
