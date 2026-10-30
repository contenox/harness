import { forwardRef, useState } from "react";
import { cn } from "../utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, startIcon, endIcon, error = false, ...props }, ref) => {
    return (
      <div className="relative">
        {startIcon && (
          <div className="pointer-events-none absolute top-1/2 left-2.5 flex -translate-y-1/2 items-center text-text-subtle">
            {startIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "h-8 w-full rounded-lg border bg-raised px-3 text-[13px] text-text transition-colors",
            "placeholder:text-text-subtle",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-error/60"
              : "border-line-strong focus-visible:border-accent/60",
            startIcon && "pl-8",
            endIcon && "pr-8",
            className,
          )}
          {...props}
        />
        {endIcon && (
          <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center text-text-subtle">
            {endIcon}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  ({ endIcon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setShowPassword((prev) => !prev);
    };

    const toggleIcon = (
      <button
        type="button"
        onClick={toggleShowPassword}
        className="text-xs text-text-muted hover:text-text"
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    );

    return (
      <Input
        {...props}
        ref={ref}
        type={showPassword ? "text" : "password"}
        endIcon={toggleIcon}
      />
    );
  },
);

PasswordInput.displayName = "PasswordInput";
