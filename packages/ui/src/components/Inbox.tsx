import { forwardRef } from "react";
import { cn } from "../utils";

type InboxProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Bare styled input. Prefer `Input`; `Inbox` is the low-level building block. */
export const Inbox = forwardRef<HTMLInputElement, InboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-8 rounded-lg border border-line-strong bg-raised px-3 text-[13px] text-text",
          "placeholder:text-text-subtle disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Inbox.displayName = "Inbox";
