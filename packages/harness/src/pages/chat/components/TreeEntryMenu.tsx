import { Dropdown, DropdownItem, IconButton } from '@contenox/ui';
import { FilePlus, FolderPlus, MoreHorizontal, TextCursorInput, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TreeEntryMenuProps {
  name: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  onOpen: () => void;
  onCopyPath: () => void;
  isDirectory: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function TreeEntryMenu({
  name,
  open,
  onToggle,
  onOpen,
  onCopyPath,
  isDirectory,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: TreeEntryMenuProps) {
  const { t } = useTranslation();
  return (
    <Dropdown
      align="end"
      isOpen={open}
      onToggle={onToggle}
      contentClassName="min-w-[10rem]"
      trigger={
        <IconButton label={t('tree.menu', { name })} size="xs" noTooltip>
          <MoreHorizontal className="size-3.5" aria-hidden />
        </IconButton>
      }>
      {!isDirectory && <DropdownItem onClick={onOpen}>{t('preview.open')}</DropdownItem>}
      <DropdownItem onClick={onCopyPath}>{t('preview.copy_path')}</DropdownItem>
      {isDirectory && (
        <>
          <DropdownItem icon={<FilePlus className="size-3.5" />} onClick={onNewFile}>
            {t('tree.new_file')}
          </DropdownItem>
          <DropdownItem icon={<FolderPlus className="size-3.5" />} onClick={onNewFolder}>
            {t('tree.new_folder')}
          </DropdownItem>
        </>
      )}
      <DropdownItem icon={<TextCursorInput className="size-3.5" />} onClick={onRename}>
        {t('tree.rename')}
      </DropdownItem>
      <DropdownItem danger icon={<Trash2 className="size-3.5" />} onClick={onDelete}>
        {t('tree.delete')}
      </DropdownItem>
    </Dropdown>
  );
}
