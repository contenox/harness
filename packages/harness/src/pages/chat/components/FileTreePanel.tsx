import { Button, EmptyState, FileTree, IconButton, Span, type FileTreeNode } from '@contenox/ui';
import { FilePlus, Filter, FolderPlus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RootChip } from '../../../components/workspace/RootChip';
import { WorkspaceBoundaryNotice } from '../../../components/workspace/WorkspaceBoundaryNotice';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { parentDir } from '../../../lib/workspaceEvents';
import {
  createFile,
  createFolder,
  deletePath,
  foldersDownTo,
  joinPath,
  movePath,
} from '../../../lib/workspaceFileOps';
import { displayRootForPath } from '../../../lib/workspaceRoots';
import { useFileTreeModel } from '../hooks/useFileTreeModel';
import { ROOT_DIR } from '../lib/workspaceTree';
import { AccessLegend } from './AccessLegend';
import { FileTreeFilterBar } from './FileTreeFilterBar';
import { DeleteEntryDialog, PathNameDialog } from './TreeEntryDialogs';
import { TreeEntryMenu } from './TreeEntryMenu';

export interface FileTreePanelProps {
  root: string | null;
  files: UseWorkspaceFilesResult;
  onOpenFile: (path: string) => void;
  selectedFilePath?: string | null;
  /** Column variant: no root chip (the workspace is already named by the column header). */
  compact?: boolean;
  onPathMoved?: (from: string, to: string) => void;
  onPathDeleted?: (path: string) => void;
}

type TreeOp =
  | { kind: 'newFile' | 'newFolder'; dir: string }
  | { kind: 'rename'; path: string; isDirectory: boolean }
  | { kind: 'delete'; path: string; isDirectory: boolean };

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
  onPathMoved,
  onPathDeleted,
}: FileTreePanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roots } = useWorkspaceRoots();
  const { agentView, setAgentView, reloadDir, editor, tree: expansion } = files;
  const { reveal } = expansion;
  const [op, setOp] = useState<TreeOp | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  useEffect(() => {
    if (selectedFilePath) reveal(foldersDownTo(ROOT_DIR, selectedFilePath));
  }, [selectedFilePath, reveal]);

  const startOp = (next: TreeOp) => {
    setOpError(null);
    setOp(next);
  };
  const closeOp = () => {
    if (busy) return;
    setOp(null);
    setOpError(null);
  };

  const runOp = async (value?: string) => {
    if (!root || !op || busy) return;
    setBusy(true);
    setOpError(null);
    const current: TreeOp = op;
    let target = '';
    let result;
    switch (current.kind) {
      case 'newFile':
        target = joinPath(current.dir, value ?? '');
        result = await createFile(root, target);
        break;
      case 'newFolder':
        target = joinPath(current.dir, value ?? '');
        result = await createFolder(root, target);
        break;
      case 'rename':
        target = value ?? current.path;
        result = await movePath(root, current.path, target);
        break;
      case 'delete':
        result = await deletePath(root, current.path, current.isDirectory);
        break;
    }
    setBusy(false);
    if (!result.ok) {
      setOpError(result.status === 409 ? t('tree.exists', { name: target }) : result.message);
      return;
    }
    setOp(null);
    switch (current.kind) {
      case 'newFile':
      case 'newFolder': {
        const folders = foldersDownTo(current.dir, target);
        reloadDir(current.dir);
        folders.forEach(dir => reloadDir(dir));
        if (current.kind === 'newFolder') {
          reveal([...folders, target]);
        } else {
          reveal(folders);
          onOpenFile(target);
        }
        break;
      }
      case 'rename':
        reloadDir(parentDir(current.path));
        reloadDir(parentDir(target));
        editor.moved(current.path, target);
        expansion.moved(current.path, target);
        reveal(foldersDownTo(ROOT_DIR, target));
        onPathMoved?.(current.path, target);
        break;
      case 'delete':
        reloadDir(parentDir(current.path));
        expansion.deleted(current.path);
        for (const open of Object.keys(editor.buffers)) {
          if (open === current.path || open.startsWith(`${current.path}/`)) editor.close(open);
        }
        onPathDeleted?.(current.path);
        break;
    }
  };

  const renderActions = useCallback((node: FileTreeNode) => {
    const path = node.path ?? node.id;
    const isDirectory = node.isDirectory === true;
    return (
      <TreeEntryMenu
        name={node.name}
        isDirectory={isDirectory}
        onNewFile={() => startOp({ kind: 'newFile', dir: path })}
        onNewFolder={() => startOp({ kind: 'newFolder', dir: path })}
        onRename={() => startOp({ kind: 'rename', path, isDirectory })}
        onDelete={() => startOp({ kind: 'delete', path, isDirectory })}
      />
    );
  }, []);
  const model = useFileTreeModel(root, files);
  const { find, access, nodes, baseNodes, filterActive } = model;

  const handleNodeSelect = useCallback(
    (node: FileTreeNode) => {
      if (!node.isDirectory) onOpenFile(node.path ?? node.id);
    },
    [onOpenFile],
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
          expandedIds={expansion.expanded}
          onExpandedChange={expansion.setExpanded}
          selectedId={selectedFilePath ?? undefined}
          onNodeSelect={handleNodeSelect}
          renderActions={renderActions}
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
            label={t('tree.new_file')}
            onClick={() => startOp({ kind: 'newFile', dir: ROOT_DIR })}>
            <FilePlus className="size-4" />
          </IconButton>
          <IconButton
            size="sm"
            label={t('tree.new_folder')}
            onClick={() => startOp({ kind: 'newFolder', dir: ROOT_DIR })}>
            <FolderPlus className="size-4" />
          </IconButton>
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
      <PathNameDialog
        open={op?.kind === 'newFile' || op?.kind === 'newFolder' || op?.kind === 'rename'}
        title={
          op?.kind === 'rename'
            ? t('tree.rename_title')
            : op?.kind === 'newFolder'
              ? t('tree.new_folder')
              : t('tree.new_file')
        }
        label={op?.kind === 'rename' ? t('tree.rename_label') : t('tree.name_label')}
        hint={
          op?.kind === 'rename'
            ? t('tree.rename_hint')
            : op && 'dir' in op && op.dir
              ? t('tree.create_in', { dir: op.dir })
              : t('tree.create_in_root')
        }
        initial={op?.kind === 'rename' ? op.path : ''}
        submitLabel={op?.kind === 'rename' ? t('tree.rename') : t('tree.create')}
        busy={busy}
        error={opError}
        onSubmit={value => void runOp(value)}
        onClose={closeOp}
      />
      <DeleteEntryDialog
        path={op?.kind === 'delete' ? op.path : null}
        isDirectory={op?.kind === 'delete' && op.isDirectory}
        busy={busy}
        error={opError}
        onConfirm={() => void runOp()}
        onClose={closeOp}
      />
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
