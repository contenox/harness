import { lazy, Suspense, useEffect, useState, type DragEvent, type ReactNode } from 'react';
import { File as FileIcon, Folder, FolderOpen, X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { cn } from '../../../utils';
import type { AssetAction, AssetActionResult } from '@contenox/acp-client';
import type { SelectedRegion } from './monacoViewShared';
import type { DirCache } from '../lib/workspaceTree';
import type { CanvasFileTab } from './fileCanvasState';
import { workspaceSearch, type DirLister, type SearchMatch } from './workspaceSearch';
import { previewKind } from '../../../components/editors/previewKind';
import { previewViewer } from './previewRegistry';
import { AssetActionToolbar } from './AssetActionToolbar';

const MonacoView = lazy(() => import('./MonacoView'));


const ROOT = '';

export interface TreeEntryRef {
  path: string;
  name: string;
  isDirectory: boolean;
}

export interface FileTreeManagement {
  toolbar: (targetDir: string) => ReactNode;
  rowAction: (entry: TreeEntryRef) => ReactNode;
  onDropFiles: (files: File[], dir: string) => void;
  footer?: ReactNode;
}

export interface FileTreePanelProps {
  cache: DirCache;
  ensureLoaded: (dir: string) => void;
  isLoading: (dir: string) => boolean;
  onOpenFile: (path: string) => void;
  listDir: DirLister;
  manage?: FileTreeManagement;
}

interface TreeContext {
  cache: DirCache;
  ensureLoaded: (dir: string) => void;
  isLoading: (dir: string) => boolean;
  onOpenFile: (path: string) => void;
  openDirs: Set<string>;
  toggleDir: (dir: string) => void;
  manage?: FileTreeManagement;
  dropDir: string | null;
  setDropDir: (dir: string | null) => void;
  selectDir: (dir: string) => void;
}

const PANEL_DROP = '\u0000panel';

function carriesFiles(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

function dropProps(ctx: TreeContext, dir: string, highlight: string = dir) {
  const { manage, setDropDir } = ctx;
  if (manage === undefined) return {};
  return {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setDropDir(highlight);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setDropDir(null);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) manage.onDropFiles(files, dir);
    },
  };
}

function TreeNode({
  dir,
  name,
  depth,
  ctx,
}: {
  dir: string;
  name: string;
  depth: number;
  ctx: TreeContext;
}) {
  const { cache, ensureLoaded, isLoading, onOpenFile, openDirs, toggleDir, manage } = ctx;
  const expanded = openDirs.has(dir);
  const entries = cache[dir] ?? [];
  const droppable = manage !== undefined && name !== '';
  return (
    <>
      <div
        className={cn(
          'flex items-center',
          droppable &&
            ctx.dropDir === dir &&
            'bg-primary-500/15 ring-primary-500 ring-1 ring-inset',
        )}
        {...(droppable ? dropProps(ctx, dir) : {})}>
        <button
          type="button"
          className={cn(
            'text-text-primary dark:text-dark-text-primary flex min-w-0 flex-1 items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10',
          )}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => {
            if (name === '') {
              ctx.selectDir(ROOT);
              return;
            }
            ensureLoaded(dir);
            toggleDir(dir);
            ctx.selectDir(dir);
          }}
          aria-label={name === '' && manage !== undefined ? 'Top level' : undefined}
          aria-expanded={expanded}>
          {name !== '' ? (
            expanded ? (
              <FolderOpen className="text-text-muted dark:text-dark-text-muted size-4 shrink-0" />
            ) : (
              <Folder className="text-text-muted dark:text-dark-text-muted size-4 shrink-0" />
            )
          ) : (
            <span className="text-text-muted dark:text-dark-text-muted w-4" />
          )}
          <span className="truncate font-mono text-xs">
            {name || (manage === undefined ? '' : 'Top level')}
          </span>
          {isLoading(dir) && <span className="text-text-muted dark:text-dark-text-muted">…</span>}
        </button>
        {manage !== undefined &&
          name !== '' &&
          manage.rowAction({ path: dir, name, isDirectory: true })}
      </div>
      {expanded &&
        entries.map(e =>
          e.isDirectory ? (
            <TreeNode key={e.path} dir={e.path} name={e.name} depth={depth + 1} ctx={ctx} />
          ) : (
            <div key={e.path} className="flex items-center">
              <button
                type="button"
                className="text-text-primary dark:text-dark-text-primary flex min-w-0 flex-1 items-center gap-1.5 rounded px-2 py-1 text-left font-mono text-xs hover:bg-black/5 dark:hover:bg-white/10"
                style={{ paddingLeft: `${8 + (depth + 1) * 14}px` }}
                onClick={() => onOpenFile(e.path)}>
                <FileIcon className="text-text-muted dark:text-dark-text-muted size-4 shrink-0" />
                <span className="truncate">{e.name}</span>
              </button>
              {manage !== undefined &&
                manage.rowAction({ path: e.path, name: e.name, isDirectory: false })}
            </div>
          ),
        )}
    </>
  );
}

