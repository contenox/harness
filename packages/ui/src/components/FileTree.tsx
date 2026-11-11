import { forwardRef, useCallback, useState, type ReactNode } from "react";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "../utils";

export type FileTreeIndicatorStatus = "allow" | "approve" | "deny" | "unreachable";

export interface FileTreeIndicator {
  key: string;
  icon: ReactNode;
  status: FileTreeIndicatorStatus;
  title?: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path?: string;
  isDirectory?: boolean;
  children?: FileTreeNode[];
  indicators?: FileTreeIndicator[];
  dimmed?: boolean;
  title?: string;
}

const INDICATOR_TINT_CLASS: Record<FileTreeIndicatorStatus, string> = {
  allow: "text-success-500 dark:text-dark-success-500",
  approve: "text-warning-500 dark:text-dark-warning-500",
  deny: "text-error-500 dark:text-dark-error-500",
  unreachable: "text-text-muted dark:text-dark-text-muted",
};

function IndicatorRow({ indicators }: { indicators: FileTreeIndicator[] }) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1 pl-1.5">
      {indicators.map((ind) => (
        <span
          key={ind.key}
          className={cn("inline-flex shrink-0 items-center", INDICATOR_TINT_CLASS[ind.status])}
          title={ind.title}
          role={ind.title ? "img" : undefined}
          aria-label={ind.title || undefined}
          aria-hidden={ind.title ? undefined : true}
        >
          {ind.icon}
        </span>
      ))}
    </span>
  );
}

export interface FileTreeProps extends React.HTMLAttributes<HTMLDivElement> {
  nodes: FileTreeNode[];
  selectedId?: string | null;
  onNodeSelect?: (node: FileTreeNode) => void;
  directoryClickMode?: "expand" | "navigate";
  defaultExpanded?: Set<string>;
  expandedIds?: ReadonlySet<string>;
  onExpandedChange?: (id: string, expanded: boolean) => void;
  indent?: number;
  initialDepth?: number;
  renderChildren?: (node: FileTreeNode, depth: number) => ReactNode;
  renderActions?: (node: FileTreeNode) => ReactNode;
}

export const FileTree = forwardRef<HTMLDivElement, FileTreeProps>(function FileTree(
  {
    className,
    nodes,
    selectedId,
    onNodeSelect,
    directoryClickMode = "expand",
    defaultExpanded,
    expandedIds,
    onExpandedChange,
    indent = 16,
    initialDepth = 0,
    renderChildren,
    renderActions,
    ...props
  },
  ref,
) {
  return (
    <div ref={ref} role="tree" className={cn("text-sm select-none", className)} {...props}>
      {nodes.map((node) => (
        <FileTreeItem
          key={node.id}
          node={node}
          depth={initialDepth}
          renderChildren={renderChildren}
          renderActions={renderActions}
          indent={indent}
          selectedId={selectedId}
          onNodeSelect={onNodeSelect}
          directoryClickMode={directoryClickMode}
          defaultExpanded={defaultExpanded}
          expandedIds={expandedIds}
          onExpandedChange={onExpandedChange}
        />
      ))}
    </div>
  );
});

interface FileTreeItemProps {
  renderChildren?: (node: FileTreeNode, depth: number) => ReactNode;
  renderActions?: (node: FileTreeNode) => ReactNode;
  node: FileTreeNode;
  depth: number;
  indent: number;
  selectedId?: string | null;
  onNodeSelect?: (node: FileTreeNode) => void;
  directoryClickMode: "expand" | "navigate";
  defaultExpanded?: Set<string>;
  expandedIds?: ReadonlySet<string>;
  onExpandedChange?: (id: string, expanded: boolean) => void;
}

