import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  InlineNotice,
  Input,
} from '@contenox/ui';
import { FileText, Folder, Globe } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigDocument } from '../../../../hooks/usePermissions';
import { projectName } from '../../../../lib/workspaceRoots';
import type { PermissionScope } from '../usePermissionScope';

const FILTER_FROM = 8;

export function ScopeBar({ permission }: { permission: PermissionScope }) {
  const { t } = useTranslation();
  const [openError, setOpenError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const reveal = typeof window !== 'undefined' ? window.contenoxDesktop?.revealPath : undefined;
  const current = permission.scope.workspace;
  const configFile = useConfigDocument(permission.scope);
  const filePath = configFile.data?.exists ? configFile.data.path : undefined;
  const query = filter.trim().toLowerCase();
  const roots = permission.roots
    .map(root => ({ root, name: projectName(root) }))
    .filter(
      ({ root, name }) =>
        query === '' ||
        name.toLowerCase().includes(query) ||
        root.path.toLowerCase().includes(query),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const choose = (path: string | undefined) => {
    permission.setWorkspace(path);
    setOpenError(null);
    setOpen(false);
    setFilter('');
  };

  const openFile = async (path: string) => {
    setOpenError(null);
    try {
      const res = await reveal?.(path);
      if (res && !res.ok) setOpenError(res.error ?? '');
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Dropdown
          isOpen={open}
          onToggle={setOpen}
          contentClassName="w-72"
          trigger={
            <Chip
              variant="outline"
              caret
              icon={current ? <Folder /> : <Globe />}
              label={current ? permission.workspaceName : t('permissions.all_workspaces')}
              title={current}
            />
          }>
          {permission.roots.length >= FILTER_FROM && (
            <div className="p-1">
              <Input
                autoFocus
                value={filter}
                placeholder={t('permissions.scope_filter')}
                className="h-8 text-[13px]"
                onChange={e => setFilter(e.target.value)}
              />
            </div>
          )}
          <DropdownItem
            icon={<Globe className="size-3.5" />}
            selected={!current}
            onClick={() => choose(undefined)}>
            {t('permissions.all_workspaces')}
          </DropdownItem>
          <DropdownSeparator />
          {roots.map(({ root, name }) => (
            <DropdownItem
              key={root.path}
              icon={<Folder className="size-3.5" />}
              selected={current === root.path}
              title={root.path}
              onClick={() => choose(root.path)}>
              {name}
            </DropdownItem>
          ))}
          {roots.length === 0 && (
            <div className="text-text-muted px-2.5 py-1.5 text-xs">
              {t('permissions.scope_no_match')}
            </div>
          )}
        </Dropdown>
        {reveal && filePath && (
          <Button
            variant="ghost"
            size="sm"
            title={filePath}
            onClick={() => void openFile(filePath)}>
            <FileText className="size-3.5" aria-hidden />
            {t('permissions.open_file')}
          </Button>
        )}
      </div>
      {openError !== null && (
        <InlineNotice variant="error" role="alert">
          {t('permissions.open_file_error', { message: openError })}
        </InlineNotice>
      )}
    </div>
  );
}
