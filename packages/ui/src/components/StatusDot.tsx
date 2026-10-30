import { cn } from "../utils";

export type StatusDotStatus =
  | "available"
  | "checking"
  | "attention"
  | "unavailable"
  | "unknown";

export type StatusDotProps = {
  status: StatusDotStatus;
  /** Visible text next to the dot. Without it, pass `aria-label`. */
  label?: string;
  /** Accessible name when there is no visible `label`. */
  "aria-label"?: string;
  className?: string;
};

const dotClasses: Record<StatusDotStatus, string> = {
  available: "bg-success",
  // Pulses only when the user has not asked for reduced motion.
  checking: "bg-text-subtle motion-safe:animate-pulse",
  attention: "bg-warning",
  unavailable: "bg-error",
  unknown: "border border-text-subtle bg-transparent",
};

/**
 * Compact connection state: a small dot with an optional label. Use it where a
 * row only needs a state glyph; StatusIndicator is for task progress with a
 * progress bar and a different status vocabulary.
 */
export function StatusDot({ status, label, "aria-label": ariaLabel, className }: StatusDotProps) {
  const dot = (
    <span
      data-status={status}
      aria-hidden={label ? true : undefined}
      role={label ? undefined : "img"}
      aria-label={label ? undefined : ariaLabel}
      className={cn("inline-block size-2 shrink-0 rounded-full", dotClasses[status])}
    />
  );
  if (!label && !ariaLabel) return dot;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-text-muted", className)}>
      {dot}
      {label}
    </span>
  );
}
