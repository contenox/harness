import { forwardRef } from "react";
import { cn } from "../utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-y rounded-lg border bg-raised px-3 py-2 text-[13px] leading-5 text-text transition-colors",
          "placeholder:text-text-subtle disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-error/60"
            : "border-line-strong focus-visible:border-accent/60",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
