import { SidebarItem } from '@contenox/ui';
import { Folder, FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

/** Foldable group header (project folder or "other") with its session rows beneath. */
export function ProjectGroup({ title, open, onToggle, actions, children }: Props) {
  const Icon = open ? FolderOpen : Folder;
  return (
    <div className="flex flex-col gap-0.5">
      <SidebarItem icon={<Icon aria-hidden />} expanded={open} onClick={onToggle} trailing={actions} title={title}>
        {title}
      </SidebarItem>
      {open && children}
    </div>
  );
}
