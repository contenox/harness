import { forwardRef } from "react";
import { cn } from "../utils";

export type InsetPanelTone = "default" | "muted" | "strip" | "section";

export type InsetPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: InsetPanelTone;
};

export const InsetPanel = forwardRef<HTMLDivElement, InsetPanelProps>(
  function InsetPanel({ className, tone = "default", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "border-line text-text",
          tone === "default" &&
            "flex min-h-0 flex-col overflow-hidden rounded-xl border bg-raised",
          tone === "muted" && "rounded-xl border bg-sidebar",
          tone === "strip" && "flex shrink-0 flex-col border-b bg-sidebar",
          tone === "section" &&
            "flex min-h-0 shrink-0 flex-col border-b bg-sidebar",
          className,
        )}
        {...props}
      />
    );
  },
);

export type InsetPanelHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  density?: "compact" | "comfortable";
};

export const InsetPanelHeader = forwardRef<
  HTMLDivElement,
  InsetPanelHeaderProps
>(function InsetPanelHeader(
  { className, density = "compact", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "shrink-0 border-b border-line px-3",
        density === "compact" ? "py-1.5" : "py-2.5",
        className,
      )}
      {...props}
    />
  );
});

export type InsetPanelBodyProps = React.HTMLAttributes<HTMLDivElement>;

export const InsetPanelBody = forwardRef<HTMLDivElement, InsetPanelBodyProps>(
  function InsetPanelBody({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("min-h-0 flex-1 overflow-hidden px-2 pb-2", className)}
        {...props}
      />
    );
  },
);
