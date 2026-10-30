import { cn } from "../utils";

/**
 * Badge: fully round pill, subtle neutral or tinted.
 * Legacy variants map as: primary/accent -> accent tint, secondary -> neutral.
 */
type BadgeVariant =
  | "default"
  | "primary"
  | "accent"
  | "success"
  | "error"
  | "warning"
  | "outline"
  | "secondary";

type BadgeSize = "sm" | "md";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-selected text-text",
  secondary: "bg-hover text-text-muted",
  outline: "border border-line-strong bg-transparent text-text-muted",
  primary: "bg-accent/15 text-text-accent",
  accent: "bg-accent/15 text-text-accent",
  success: "bg-success/15 text-text-success",
  error: "bg-error/15 text-text-error",
  warning: "bg-warning/15 text-text-warning",
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-xs",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
