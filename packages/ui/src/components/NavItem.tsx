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
        "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors",
        compactOnMedium && 'flex-1 flex-col justify-center gap-1 px-2 py-3 text-xs sm:flex-none sm:flex-row sm:justify-center sm:py-3 sm:text-sm lg:justify-start lg:gap-3 lg:px-4',
        isActive
          ? "bg-primary-50/50 dark:bg-dark-primary-900/30 text-primary-700 dark:text-dark-primary-400 font-medium"
          : "text-text dark:text-dark-text hover:bg-surface-100 dark:hover:bg-dark-surface-100",
        className,
      )}
    >
      {icon && (
        <span className="text-primary dark:text-dark-primary shrink-0">{icon}</span>
      )}
      <span className={cn('truncate', compactOnMedium && 'sm:hidden lg:block')}>{children}</span>
    </Tag>
  );
}
