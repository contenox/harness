import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../utils";

export type SidebarSectionProps = {
  /** Small muted header text. */
  title?: ReactNode;
  /** Trailing slot in the header row (e.g. an IconButton "+"). */
  action?: ReactNode;
  /** Header toggles the children when true. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  children?: ReactNode;
  className?: string;
};

export function SidebarSection({
  title,
  action,
  collapsible = false,
  defaultOpen = true,
  children,
  className,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;
  return (
    <section className={cn("flex flex-col gap-0.5", className)}>
      {(title || action) && (
        <div className="group/section flex h-7 items-center justify-between gap-1 px-2">
          {collapsible ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex min-w-0 items-center gap-1 rounded text-[11px] font-medium tracking-[0.02em] text-text-subtle hover:text-text-muted"
            >
              <ChevronRight
                className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")}
                aria-hidden
              />
              <span className="truncate">{title}</span>
            </button>
          ) : (
            <span className="min-w-0 truncate text-[11px] font-medium tracking-[0.02em] text-text-subtle">
              {title}
            </span>
          )}
          {action && <div className="flex shrink-0 items-center">{action}</div>}
        </div>
      )}
      {expanded && <div className="flex flex-col gap-0.5">{children}</div>}
    </section>
  );
}
