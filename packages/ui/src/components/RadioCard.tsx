import type { ReactNode } from "react";
import { cn } from "../utils";

export type RadioCardOption<T extends string> = {
  value: T;
  label: ReactNode;
  description?: ReactNode;
};

export type RadioCardGroupProps<T extends string> = {
  options: RadioCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

/** Single-choice list of selectable rows (role=radiogroup). */
export function RadioCardGroup<T extends string>({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: RadioCardGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-col gap-1.5", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex w-full flex-col rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
              selected
                ? "border-text bg-selected text-text"
                : "border-line-strong bg-transparent text-text hover:bg-hover",
            )}
          >
            <span className="font-medium">{o.label}</span>
            {o.description && <span className="text-xs text-text-muted">{o.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
