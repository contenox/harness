import { cloneElement, isValidElement, useId } from "react";
import { Label } from "./Label";
import { P } from "./Typography";
import { cn } from "../utils";
import { HelpCircle } from "lucide-react";
import { Tooltip } from "./Tooltip";

export type FormFieldProps = {
  label: string | React.ReactNode;
  required?: boolean;
  error?: string;
  description?: string;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;

  htmlFor?: string;
};


type IdentifiableControlProps = { id?: string };

/**
 * A label, a control, and whatever has to be said about it.
 */
export function FormField({
  label,
  required,
  error,
  description,
  tooltip,
  children,
  className,
  htmlFor,
}: FormFieldProps) {
  const generatedId = useId();
  const singleControl = isValidElement<IdentifiableControlProps>(children);
  const fieldId = singleControl
    ? children.props.id ?? htmlFor ?? generatedId
    : htmlFor;
  const control =
    singleControl && children.props.id === undefined
      ? cloneElement(children, { id: fieldId })
      : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-1">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {label}
            {required && (
              <span className="text-error dark:text-dark-error">*</span>
            )}
          </Label>
          {tooltip && (
            <Tooltip content={tooltip}>
              <HelpCircle className="h-4 w-4 text-text-muted dark:text-dark-text-muted cursor-help" />
            </Tooltip>
          )}
        </div>
        {description && (
          <span className="text-xs text-text-muted dark:text-dark-text-muted">
            {description}
          </span>
        )}
      </div>

      {control}

      {error && (
        <P className="text-xs text-error dark:text-dark-error flex items-center gap-1">
          {error}
        </P>
      )}
    </div>
  );
}
