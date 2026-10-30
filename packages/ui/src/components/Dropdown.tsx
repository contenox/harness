import React, { useState, useEffect, useRef } from "react";
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

/**
 * Menu / anchored panel. Raised surface, 12px radius, 4px padding, one soft
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeRef.current();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    if (isOpen && !e.currentTarget.contains(e.relatedTarget as Node)) {
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
      {isOpen && (
        <div
          ref={contentRef}
          className={cn(
            "absolute z-50 rounded-xl border border-line bg-raised p-1 text-text shadow-pop",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            "w-max min-w-full max-w-[calc(100vw-2rem)]",
            "max-h-[min(32rem,calc(100vh-4rem))] overflow-y-auto overscroll-contain",
            align === "end" ? "right-0" : "left-0",
            contentClassName,
          )}
          role={options && !children ? "listbox" : undefined}
        >
          {content}
        </div>
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
