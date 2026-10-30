import { forwardRef } from "react";
import { cn } from "../utils";
import { Button, type ButtonProps } from "./Button";
import { Tooltip } from "./Tooltip";

export type IconButtonProps = Omit<ButtonProps, "size" | "aria-label"> & {
  /** Required. Used as aria-label and tooltip text. */
  label: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Hide the tooltip (aria-label is always set). */
  noTooltip?: boolean;
  /** Toggle state: sets aria-pressed and the selected fill. Omit for a plain action button. */
  active?: boolean;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
};

const sizeMap = {
  xs: "icon-xs",
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
} as const;

/** Square, ghost-by-default button holding a single icon. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      size = "md",
      variant = "ghost",
      noTooltip = false,
      active,
      tooltipPosition = "top",
      className,
      children,
      ...props
    },
    ref,
  ) {
    const button = (
      <Button
        ref={ref}
        variant={variant}
        size={sizeMap[size]}
        aria-label={label}
        aria-pressed={active}
        className={cn(active && "bg-selected", className)}
        {...props}
      >
        {children}
      </Button>
    );
    if (noTooltip) return button;
    return (
      <Tooltip content={label} position={tooltipPosition}>
        {button}
      </Tooltip>
    );
  },
);
