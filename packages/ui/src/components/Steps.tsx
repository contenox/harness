import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils";

/** A short numbered list of instructions, e.g. "1. open the page, 2. enter the code". */
export function Steps({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cn("flex flex-col gap-4", className)}>{children}</ol>;
}

export function Step({
  number,
  title,
  done = false,
  children,
}: {
  number: number;
  title: ReactNode;
  done?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={cn(
          "mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
          done ? "bg-solid text-on-solid" : "border border-line-strong text-text-muted",
        )}>
        {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-text text-sm font-medium leading-6">{title}</span>
        {children && <div className="text-text-muted text-sm">{children}</div>}
      </div>
    </li>
  );
}
