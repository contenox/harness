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
  // Help text sits under the control (not beside the label) so sentences don't squeeze the label.
  const descriptionId = description && fieldId ? `${fieldId}-description` : undefined;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const control =
    singleControl
      ? cloneElement(children, {
          ...(children.props.id === undefined ? { id: fieldId } : {}),
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
        } as IdentifiableControlProps)
      : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1">
        <Label htmlFor={fieldId} className="text-[13px] font-medium">
          {label}
          {required && (
            <span className="text-text-error"> *</span>
          )}
        </Label>
        {tooltip && (
          <Tooltip content={tooltip}>
            <HelpCircle className="size-3.5 text-text-subtle cursor-help" />
          </Tooltip>
        )}
      </div>

      {control}

      {description && (
        <P id={descriptionId} className="text-xs text-text-muted">
          {description}
        </P>
      )}

      {error && (
        <P id={errorId} className="text-xs text-text-error flex items-center gap-1">
          {error}
        </P>
      )}
    </div>
  );
}