export function FileTreePanel({
  cache,
  ensureLoaded,
  isLoading,
  onOpenFile,
  listDir,
  manage,
}: FileTreePanelProps) {
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set([ROOT]));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [targetDir, setTargetDir] = useState(ROOT);
  const [dropDir, setDropDir] = useState<string | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const t = window.setTimeout(() => {
      void workspaceSearch(q, listDir)
        .then(hits => {
          setResults(hits);
          setSearching(false);
        })
        .catch((error: unknown) => {
          setSearchError(error instanceof Error ? error.message : String(error));
          setResults(null);
          setSearching(false);
        });
    }, 200);
    return () => window.clearTimeout(t);
  }, [query, listDir]);
  const toggleDir = (dir: string) =>
    setOpenDirs(prev => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  const ctx: TreeContext = {
    cache,
    ensureLoaded,
    isLoading,
    onOpenFile,
    openDirs,
    toggleDir,
    manage,
    dropDir,
    setDropDir,
    selectDir: setTargetDir,
  };
  return (
    <aside
      className={cn(
        'border-surface-200 dark:border-dark-surface-600 flex w-56 shrink-0 flex-col overflow-y-auto border-r sm:w-60',
        manage !== undefined && dropDir === PANEL_DROP && 'ring-primary-500 ring-2 ring-inset',
      )}
      aria-label="Workspace files"
      {...(manage === undefined
        ? {}
        : {
            ...dropProps(ctx, targetDir, PANEL_DROP),
            onDragEnter: (event: DragEvent<HTMLElement>) => {
              if (carriesFiles(event)) setDropDir(PANEL_DROP);
            },
            onDragLeave: (event: DragEvent<HTMLElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropDir(null);
              }
            },
          })}>
      <div className="text-text-muted dark:text-dark-text-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide">
        Workspace
      </div>
      {manage?.toolbar(targetDir)}
      <input
        type="search"
        aria-label="Search files"
        placeholder="Find a file…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="border-surface-300 dark:border-dark-surface-600 bg-surface-50 dark:bg-dark-surface-50 text-text dark:text-dark-text placeholder:text-surface-400 dark:placeholder:text-dark-surface-600 mx-2 mb-2 h-8 rounded-md border px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500"
      />
      {searchError && (
        <div role="alert" className="px-3 py-2 text-sm">
          Search failed: {searchError}
        </div>
      )}
      {results !== null ? (
        <div className="pb-2">
          {searching && (
            <div className="text-text-muted dark:text-dark-text-muted px-3 py-1 text-xs">
              Searching…
            </div>
          )}
          {!searching && results.length === 0 && (
            <div className="text-text-muted dark:text-dark-text-muted px-3 py-1 text-xs">
              No matches
            </div>
          )}
          {results.map(r => (
            <button
              key={r.path}
              type="button"
              onClick={() => {
                onOpenFile(r.path);
                setQuery('');
              }}
              className="text-text-primary dark:text-dark-text-primary flex w-full items-center gap-1.5 truncate rounded px-3 py-1 text-left font-mono text-xs hover:bg-black/5 dark:hover:bg-white/10">
              <FileIcon className="text-text-muted dark:text-dark-text-muted size-3 shrink-0" />
              <span className="truncate">{r.path}</span>
            </button>
          ))}
        </div>
      ) : (
        <TreeNode dir={ROOT} name="" depth={0} ctx={ctx} />
      )}
      {manage?.footer}
    </aside>
  );
}


