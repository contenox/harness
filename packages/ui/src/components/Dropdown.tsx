import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../utils";

export interface DropdownProps {
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  trigger?: React.ReactElement<{ onClick?: React.MouseEventHandler<Element> }>;
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
  contentClassName?: string;
  className?: string;
  align?: "start" | "end";
  /** Open below (default) or above the trigger (e.g. for the composer). */
  side?: "bottom" | "top";
  placeholder?: string;
}

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;
const MAX_PANEL_HEIGHT = 512;

export interface PanelPlacement {
  top: number;
  left: number;
  maxHeight: number;
  side: "bottom" | "top";
}

/**
 * Pure placement of a fixed-position panel next to its trigger: honours the preferred
 * side/align, flips when the other side has more room, and keeps the panel in the viewport.
 */
export function computePanelPlacement(args: {
  anchor: { top: number; bottom: number; left: number; right: number };
  panel: { width: number; height: number };
  viewport: { width: number; height: number };
  side: "bottom" | "top";
  align: "start" | "end";
}): PanelPlacement {
  const { anchor, panel, viewport, side, align } = args;
  const spaceBelow = viewport.height - anchor.bottom - ANCHOR_GAP - VIEWPORT_MARGIN;
  const spaceAbove = anchor.top - ANCHOR_GAP - VIEWPORT_MARGIN;
  const space = (s: "bottom" | "top") => (s === "bottom" ? spaceBelow : spaceAbove);
  const other = side === "bottom" ? "top" : "bottom";
  const chosen = panel.height > space(side) && space(other) > space(side) ? other : side;
  const maxHeight = Math.max(96, Math.min(MAX_PANEL_HEIGHT, space(chosen)));
  const height = Math.min(panel.height, maxHeight);
  const top = chosen === "bottom" ? anchor.bottom + ANCHOR_GAP : anchor.top - ANCHOR_GAP - height;
  const rawLeft = align === "end" ? anchor.right - panel.width : anchor.left;
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rawLeft, viewport.width - panel.width - VIEWPORT_MARGIN),
  );
  return { top: Math.max(VIEWPORT_MARGIN, top), left, maxHeight, side: chosen };
}

/**
 * Menu / anchored panel. The panel is portaled to document.body with fixed positioning, so
 * overflow-hidden ancestors cannot clip it. Raised surface, 12px radius, 4px padding, one soft
 * shadow. Use `DropdownItem` for rows; any other content is allowed
 * (see `Popover`).
 */
