import { SidebarItem } from '@contenox/ui';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export type MenuItem = {
  path: string;
  label: string;
  icon?: ReactNode;
};

export function SidebarNav({
  items,
  onNavigate,
  ariaLabel,
}: {
  items: MenuItem[];
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-col gap-0.5" aria-label={ariaLabel}>
      {items.map(item => (
        <SidebarItem
          key={item.path}
          as={Link}
          to={item.path}
          active={pathname === item.path || pathname.startsWith(item.path + '/')}
          icon={item.icon}
          onClick={onNavigate}>
          {item.label}
        </SidebarItem>
      ))}
    </nav>
  );
}
