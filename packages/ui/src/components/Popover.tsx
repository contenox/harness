import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils";
import { Dropdown } from "./Dropdown";

export interface PopoverProps {
  /** Element that toggles the popover (Button, IconButton, Chip, ...). */
  trigger: ReactElement<{ onClick?: React.MouseEventHandler<Element> }>;
  children: ReactNode;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  align?: "start" | "end";
  /** Open "top" for bottom-anchored UI such as the composer. */
  side?: "bottom" | "top";
  className?: string;
  contentClassName?: string;
}

/**
 * Anchored floating panel with arbitrary content; same surface, radius and
 * shadow as Dropdown (it is built on it). Closes on outside click / Escape.
 */
export function Popover({
  trigger,
  children,
  isOpen,
  onToggle,
  align = "start",
  side = "bottom",
  className,
  contentClassName,
}: PopoverProps) {
  return (
    <Dropdown
      trigger={trigger}
      isOpen={isOpen}
      onToggle={onToggle}
      align={align}
      side={side}
      className={className}
      contentClassName={cn("min-w-56 p-3", contentClassName)}
    >
      {children}
    </Dropdown>
  );
}
