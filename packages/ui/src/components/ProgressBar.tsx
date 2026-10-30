import { cn } from "../utils";

type ProgressBarProps = {
  value: number;
  palette?: "neutral" | "success" | "warning" | "primary" | "error";
  className?: string;
};

export function ProgressBar({
  value,
  palette = "neutral",
  className,
}: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn("h-1.5 overflow-hidden rounded-full bg-selected", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300 ease-out", {
          "bg-text-subtle": palette === "neutral",
          "bg-success": palette === "success",
          "bg-warning": palette === "warning",
          "bg-solid": palette === "primary",
          "bg-error": palette === "error",
        })}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
