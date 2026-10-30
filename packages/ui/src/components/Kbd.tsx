import { cn } from "../utils";

/** Keyboard hint, e.g. <Kbd>Ctrl</Kbd><Kbd>K</Kbd>. */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-hover px-1 font-sans text-[11px] font-medium text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
