import { forwardRef } from "react";
import { cn } from "../utils";
import { Span } from "./Typography";

export type InlineNoticeVariant =
  | "warning"
  | "info"
  | "error"
  | "success"
  /** @deprecated same as "error" */
  | "errorSoft";

export type InlineNoticeProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  variant?: InlineNoticeVariant;
  /** Short heading shown on its own line above the message. */
  title?: React.ReactNode;
  onDismiss?: () => void;
};

/** Tinted (10%) background with a hairline border; text stays neutral. */
const variantClasses: Record<InlineNoticeVariant, string> = {
  info: "bg-hover border-line text-text",
  warning: "bg-warning/10 border-warning/25 text-text",
  error: "bg-error/10 border-error/25 text-text",
  success: "bg-success/10 border-success/25 text-text",
  errorSoft: "bg-error/10 border-error/25 text-text",
};

export const InlineNotice = forwardRef<HTMLDivElement, InlineNoticeProps>(
  function InlineNotice(
    { className, variant = "info", title, onDismiss, children, ...props },
    ref,
  ) {
    const content = title ? (
      <>
        <Span className="block font-medium">{title}</Span>
        {children}
      </>
    ) : (
      children
    );
    return (
      <div
        ref={ref}
        role={variant === "error" || variant === "errorSoft" ? "alert" : undefined}
        className={cn(
          "shrink-0 rounded-lg border px-3 py-2 text-[13px] whitespace-pre-wrap",
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {onDismiss ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">{content}</div>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded px-1 text-base leading-none text-text-muted hover:text-text"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        ) : (
          content
        )}
      </div>
    );
  },
);
