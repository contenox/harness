import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./Collapsible";

export type DisclosureProps = {
  label: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/** Subtle inline "› label" toggle that reveals a body (progressive disclosure). */
export function Disclosure({
  label,
  children,
  defaultOpen,
  open,
  onOpenChange,
  className,
}: DisclosureProps) {
  return (
    <Collapsible
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      className={className}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-1 rounded-sm text-xs text-text-subtle transition-colors hover:text-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
          )}
        >
          <ChevronRight
            aria-hidden
            className="size-3.5 transition-transform motion-reduce:transition-none group-data-[state=open]:rotate-90"
          />
          {label}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
