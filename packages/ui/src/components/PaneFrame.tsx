import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../utils";
import { IconButton } from "./IconButton";

export type PaneFrameProps = {
  /** Plain title text, or pass `tabs` to replace it. */
  title?: ReactNode;
  /** Tabs slot (e.g. <Tabs .../>); takes the title position. */
  tabs?: ReactNode;
  /** Right side of the header, before the close button. */
  actions?: ReactNode;
  /** Renders a close IconButton when provided. */
  onClose?: () => void;
  closeLabel?: string;
  children?: ReactNode;
  /** Body padding off for edge-to-edge content (editors, terminals). */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
};

/** Right-side pane: 40px header row, scrolling body, left hairline border. */
export function PaneFrame({
  title,
  tabs,
  actions,
  onClose,
  closeLabel = "Close",
  children,
  flush = false,
  className,
  bodyClassName,
}: PaneFrameProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col border-l border-line bg-app text-text",
        className,
      )}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line px-2">
        <div className="flex min-w-0 flex-1 items-center">
          {tabs ?? (
            <span className="truncate px-1 text-[13px] font-medium">{title}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {actions}
          {onClose && (
            <IconButton label={closeLabel} size="sm" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          )}
        </div>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto",
          !flush && "p-3",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