function FileTreeItem({
  renderChildren,
  renderActions,
  node,
  depth,
  indent,
  selectedId,
  onNodeSelect,
  directoryClickMode,
  defaultExpanded,
  expandedIds,
  onExpandedChange,
}: FileTreeItemProps) {
  const [ownExpanded, setOwnExpanded] = useState(
    () => defaultExpanded?.has(node.id) ?? node.isDirectory === true,
  );
  const expanded = expandedIds ? expandedIds.has(node.id) : ownExpanded;
  const setExpanded = useCallback(
    (next: boolean) => {
      if (!expandedIds) setOwnExpanded(next);
      onExpandedChange?.(node.id, next);
    },
    [expandedIds, onExpandedChange, node.id],
  );

  const isSelected = selectedId === node.id;
  const hasIndicators = !!node.indicators && node.indicators.length > 0;

  const toggleExpand = useCallback(() => {
    setExpanded(!expanded);
  }, [setExpanded, expanded]);

  const handleRowClick = useCallback(() => {
    if (node.isDirectory && directoryClickMode === "expand") {
      setExpanded(!expanded);
    }
    onNodeSelect?.(node);
  }, [node, onNodeSelect, directoryClickMode, setExpanded, expanded]);

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleExpand();
    },
    [toggleExpand],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleRowClick();
      }
      if (node.isDirectory) {
        if (e.key === "ArrowRight" && !expanded) {
          e.preventDefault();
          setExpanded(true);
        }
        if (e.key === "ArrowLeft" && expanded) {
          e.preventDefault();
          setExpanded(false);
        }
      }
    },
    [handleRowClick, node.isDirectory, expanded, setExpanded],
  );

  const rowShellClass = cn(
    "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left",
    "text-text dark:text-dark-text",
    "hover:bg-surface-100 dark:hover:bg-dark-surface-200",
    node.dimmed && "opacity-50",
    isSelected &&
      "bg-primary-50/50 text-primary-700 dark:bg-dark-primary-900/30 dark:text-dark-primary-400",
  );

  const actions = renderActions?.(node);
  const actionSlot = actions ? (
    <div
      className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      {actions}
    </div>
  ) : null;

  return (
    <div role="treeitem" aria-expanded={node.isDirectory ? expanded : undefined}>
      <div className="group relative">
        {node.isDirectory && directoryClickMode === "navigate" ? (
          <div
            className={rowShellClass}
            style={{ paddingLeft: depth * indent + 8 }}
            title={node.title}
          >
            <button
              type="button"
              className="text-text-muted dark:text-dark-text-muted hover:bg-surface-200 dark:hover:bg-dark-surface-300 inline-flex shrink-0 items-center justify-center rounded p-0.5"
              onClick={handleChevronClick}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <ChevronRight
                className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
              />
            </button>
            <button
              type="button"
              onClick={() => onNodeSelect?.(node)}
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded py-0.5 text-left hover:bg-transparent"
            >
              {expanded ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-warning dark:text-dark-warning" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 text-warning dark:text-dark-warning" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{node.name}</span>
              {hasIndicators && <IndicatorRow indicators={node.indicators!} />}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRowClick}
            onKeyDown={handleKeyDown}
            className={rowShellClass}
            style={{ paddingLeft: depth * indent + 8 }}
            title={node.title}
          >
            {node.isDirectory ? (
              <>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    "text-text-muted dark:text-dark-text-muted",
                    expanded && "rotate-90",
                  )}
                />
                {expanded ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-warning dark:text-dark-warning" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-warning dark:text-dark-warning" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5 shrink-0" />
                <File className="h-4 w-4 shrink-0 text-text-muted dark:text-dark-text-muted" />
              </>
            )}
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{node.name}</span>
            {hasIndicators && <IndicatorRow indicators={node.indicators!} />}
          </button>
        )}
        {actionSlot}
      </div>

      {node.isDirectory && expanded && (node.children || renderChildren) && (
        <div role="group">
          {renderChildren
            ? renderChildren(node, depth + 1)
            : node.children?.map((child) => (
                <FileTreeItem
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  indent={indent}
                  selectedId={selectedId}
                  onNodeSelect={onNodeSelect}
                  directoryClickMode={directoryClickMode}
                  defaultExpanded={defaultExpanded}
                  expandedIds={expandedIds}
                  onExpandedChange={onExpandedChange}
                  renderChildren={renderChildren}
                  renderActions={renderActions}
                />
              ))}
        </div>
      )}
    </div>
  );
}
