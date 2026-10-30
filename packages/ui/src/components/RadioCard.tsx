import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../utils";
import { rovingTarget } from "./roving";

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

/**
 * Single-choice list of selectable rows (role=radiogroup). Roving tabindex:
 * the selected row is the single tab stop; arrow keys move and select,
 * Home/End jump to the first/last row.
 */
export function RadioCardGroup<T extends string>({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: RadioCardGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = rovingTarget(e.key, index, options.length);
    if (target === null) return;
    e.preventDefault();
    refs.current[target]?.focus();
    onChange(options[target].value);
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-col gap-1.5", className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex w-full flex-col rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
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
