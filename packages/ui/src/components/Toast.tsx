import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "../utils";

type ToastProps = {
  message: string;
  variant: "success" | "error";
  className?: string;
  onDismiss?: () => void;
  duration?: number;
  dismissLabel?: string;
};

export function Toast({
  message,
  variant,
  className,
  onDismiss,
  duration,
  dismissLabel = "Dismiss",
}: ToastProps) {
  useEffect(() => {
    if (!onDismiss || !duration) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return createPortal(
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn(
        "fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-line bg-raised px-3 py-2.5 text-text shadow-pop",
        "flex items-center gap-2.5 text-[13px]",
        className,
      )}
    >
      {variant === "success" ? (
        <CheckCircle2 className="size-4 text-text-success" />
      ) : (
        <XCircle className="size-4 text-text-error" />
      )}
      <span className="font-medium">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="rounded p-0.5 text-text-subtle hover:bg-hover hover:text-text"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>,
    document.body,
  );
}
