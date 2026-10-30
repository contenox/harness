import { cn } from "../utils";
import { ProgressBar } from "./ProgressBar";

export type Status =
  | "planned"
  | "in-progress"
  | "completed"
  | "error"
  | "warning"
  | "info";
export type Size = "sm" | "md" | "lg";

export interface StatusIndicatorProps {
  status: Status;
  label?: string;
  progress?: number;
  size?: Size;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  Status,
  { dot: string; text: string; icon: string }
> = {
  planned: { dot: "bg-text-subtle", text: "text-text-muted", icon: "○" },
  "in-progress": { dot: "bg-warning", text: "text-text-warning", icon: "⟳" },
  completed: { dot: "bg-success", text: "text-text-success", icon: "✓" },
  error: { dot: "bg-error", text: "text-text-error", icon: "✗" },
  warning: { dot: "bg-warning", text: "text-text-warning", icon: "⚠" },
  info: { dot: "bg-accent", text: "text-text-accent", icon: "ℹ" },
};

export function StatusIndicator({
  status,
  label,
  progress,
  size = "md",
  className,
  showIcon = false,
}: StatusIndicatorProps) {
  const cfg = statusConfig[status];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex items-center gap-1.5">
        <span className={cn("size-2 rounded-full", cfg.dot)} />
        {showIcon && <span className={cn("text-xs", cfg.text)}>{cfg.icon}</span>}
      </span>

      <div className="flex-1">
        {label && (
          <p
            className={cn(
              "font-medium",
              cfg.text,
              size === "sm" ? "text-xs" : "text-[13px]",
            )}
          >
            {label}
          </p>
        )}

        {typeof progress === "number" && (
          <ProgressBar
            value={progress}
            palette={
              status === "completed"
                ? "success"
                : status === "error"
                  ? "error"
                  : status === "warning" || status === "in-progress"
                    ? "warning"
                    : "neutral"
            }
            className={size === "sm" ? "h-1" : "h-1.5"}
          />
        )}
      </div>
    </div>
  );
}
