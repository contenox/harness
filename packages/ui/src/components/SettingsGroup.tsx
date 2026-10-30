import { ChevronRight } from "lucide-react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../utils";
import { rovingTarget } from "./roving";

export type SettingsGroupProps = {
  /** Small caption above the group (rendered uppercase via CSS). */
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

const HEADER_ATTR = "data-settings-row-header";

/**
 * Titled list of rows inside one hairline container. Row headers form a
 * keyboard group: ArrowUp/ArrowDown move between them, Home/End jump.
 */
export function SettingsGroup({ title, children, className }: SettingsGroupProps) {
  const titleId = useId();

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (!target.hasAttribute(HEADER_ATTR)) return;
    const root = e.currentTarget;
    const headers = Array.from(
      root.querySelectorAll<HTMLButtonElement>(`[${HEADER_ATTR}]`),
    ).filter((h) => !h.disabled && h.closest("[data-settings-group]") === root);
    const index = headers.indexOf(target as HTMLButtonElement);
    if (index < 0) return;
    const next = rovingTarget(e.key, index, headers.length, { orientation: "vertical" });
    if (next === null) return;
    e.preventDefault();
    headers[next]?.focus();
  }

  return (
    <section aria-labelledby={title ? titleId : undefined} className={cn("flex flex-col", className)}>
      {title && (
        <h3
          id={titleId}
          className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-subtle"
        >
          {title}
        </h3>
      )}
      <div
        data-settings-group
        onKeyDown={onKeyDown}
        className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised"
      >
        {children}
      </div>
    </section>
  );
}

export type SettingsRowProps = {
  icon?: ReactNode;
  title: ReactNode;
  /** One line, truncated. */
  description?: ReactNode;
  /** Status or action shown at the end of the header (before the chevron). */
  trailing?: ReactNode;
  /** Controlled expanded state. Omit for uncontrolled. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Revealed body. Rows without a body are not expandable. */
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
};

/** One row of a SettingsGroup; expands to reveal `children` when it has any. */
export function SettingsRow({
  icon,
  title,
  description,
  trailing,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  children,
  disabled = false,
  className,
}: SettingsRowProps) {
  const uid = useId();
  const headerId = `${uid}-header`;
  const bodyId = `${uid}-body`;
  const [internal, setInternal] = useState(defaultExpanded);
  const hasBody = children !== undefined && children !== null && children !== false;
  const expanded = hasBody && (expandedProp ?? internal);

  function toggle() {
    const next = !expanded;
    if (expandedProp === undefined) setInternal(next);
    onExpandedChange?.(next);
  }

  const content = (
    <>
      {icon && (
        <span aria-hidden className="flex size-5 shrink-0 items-center justify-center text-text-muted [&>svg]:size-5">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium text-text">{title}</span>
        {description && <span className="truncate text-xs text-text-muted">{description}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2 text-xs text-text-muted">{trailing}</span>}
      {hasBody && (
        <ChevronRight
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-text-subtle transition-transform duration-200 motion-reduce:transition-none",
            expanded && "rotate-90",
          )}
        />
      )}
    </>
  );

  const headerClasses = "flex w-full items-center gap-3 px-4 py-3 text-left";

  return (
    <div data-expanded={expanded || undefined} className={cn(disabled && "opacity-50", className)}>
      {hasBody ? (
        <button
          type="button"
          id={headerId}
          {...{ [HEADER_ATTR]: "" }}
          aria-expanded={expanded}
          aria-controls={bodyId}
          disabled={disabled}
          onClick={toggle}
          className={cn(
            headerClasses,
            "transition-colors hover:bg-hover disabled:pointer-events-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60",
          )}
        >
          {content}
        </button>
      ) : (
        <div className={headerClasses}>{content}</div>
      )}
      {hasBody && (
        <div
          className={cn(
            "grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none",
            expanded ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
          )}
        >
          <div
            id={bodyId}
            role="region"
            aria-labelledby={headerId}
            inert={!expanded}
            className="min-h-0 overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
