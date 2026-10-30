import React, { forwardRef } from "react";
import { cn } from "../utils";

type TabTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

/** Subtle pill tab: selected overlay when active, hover overlay otherwise. */
export const TabTrigger = forwardRef<HTMLButtonElement, TabTriggerProps>(
  ({ active, className, children, ...props }, ref) => (
    <button
      ref={ref}
      role="tab"
      aria-selected={active}
      type="button"
      {...props}
      className={cn(
        "inline-flex h-7 items-center rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-selected text-text"
          : "text-text-muted hover:bg-hover hover:text-text",
        className,
      )}
    >
      {children}
    </button>
  ),
);
TabTrigger.displayName = "TabTrigger";
