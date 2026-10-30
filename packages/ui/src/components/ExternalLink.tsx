import { ArrowUpRight } from "lucide-react";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils";

export type ExternalLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "target" | "rel" | "href" | "children"
> & {
  href: string;
  children: ReactNode;
};

/** Text link that opens in a new window, marked with a small arrow icon. */
export const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  function ExternalLink({ href, children, className, ...props }, ref) {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-0.5 rounded-sm text-[13px] text-link underline-offset-2 hover:underline",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
          className,
        )}
        {...props}
      >
        {children}
        <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
      </a>
    );
  },
);
