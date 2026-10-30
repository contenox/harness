import { cn } from "../utils";
import type { ReactNode } from "react";


export type NavItemProps = {

  isActive?: boolean;

  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;

  as?: React.ElementType;

  href?: string;

  to?: string;
  state?: unknown;
  compactOnMedium?: boolean;
  label?: string;
};

export function NavItem({
  isActive = false,
  icon,
  children,
  className,
  onClick,
  as: As,
  href,
  to,
  state,
  compactOnMedium = false,
  label,
}: NavItemProps) {
  const Tag = As ?? (href ? "a" : "div");

  return (
    <Tag
      href={href}
      to={to}
      {...(As ? { state } : {})}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] transition-colors",
        compactOnMedium && "h-auto flex-1 flex-col justify-center gap-1 px-2 py-2 text-xs sm:h-8 sm:flex-none sm:flex-row sm:justify-center sm:text-[13px] lg:justify-start lg:gap-2 lg:px-2.5",
        isActive
          ? "bg-selected font-medium text-text"
          : "text-text-muted hover:bg-hover hover:text-text",
        className,
      )}
    >
      {icon && (
        <span className="flex shrink-0 items-center text-text-muted [&>svg]:size-4">{icon}</span>
      )}
      <span className={cn('truncate', compactOnMedium && 'sm:hidden lg:block')}>{children}</span>
    </Tag>
  );
}
