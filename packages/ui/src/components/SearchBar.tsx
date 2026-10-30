import { Search, X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../utils";
import { Inbox } from "./Inbox";

type SearchBarProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onClear?: () => void;
};

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-subtle" />
        <Inbox
          ref={ref}
          value={value}
          className={cn(
            "block w-full pr-8 pl-8 focus-visible:border-accent/60",
            className,
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-text-subtle hover:bg-hover hover:text-text"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";
