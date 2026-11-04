import { SidebarItem } from '@contenox/ui';
import { Folder, FolderOpen } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';

type Props = {
  title: string;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  onContextMenu?: (e: MouseEvent) => void;
  children: ReactNode;
};

/** Foldable group header (project folder or "other") with its session rows beneath. */
export function ProjectGroup({ title, open, onToggle, actions, onContextMenu, children }: Props) {
  const Icon = open ? FolderOpen : Folder;
  return (
    <div className="flex flex-col gap-0.5">
      <div onContextMenu={onContextMenu}>
        <SidebarItem icon={<Icon aria-hidden />} expanded={open} onClick={onToggle} trailing={actions} title={title}>
          {title}
        </SidebarItem>
      </div>
      {open && children}
    </div>
  );
}
