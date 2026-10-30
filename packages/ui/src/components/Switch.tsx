import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../utils";

export type SwitchProps = InputHTMLAttributes<HTMLInputElement>;

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <label className="relative inline-flex cursor-pointer items-center has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
      <input type="checkbox" role="switch" className="peer sr-only" ref={ref} {...props} />
      <span
        aria-hidden="true"
        className={cn(
          "h-5 w-9 rounded-full border border-line-strong bg-selected transition-colors",
          "peer-checked:border-transparent peer-checked:bg-solid",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-accent/50",
          "after:absolute after:top-[3px] after:left-[3px] after:size-3.5 after:rounded-full after:bg-text-muted",
          "after:transition-transform after:duration-100 after:content-['']",
          "peer-checked:after:translate-x-4 peer-checked:after:bg-on-solid",
          className,
        )}
      />
    </label>
  ),
);

Switch.displayName = "Switch";
