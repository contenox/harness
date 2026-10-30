
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "../utils";
import { Inbox } from "./Inbox";
import { Label } from "./Label";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  indeterminate?: boolean;
  label?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, label, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (forwardedRef) {
        if (typeof forwardedRef === "function") {
          forwardedRef(localRef.current);
        } else {
          (
            forwardedRef as React.MutableRefObject<HTMLInputElement | null>
          ).current = localRef.current;
        }
      }
    }, [forwardedRef]);

    useEffect(() => {
      if (localRef.current) {
        localRef.current.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate]);

    return (
      <Label className="inline-flex cursor-pointer items-center gap-2">
        <Inbox
          type="checkbox"
          ref={localRef}
          className={cn(
            "size-4 cursor-pointer rounded p-0 accent-solid",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        {label && <span className="text-[13px] font-normal text-text">{label}</span>}
      </Label>
    );
  },
);
Checkbox.displayName = "Checkbox";
