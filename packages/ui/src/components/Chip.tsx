import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../utils";

export type ChipProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon?: React.ReactNode;
  label: React.ReactNode;
  /** Show a trailing caret (when used as a Dropdown / Popover trigger). */
  caret?: boolean;
  variant?: "ghost" | "outline";
  /** Selected / open look. */
  active?: boolean;
};

/**
 * Pill-ish 28px control: optional icon, label, optional caret.
 * Works as a Dropdown / Popover trigger (forwards ref and onClick).
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { icon, label, caret = false, variant = "ghost", active = false, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-7 max-w-full items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-text-muted",
        "transition-colors hover:bg-hover hover:text-text",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "outline" ? "border border-line-strong" : "border border-transparent",
        active && "bg-selected text-text",
        className,
      )}
      {...props}
    >
      {icon && <span className="flex shrink-0 items-center [&>svg]:size-3.5">{icon}</span>}
      <span className="min-w-0 truncate">{label}</span>
      {caret && <ChevronDown className="size-3.5 shrink-0 text-text-subtle" aria-hidden />}
    </button>
  );
});
