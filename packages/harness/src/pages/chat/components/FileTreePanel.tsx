import { Button, EmptyState, FileTree, IconButton, Span, type FileTreeNode } from '@contenox/ui';
import { Filter, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RootChip } from '../../../components/workspace/RootChip';
import { WorkspaceBoundaryNotice } from '../../../components/workspace/WorkspaceBoundaryNotice';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { displayRootForPath } from '../../../lib/workspaceRoots';
import { useFileTreeModel } from '../hooks/useFileTreeModel';
import { AccessLegend } from './AccessLegend';
import { FileTreeFilterBar } from './FileTreeFilterBar';

export interface FileTreePanelProps {
  root: string | null;
  files: UseWorkspaceFilesResult;
  onOpenFile: (path: string) => void;
  selectedFilePath?: string | null;
  /** Column variant: no root chip (the workspace is already named by the column header). */
  compact?: boolean;
}

const NO_EXPANDED = new Set<string>();

function TreeMessage({ children, error = false }: { children: string | null; error?: boolean }) {
  return (
    <Span
      variant="muted"
      className={error ? 'text-text-error block px-1 py-2 text-xs' : 'block px-1 py-2 text-xs'}>
      {children}
    </Span>
  );
}

/** Project file tree: IconButton toolbar (agent view, filter, refresh), root chip, filter bar, tree. */
export function FileTreePanel({
  root,
  files,
  onOpenFile,
  selectedFilePath,
  compact = false,
}: FileTreePanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roots } = useWorkspaceRoots();
  const { agentView, setAgentView, ensureLoaded } = files;
  const model = useFileTreeModel(root, files);
  const { find, access, nodes, baseNodes, filterActive } = model;

  const handleNodeSelect = useCallback(
    (node: FileTreeNode) => {
      const path = node.path ?? node.id;
      if (node.isDirectory) ensureLoaded(path);
      else onOpenFile(path);
    },
    [ensureLoaded, onOpenFile],
  );

  if (!root) return null;
  const isEmptyRoot = !files.rootLoading && !files.error && baseNodes.length === 0;

  const tree = () => {
    if (files.rootLoading && baseNodes.length === 0)
      return <TreeMessage>{t('workspace.loading')}</TreeMessage>;
    if (isEmptyRoot) {
      const reveal = window.contenoxDesktop?.revealPath;
      return (
        <EmptyState
          title={t('workspace.empty')}
          description={root}
          className="px-3 py-6 [&_p]:break-all">
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate('/projects')}>
              {t('workspace.empty_switch_project')}
            </Button>
            {reveal && (
              <Button type="button" variant="ghost" size="sm" onClick={() => void reveal(root)}>
                {t('workspace.empty_open_folder')}
              </Button>
            )}
          </div>
        </EmptyState>
      );
    }
    if (!filterActive) {
      return (
        <FileTree
          key="all"
          nodes={baseNodes}
          directoryClickMode="expand"
          defaultExpanded={NO_EXPANDED}
          selectedId={selectedFilePath ?? undefined}
          onNodeSelect={handleNodeSelect}
        />
      );
    }
    if (find.status === 'refusal' || find.status === 'error') {
      return <TreeMessage error>{find.refusalMessage ?? find.errorMessage ?? null}</TreeMessage>;
    }
    if (nodes.length === 0) {
      return (
        <TreeMessage>
          {find.status === 'searching'
            ? t('workspace.filter_searching')
            : t('workspace.filter_no_matches')}
        </TreeMessage>
      );
    }
    return (
      <FileTree
        key={`f:${model.activeType?.id}:${model.appliedValue}`}
        nodes={nodes}
        directoryClickMode="expand"
        selectedId={selectedFilePath ?? undefined}
        onNodeSelect={handleNodeSelect}
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <div
        className={`border-line flex shrink-0 items-center gap-2 border-b px-3 py-1.5 ${compact ? 'justify-end' : 'justify-between'}`}>
        {!compact && <RootChip root={displayRootForPath(root, roots)} />}
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            size="sm"
            label={t('workspace.agent_view')}
            active={agentView}
            onClick={() => setAgentView(!agentView)}>
            <ShieldCheck className="size-4" />
          </IconButton>
          <IconButton
            size="sm"
            label={t('workspace.filter_toggle')}
            active={model.filterOpen}
            onClick={model.toggleFilter}>
            <Filter className="size-4" />
          </IconButton>
          <IconButton size="sm" label={t('workspace.refresh')} onClick={model.handleRefresh}>
            <RefreshCw className="size-4" />
          </IconButton>
        </div>
      </div>
      {model.filterOpen && <FileTreeFilterBar model={model} />}
      {agentView && <AccessLegend error={!!access.error} evaluating={access.isLoading} />}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {files.error ? (
          <WorkspaceBoundaryNotice
            message={files.error}
            roots={roots}
            onRetry={model.handleRefresh}
          />
        ) : null}
        {tree()}
      </div>
    </div>
  );
}
