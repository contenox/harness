import { forwardRef } from "react";
import { cn } from "../utils";

/**
 * Panel: lightweight container. `surface`/`bordered` are bordered containers
 * (12px radius); status variants are 10% tinted. Deprecated: `raised`
 * (now plain), `gradient` (now solid inverted), kept for compatibility.
 */
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "raised"
    | "flat"
    | "bordered"
    | "error"
    | "warning"
    | "info"
    | "gradient"
    | "surface"
    | "ghost"
    | "empty"
    | "body";
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "transition-colors",
        variant === "body" ? "rounded-none" : "rounded-xl",
        {
          "p-4": variant === "default" || variant === "raised",
          "p-4 border border-line": variant === "bordered",
          "p-0 border-0": variant === "flat",
          "p-4 border border-error/25 bg-error/10": variant === "error",
          "p-4 border border-warning/25 bg-warning/10": variant === "warning",
          "p-4 border border-line bg-hover": variant === "info",
          "p-4 bg-solid text-on-solid": variant === "gradient",
          "p-4 border border-line bg-raised": variant === "surface",
          "p-4 border border-line bg-transparent hover:bg-hover":
            variant === "ghost",
          "p-4 border-t border-line": variant === "body",
        },
        className,
      )}
      {...props}
    />
  ),
);
Panel.displayName = "Panel";
