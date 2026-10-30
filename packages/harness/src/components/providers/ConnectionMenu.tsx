import { Dropdown, DropdownItem, IconButton } from '@contenox/ui';
import { MoreHorizontal, Pencil, TextCursorInput, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  name: string;
  /** Omit for connections without editable fields (ChatGPT). */
  onEdit?: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/** The "..." menu of a connection row. */
export function ConnectionMenu({ name, onEdit, onRename, onDelete }: Props) {
  const { t } = useTranslation();
  return (
    <Dropdown
      align="end"
      contentClassName="min-w-[9rem]"
      trigger={
        <IconButton label={t('connections.menu', { name })} size="xs" noTooltip>
          <MoreHorizontal className="size-3.5" aria-hidden />
        </IconButton>
      }>
      {onEdit && (
        <DropdownItem icon={<Pencil className="size-3.5" />} onClick={onEdit}>
          {t('connections.edit')}
        </DropdownItem>
      )}
      <DropdownItem icon={<TextCursorInput className="size-3.5" />} onClick={onRename}>
        {t('connections.rename')}
      </DropdownItem>
      <DropdownItem danger icon={<Trash2 className="size-3.5" />} onClick={onDelete}>
        {t('connections.delete')}
      </DropdownItem>
    </Dropdown>
  );
}
