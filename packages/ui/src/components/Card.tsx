import React, { forwardRef } from "react";
import { cn } from "../utils";

type CardLayout = "default" | "space-between";

type StatusBorder = "default" | "success" | "error" | "warning" | "info";

/**
 * Card: raised surface, 1px border, 12px radius, flat.
 * Variants: default/filled/surface/bordered all render the raised card
 * (kept for compatibility); `error` is a tinted card; `dotted` is a quiet
 * dotted-grid background. `statusBorder` is rendered as a thin tinted left edge.
 */
type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "filled" | "surface" | "error" | "bordered" | "dotted";
  layout?: CardLayout;
  statusBorder?: StatusBorder;
  /** Hover treatment for clickable cards (border + overlay only, no motion). */
  interactive?: boolean;
};

const statusBorderStyles: Record<StatusBorder, string> = {
  default: "border-l-2 border-l-line-strong",
  success: "border-l-2 border-l-success",
  error: "border-l-2 border-l-error",
  warning: "border-l-2 border-l-warning",
  info: "border-l-2 border-l-accent",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      layout = "default",
      statusBorder,
      interactive = false,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border p-4 text-text transition-colors",
          variant === "error"
            ? "border-error/25 bg-error/10"
            : "border-line bg-raised",
          variant === "bordered" && "border-line-strong",
          variant === "dotted" &&
            "bg-sidebar bg-dot-pattern [--dot-gap:18px]",
          interactive && "cursor-pointer hover:border-line-strong hover:bg-hover",
          layout === "space-between" && "flex items-center justify-between",
          statusBorder && statusBorderStyles[statusBorder],
          className,
        )}
        {...props}
      />
    );
  },
);

Card.displayName = "Card";
