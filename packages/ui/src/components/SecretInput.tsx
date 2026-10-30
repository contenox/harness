import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "../utils";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Input } from "./Input";

type InputProps = ComponentProps<typeof Input>;

export type SecretInputProps = Omit<InputProps, "type" | "endIcon"> & {
  showLabel: string;
  hideLabel: string;
  /**
   * A secret is already saved. The saved value is never passed to or held by
   * this component: it shows `storedLabel` and a replace action instead.
   */
  stored?: boolean;
  storedLabel?: string;
  replaceLabel?: string;
  /** Called when the user chooses to replace the stored secret. */
  onReplace?: () => void;
};

/** Password-style input with a show/hide toggle and a "stored secret" mode. */
export const SecretInput = forwardRef<HTMLInputElement, SecretInputProps>(
  function SecretInput(
    { showLabel, hideLabel, stored = false, storedLabel, replaceLabel, onReplace, className, ...props },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const [replacing, setReplacing] = useState(false);
    const innerRef = useRef<HTMLInputElement | null>(null);
    const focusAfterReplace = useRef(false);

    // When the stored secret goes away (e.g. disconnected), start fresh.
    useEffect(() => {
      if (!stored) setReplacing(false);
    }, [stored]);

    useEffect(() => {
      if (replacing && focusAfterReplace.current) {
        focusAfterReplace.current = false;
        innerRef.current?.focus();
      }
    }, [replacing]);

    if (stored && !replacing) {
      return (
        <div
          className={cn(
            "flex h-8 items-center justify-between gap-2 rounded-lg border border-line bg-sidebar px-3 text-[13px]",
            className,
          )}
        >
          <span className="min-w-0 truncate text-text-muted">{storedLabel}</span>
          <Button
            type="button"
            variant="text"
            size="sm"
            onClick={() => {
              focusAfterReplace.current = true;
              setReplacing(true);
              onReplace?.();
            }}
          >
            {replaceLabel}
          </Button>
        </div>
      );
    }

    return (
      <Input
        {...props}
        ref={(el) => {
          innerRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={cn("pr-10", className)}
        endIcon={
          <IconButton
            label={visible ? hideLabel : showLabel}
            size="xs"
            noTooltip
            className="-mr-1.5"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </IconButton>
        }
      />
    );
  },
);
