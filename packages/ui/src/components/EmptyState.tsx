import { cn } from "../utils";
import { H3, P } from "./Typography";

type EmptyStateVariant = "default" | "error" | "warning" | "success" | "info";

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  orientation?: "vertical" | "horizontal";
  iconSize?: "sm" | "md" | "lg";
  variant?: EmptyStateVariant;
  /** `hero`: large centered headline, for first-run / new-chat screens. */
  size?: "default" | "hero";
  children?: React.ReactNode;
};

const iconTone: Record<EmptyStateVariant, string> = {
  default: "bg-selected text-text-muted",
  info: "bg-selected text-text-muted",
  success: "bg-success/15 text-text-success",
  warning: "bg-warning/15 text-text-warning",
  error: "bg-error/15 text-text-error",
};

/** Quiet, centered empty state: muted icon tile, title, supporting copy, actions. */
export function EmptyState({
  title,
  subtitle,
  description,
  icon,
  className,
  orientation = "vertical",
  iconSize = "md",
  variant = "default",
  size = "default",
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "p-8 text-text",
        orientation === "horizontal"
          ? "flex items-center gap-4 text-left"
          : "text-center",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl",
            iconTone[variant],
            orientation === "horizontal" ? "shrink-0" : "mx-auto mb-4",
            {
              "size-14 text-2xl": iconSize === "lg",
              "size-10 text-xl": iconSize === "md",
              "size-8 text-base": iconSize === "sm",
            },
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <H3
          className={cn(
            size === "hero"
              ? "text-3xl font-semibold tracking-tight"
              : "text-base font-semibold",
          )}
        >
          {title}
        </H3>
        {subtitle && (
          <P variant="muted" className="mt-1 text-[13px]">
            {subtitle}
          </P>
        )}
        {description && (
          <P variant="muted" className="mt-1 text-[13px]">
            {description}
          </P>
        )}
        {children && (
          <div
            className={cn(
              "mt-4 flex flex-col gap-2",
              orientation === "horizontal" ? "items-start" : "items-center",
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
