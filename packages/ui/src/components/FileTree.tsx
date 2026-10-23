import { forwardRef, useCallback, useState, type ReactNode } from "react";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "../utils";

/**
 * Severity of a single {@link FileTreeIndicator}, which tints its icon.
 */
export type FileTreeIndicatorStatus = "allow" | "approve" | "deny" | "unreachable";

/**
 * A small trailing status icon on a row (e.g. a read or write access marker).
 */
export interface FileTreeIndicator {
  /**
   * Stable id within a node's indicator list (used as the React key).
   */
  key: string;
  /**
   * Icon element to render, e.g. a lucide `<Eye />`.
   */
  icon: ReactNode;
  /**
   * Severity that tints the icon.
   */
  status: FileTreeIndicatorStatus;
  /**
   * Per-indicator tooltip and accessible label (e.g. the localized policy reason).
   */
  title?: string;
}

export interface FileTreeNode {
  /**
   * Unique id for this node.
   */
  id: string;
  /**
   * Display name.
   */
  name: string;
  /**
   * Full path (used for context, not rendering).
   */
  path?: string;
  /**
   * Whether this node is a directory.
   */
  isDirectory?: boolean;
  /**
   * Nested children (only for directories).
   */
  children?: FileTreeNode[];
  /**
   * Trailing status indicators (e.g. read + write access), rendered after the name.
   */
  indicators?: FileTreeIndicator[];
  /**
   * Dims the row to half opacity (e.g. an out-of-boundary / unreachable path).
   */
  dimmed?: boolean;
  /**
   * Optional row tooltip.
   */
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
  /**
   * The tree data.
   */
  nodes: FileTreeNode[];
  /**
   * Currently selected node id.
   */
  selectedId?: string | null;
  /**
   * Called when a file or folder is clicked.
   */
  onNodeSelect?: (node: FileTreeNode) => void;
  /**
   * `expand` (default): directory row toggles open/closed and fires `onNodeSelect`.
   */
  directoryClickMode?: "expand" | "navigate";
  /**
   * Set of node ids that are initially expanded.
   */
  defaultExpanded?: Set<string>;
  /**
   * Depth indentation in px.
   */
  indent?: number;
  initialDepth?: number;
  renderChildren?: (node: FileTreeNode, depth: number) => ReactNode;
}

export const FileTree = forwardRef<HTMLDivElement, FileTreeProps>(
  function FileTree(
    {
      className,
      nodes,
      selectedId,
      onNodeSelect,
      directoryClickMode = "expand",
      defaultExpanded,
      indent = 16,
      initialDepth = 0,
      renderChildren,
      ...props
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        role="tree"
        className={cn("text-sm select-none", className)}
        {...props}
      >
        {nodes.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            depth={initialDepth}
            renderChildren={renderChildren}
            indent={indent}
            selectedId={selectedId}
            onNodeSelect={onNodeSelect}
            directoryClickMode={directoryClickMode}
            defaultExpanded={defaultExpanded}
          />
        ))}
      </div>
    );
  },
);



interface FileTreeItemProps {
  renderChildren?: (node: FileTreeNode, depth: number) => ReactNode;
  node: FileTreeNode;
  depth: number;
  indent: number;
  selectedId?: string | null;
  onNodeSelect?: (node: FileTreeNode) => void;
  directoryClickMode: "expand" | "navigate";
  defaultExpanded?: Set<string>;
}

function FileTreeItem({
  renderChildren,
  node,
  depth,
  indent,
  selectedId,
  onNodeSelect,
  directoryClickMode,
  defaultExpanded,
}: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(
    () => defaultExpanded?.has(node.id) ?? (node.isDirectory === true),
  );

  const isSelected = selectedId === node.id;
  const hasIndicators = !!node.indicators && node.indicators.length > 0;

  const toggleExpand = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const handleRowClick = useCallback(() => {
    if (node.isDirectory && directoryClickMode === "expand") {
      setExpanded((v) => !v);
    }
    onNodeSelect?.(node);
  }, [node, onNodeSelect, directoryClickMode]);

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
    [handleRowClick, node.isDirectory, expanded],
  );

  const rowShellClass = cn(
    "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left",
    "text-text dark:text-dark-text",
    "hover:bg-surface-100 dark:hover:bg-dark-surface-200",
    node.dimmed && "opacity-50",
    isSelected &&
      "bg-primary-50/50 text-primary-700 dark:bg-dark-primary-900/30 dark:text-dark-primary-400",
  );

  return (
    <div role="treeitem" aria-expanded={node.isDirectory ? expanded : undefined}>
      {node.isDirectory && directoryClickMode === "navigate" ? (
        <div className={rowShellClass} style={{ paddingLeft: depth * indent + 8 }} title={node.title}>
          <button
            type="button"
            className="text-text-muted dark:text-dark-text-muted hover:bg-surface-200 dark:hover:bg-dark-surface-300 inline-flex shrink-0 items-center justify-center rounded p-0.5"
            onClick={handleChevronClick}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded && "rotate-90",
              )}
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

      {node.isDirectory && expanded && (node.children || renderChildren) && (
        <div role="group">
          {renderChildren ? renderChildren(node, depth + 1) : node.children?.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              indent={indent}
              selectedId={selectedId}
              onNodeSelect={onNodeSelect}
              directoryClickMode={directoryClickMode}
              defaultExpanded={defaultExpanded}
              renderChildren={renderChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
}
