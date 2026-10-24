import { forwardRef, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "../utils";
import { Badge } from "./Badge";
import { Span } from "./Typography";

export type ToolCallStatus = "pending" | "running" | "success" | "error";

export interface ToolCallCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  tool: string;
  title: string;
  status?: ToolCallStatus;
  icon?: React.ReactNode;
  href?: string;
  detail?: React.ReactNode;
  duration?: string;
  statusLabels?: Partial<Record<ToolCallStatus, string>>;
  externalLinkLabel?: string;
  toggleDetailLabel?: string;
}

const statusBadge: Record<ToolCallStatus, { variant: "secondary" | "primary" | "success" | "error"; label: string }> = {
  pending: { variant: "secondary", label: "Pending" },
  running: { variant: "primary", label: "Running" },
  success: { variant: "success", label: "Done" },
  error: { variant: "error", label: "Error" },
};

export const ToolCallCard = forwardRef<HTMLDivElement, ToolCallCardProps>(
  function ToolCallCard(
    {
      className,
      tool,
      title,
      status = "success",
      icon,
      href,
      detail,
      duration,
      statusLabels,
      externalLinkLabel = "Open in external tool",
      toggleDetailLabel = "Toggle detail",
      ...props
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const badge = statusBadge[status];
    const badgeLabel = statusLabels?.[status] ?? badge.label;

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border",
          "border-surface-200 dark:border-dark-surface-500",
          "bg-surface-50 dark:bg-dark-surface-200",
          "text-text dark:text-dark-text",
          "transition-colors",
          className,
        )}
        {...props}
      >

        <div className="flex items-center gap-2 px-3 py-2">
          {icon && (
            <span className="text-text-muted dark:text-dark-text-muted shrink-0">
              {icon}
            </span>
          )}

          <Span
            variant="muted"
            className="shrink-0 font-mono text-xs"
          >
            {tool}
          </Span>

          <Span className="min-w-0 flex-1 truncate text-sm font-medium">
            {title}
          </Span>

          <Badge variant={badge.variant} size="sm">
            {badgeLabel}
          </Badge>

          {duration && (
            <Span variant="muted" className="shrink-0 text-xs tabular-nums">
              {duration}
            </Span>
          )}

          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary dark:text-dark-primary hover:text-primary-600 dark:hover:text-dark-primary-400 shrink-0"
              aria-label={externalLinkLabel}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {detail && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "shrink-0 rounded p-0.5",
                "text-text-muted dark:text-dark-text-muted",
                "hover:bg-surface-100 dark:hover:bg-dark-surface-300",
              )}
              aria-expanded={open}
              aria-label={toggleDetailLabel}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
          )}
        </div>


        {detail && open && (
          <div
            className={cn(
              "border-t px-3 py-2",
              "border-surface-200 dark:border-dark-surface-500",
              "bg-surface-100 dark:bg-dark-surface-300",
              "overflow-auto text-xs font-mono",
              "text-text-muted dark:text-dark-text-muted",
              "max-h-60",
            )}
          >
            {detail}
          </div>
        )}
      </div>
    );
  },
);
