import { cn } from "../utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "line" | "circle";
};

export function Skeleton({
  className,
  variant = "line",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-selected",
        variant === "line" ? "h-4 w-full rounded-md" : "size-8 rounded-full",
        className,
      )}
      {...props}
    />
  );
}