export function CanvasTabStrip({
  tabs,
  activePath,
  onSelect,
  onClose,
  views,
  showFileTabs = true,
}: {
  tabs: CanvasFileTab[];
  activePath: string;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  views?: { id: string; label: string; active: boolean; onSelect: () => void }[];
  showFileTabs?: boolean;
}) {
  const hasContent = tabs.length > 0 || (views !== undefined && views.length > 0);
  if (!hasContent) return null;
  const tab = (
    path: string,
    label: string,
    active: boolean,
    onClick: () => void,
    closable: boolean,
  ) => (
    <div
      key={path}
      className={cn(
        'flex shrink-0 items-center',
        active ? 'border-primary-500 border-b-2' : 'border-b-2 border-transparent',
      )}>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 text-xs',
          active
            ? 'text-text-primary dark:text-dark-text-primary'
            : 'text-text-muted dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text-primary',
        )}>
        <span className="max-w-40 truncate font-mono">{label}</span>
      </button>
      {closable && (
        <button
          type="button"
          aria-label={`Close ${label}`}
          onClick={() => onClose(path)}
          className="text-text-muted dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text-primary px-1 py-1.5">
          <X className="size-3" />
        </button>
      )}
    </div>
  );
  return (
    <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 items-end gap-1 overflow-x-auto border-b px-2">
      {views !== undefined
        ? views.map(view => tab(view.id, view.label, view.active, view.onSelect, false))
        : tab('', 'Chat', activePath === '', () => onSelect(''), false)}
      {showFileTabs &&
        tabs.map(t => tab(t.path, t.name, activePath === t.path, () => onSelect(t.path), true))}
    </div>
  );
}

export interface FilePaneProps {
  tab: CanvasFileTab;
  onAskSelection?: (path: string, region: SelectedRegion) => void;
  onWrite?: (path: string, content: string) => Promise<void>;
  listAssetActions?: () => Promise<AssetAction[]>;
  runAssetAction?: (action: string, path: string) => Promise<AssetActionResult>;
  onOpenArtifact?: (path: string) => void;
}

export function FilePane({
  tab,
  onAskSelection,
  onWrite,
  listAssetActions,
  runAssetAction,
  onOpenArtifact,
}: FilePaneProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(tab.content);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!editing) setText(tab.content);
  }, [tab.content, editing]);

  if (tab.state === 'loading') {
    return (
      <div className="text-text-muted dark:text-dark-text-muted p-4 text-sm">
        Loading {tab.name}…
      </div>
    );
  }
  if (tab.state === 'error') {
    return (
      <div className="p-4 text-sm text-error dark:text-dark-error" role="alert">
        Could not read {tab.path}: {tab.error}
      </div>
    );
  }

  const dirty = editing && text !== tab.content;
  const save = () => {
    if (!onWrite || !editing) return;
    setStatus(null);
    setError(null);
    void onWrite(tab.path, text)
      .then(() => {
        setStatus('saved');
        window.setTimeout(() => setStatus(null), 2000);
      })
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      });
  };

  const kind = previewKind(tab.path);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
        <span className="text-text-muted dark:text-dark-text-muted min-w-0 flex-1 truncate font-mono text-xs">
          {tab.path}
          {dirty && (
            <span className="text-text-primary dark:text-dark-text-primary"> · unsaved</span>
          )}
          {status === 'saved' && (
            <span className="text-success-500 dark:text-dark-success-500"> · saved</span>
          )}
          {status === 'error' && error && (
            <span className="text-error dark:text-dark-error"> · {error}</span>
          )}
        </span>
        {onWrite && !editing && kind === 'code' && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
        {editing && (
          <>
            <Button variant="outline" size="sm" onClick={save} disabled={!dirty}>
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setText(tab.content);
                setEditing(false);
                setStatus(null);
                setError(null);
              }}>
              Cancel
            </Button>
          </>
        )}
      </div>
      {kind === 'image' && (
        <AssetActionToolbar
          kind={kind}
          path={tab.path}
          listActions={listAssetActions}
          runAction={runAssetAction}
          onArtifact={onOpenArtifact}
        />
      )}
      <Suspense
        fallback={
          <div className="text-text-muted dark:text-dark-text-muted p-4 text-sm">
            Loading viewer…
          </div>
        }>
        {kind === 'code' ? (
          <MonacoView
            value={text}
            path={tab.path}
            className="min-h-0 min-w-0 flex-1"
            readOnly={!editing}
            onChange={setText}
            onAskSelection={
              onAskSelection
                ? (region: SelectedRegion) => onAskSelection(tab.path, region)
                : undefined
            }
          />
        ) : (
          (() => {
            const Viewer = previewViewer(kind);
            return Viewer ? (
              <Viewer content={tab.content} path={tab.path} name={tab.name} />
            ) : (
              <div className="text-text-muted dark:text-dark-text-muted p-4 text-sm">
                No preview for {tab.name} yet — it is a binary or media file. Open it with a local
                tool instead.
              </div>
            );
          })()
        )}
      </Suspense>
    </div>
  );
}
