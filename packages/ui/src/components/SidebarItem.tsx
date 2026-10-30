import type { ElementType, ReactNode } from "react";
import { cn } from "../utils";

export type SidebarItemProps = {
  icon?: ReactNode;
  /** Row label; truncates. */
  children: ReactNode;
  active?: boolean;
  /** Nesting depth; each level indents 12px. */
  level?: number;
  /** Always-visible right-aligned text (e.g. relative time); hidden while `trailing` is revealed. */
  meta?: ReactNode;
  /** Sets aria-expanded, for rows that fold a group open/closed. */
  expanded?: boolean;
  /** Shown on hover / keyboard focus (and always while `active`). */
  trailing?: ReactNode;
  /** Render as another element, e.g. a router `Link` (pass `to`). Default: `a` when href is set, else `button`. */
  as?: ElementType;
  href?: string;
  to?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * 32px sidebar row: icon, truncating label, optional hover-revealed trailing
 * slot (kept outside the main button so it can hold its own buttons).
 */
export function SidebarItem({
  icon,
  children,
  active = false,
  level = 0,
  trailing,
  meta,
  expanded,
  as,
  href,
  to,
  onClick,
  title,
  className,
  disabled,
}: SidebarItemProps) {
  const Tag: ElementType = as ?? (href ? "a" : "button");
  const extra: Record<string, unknown> = {};
  if (Tag === "button") {
    extra.type = "button";
    extra.disabled = disabled;
  }
  if (href) extra.href = href;
  if (to) extra.to = to;

  return (
    <div
      className={cn(
        "group relative flex h-8 items-center rounded-lg text-[13px]",
        active ? "bg-selected text-text" : "text-text-muted hover:bg-hover hover:text-text",
        className,
      )}
    >
      <Tag
        {...extra}
        onClick={onClick}
        title={title}
        aria-current={active ? "page" : undefined}
        aria-expanded={expanded}
        style={{ paddingLeft: 8 + level * 12 }}
        className={cn(
          "flex h-full min-w-0 flex-1 items-center gap-2 rounded-lg pr-2 text-left",
          active && "font-medium",
        )}
      >
        {icon && (
          <span className="flex shrink-0 items-center text-text-muted [&>svg]:size-4">
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {meta && (
          <span
            className={cn(
              "shrink-0 text-xs text-text-subtle",
              trailing && "group-hover:hidden group-focus-within:hidden",
            )}
          >
            {meta}
          </span>
        )}
      </Tag>
      {trailing && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-0.5 pr-1",
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            active && "opacity-100",
          )}
        >
          {trailing}
        </div>
      )}
    </div>
  );
}