export function Dropdown({
  isOpen: controlledOpen,
  onToggle,
  trigger,
  options,
  value,
  onChange,
  children,
  contentClassName,
  className,
  align = "start",
  side = "bottom",
  placeholder = "Select",
}: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [placement, setPlacement] = useState<PanelPlacement | null>(null);

  const openerRef = useRef<HTMLElement | null>(null);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    if (next && !isOpen) {
      openerRef.current = document.activeElement as HTMLElement | null;
    }
    if (!isControlled) setInternalOpen(next);
    onToggle?.(next);
  };

  const toggle = () => setOpen(!isOpen);
  const close = () => setOpen(false);

  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !contentRef.current?.contains(target)
      ) {
        closeRef.current();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPlacement(null);
      return;
    }
    const place = () => {
      const anchorEl = dropdownRef.current;
      const panelEl = contentRef.current;
      if (!anchorEl || !panelEl) return;
      const r = anchorEl.getBoundingClientRect();
      const next = computePanelPlacement({
        anchor: r,
        panel: { width: panelEl.offsetWidth, height: panelEl.scrollHeight + 2 },
        viewport: {
          width: document.documentElement.clientWidth,
          height: window.innerHeight,
        },
        side,
        align,
      });
      setPlacement((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.maxHeight === next.maxHeight &&
        prev.side === next.side
          ? prev
          : next,
      );
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    const ro =
      typeof ResizeObserver !== "undefined" && contentRef.current
        ? new ResizeObserver(place)
        : null;
    if (ro && contentRef.current) ro.observe(contentRef.current);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      ro?.disconnect();
    };
  }, [isOpen, side, align]);

  const itemElements = () =>
    Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"], [role="menuitem"], button, a[href]',
      ) ?? [],
    );

  const focusItem = (target: "first" | "last" | 1 | -1) => {
    const items = itemElements();
    if (items.length === 0) return;
    if (target === "first") {
      (
        items.find((el) => el.getAttribute("aria-selected") === "true") ??
        items[0]
      ).focus();
      return;
    }
    if (target === "last") {
      items[items.length - 1].focus();
      return;
    }
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      current === -1 ? 0 : (current + target + items.length) % items.length;
    items[next].focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        if (isOpen) {
          e.stopPropagation();
          close();
          openerRef.current?.focus();
        }
        break;
      case "ArrowDown":
      case "ArrowUp": {
        // Let text fields inside popovers keep their caret keys.
        const t = e.target as HTMLElement;
        if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && isOpen)) break;
        e.preventDefault();
        if (!isOpen) {
          setOpen(true);
          requestAnimationFrame(() =>
            focusItem(e.key === "ArrowDown" ? "first" : "last"),
          );
        } else {
          focusItem(e.key === "ArrowDown" ? 1 : -1);
        }
        break;
      }
      case "Home":
        if (isOpen && (e.target as HTMLElement).tagName !== "INPUT") {
          e.preventDefault();
          focusItem("first");
        }
        break;
      case "End":
        if (isOpen && (e.target as HTMLElement).tagName !== "INPUT") {
          e.preventDefault();
          focusItem("last");
        }
        break;
      case "Tab":
        if (isOpen) close();
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (
      isOpen &&
      !e.currentTarget.contains(next) &&
      !contentRef.current?.contains(next)
    ) {
      close();
    }
  };

  const selectOption = (optionValue: string) => {
    onChange?.(optionValue);
    close();
    openerRef.current?.focus();
  };

  const triggerElement = trigger ? (
    React.cloneElement(trigger, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        trigger.props.onClick?.(e);
        toggle();
      },
      "aria-haspopup": options ? "listbox" : true,
      "aria-expanded": isOpen,
    } as React.HTMLAttributes<HTMLElement>)
  ) : options ? (
    <button
      type="button"
      onClick={toggle}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      className={cn(
        "inline-flex h-8 items-center justify-between gap-2 rounded-lg border border-line-strong bg-raised px-3 text-[13px] text-text",
        "hover:bg-hover",
      )}
    >
      <span>{options.find((opt) => opt.value === value)?.label || placeholder}</span>
      <ChevronDown className="size-4 text-text-subtle" />
    </button>
  ) : null;

  const content = children
    ? children
    : options
      ? options.map((option) => (
          <DropdownItem
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            selected={option.value === value}
            onClick={() => selectOption(option.value)}
          >
            {option.label}
          </DropdownItem>
        ))
      : null;

  return (
    <div
      className={cn("relative", className)}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {triggerElement}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={contentRef}
            className={cn(
              "fixed z-[60] rounded-xl border border-line bg-raised p-1 text-text shadow-pop",
              "w-max min-w-[var(--anchor-w)] max-w-[calc(100vw-2rem)]",
              "overflow-y-auto overscroll-contain",
              contentClassName,
            )}
            style={{
              top: placement?.top ?? 0,
              left: placement?.left ?? 0,
              maxHeight: placement?.maxHeight ?? MAX_PANEL_HEIGHT,
              ["--anchor-w" as string]: `${dropdownRef.current?.offsetWidth ?? 0}px`,
              visibility: placement ? "visible" : "hidden",
            }}
            data-side={placement?.side ?? side}
            role={options && !children ? "listbox" : undefined}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  );
}

export type DropdownItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
  /** Shows a trailing check and selected overlay. */
  selected?: boolean;
  /** Destructive row: error text. */
  danger?: boolean;
  /** Trailing hint (e.g. a shortcut). */
  trailing?: React.ReactNode;
};

/** Menu row: 32px, 8px radius, hover overlay. */
export const DropdownItem = React.forwardRef<HTMLButtonElement, DropdownItemProps>(
  function DropdownItem(
    { icon, selected, danger, trailing, className, children, type = "button", role = "menuitem", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        role={role}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px]",
          "hover:bg-hover focus-visible:bg-hover disabled:pointer-events-none disabled:opacity-50",
          selected && "bg-selected",
          danger ? "text-text-error" : "text-text",
          className,
        )}
        {...props}
      >
        {icon && <span className="flex shrink-0 items-center text-text-muted">{icon}</span>}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {trailing && <span className="shrink-0 text-xs text-text-subtle">{trailing}</span>}
        {selected && !trailing && <Check className="size-3.5 shrink-0 text-text-muted" />}
      </button>
    );
  },
);

export function DropdownLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.02em] text-text-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn("-mx-1 my-1 h-px bg-line", className)} />;
}
