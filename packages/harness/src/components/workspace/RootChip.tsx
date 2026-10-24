import { Badge, cn } from '@contenox/ui';
import { FolderTree } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceRoot } from '../../lib/types';
import { projectName } from '../../lib/workspaceRoots';

export interface RootChipProps {
  root?: WorkspaceRoot;
  className?: string;
}

export function RootChip({ root, className }: RootChipProps) {
  const { t } = useTranslation();
  if (!root) return null;

  return (
    <Badge
      variant="outline"
      size="sm"
      title={root.path}
      className={cn('inline-flex max-w-full items-center gap-1', className)}>
      <FolderTree aria-hidden="true" className="h-3 w-3 shrink-0" />
      <span className="truncate">{projectName(root)}</span>
      {root.default && (
        <span className="text-text-muted dark:text-dark-text-muted shrink-0">
          · {t('roots.default_marker')}
        </span>
      )}
    </Badge>
  );
}
