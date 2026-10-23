import { HelpCircle } from "lucide-react";
import { cn } from "../utils";
import { Label } from "./Label";
import { Tooltip } from "./Tooltip";

export type LabelWithHelpProps = {

  label: string;

  tooltip?: string;
  required?: boolean;
  className?: string;

  as?: "label" | "span";
  htmlFor?: string;
};

/**
 * A label (or read-only caption) paired with an optional info-icon tooltip.
 */
export function LabelWithHelp({
  label,
  tooltip,
  required,
  className,
  as = "span",
  htmlFor,
}: LabelWithHelpProps) {
  const textClassName =
    as === "span"
      ? "text-text-muted dark:text-dark-text-muted text-xs"
      : "text-sm font-medium";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {as === "label" ? (
        <Label htmlFor={htmlFor} className={textClassName}>
          {label}
          {required && (
            <span className="text-error dark:text-dark-error">*</span>
          )}
        </Label>
      ) : (
        <span className={textClassName}>
          {label}
          {required && (
            <span className="text-error dark:text-dark-error">*</span>
          )}
        </span>
      )}
      {tooltip && (
        <Tooltip content={tooltip}>
          <HelpCircle className="text-text-muted dark:text-dark-text-muted h-3.5 w-3.5 cursor-help" />
        </Tooltip>
      )}
    </div>
  );
}
