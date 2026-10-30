import { Dropdown, DropdownItem, IconButton } from '@contenox/ui';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  name: string;
  onNewSession: () => void;
  onRename: () => void;
  onRemove: () => void;
};

/** Hover actions of a project row: new session in the project and a "..." menu. */
export function ProjectActions({ name, onNewSession, onRename, onRemove }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <IconButton
        label={t('acp_sidebar.new_session_in_project', { name })}
        size="xs"
        noTooltip
        onClick={onNewSession}>
        <Plus className="size-3.5" aria-hidden />
      </IconButton>
      <Dropdown
        align="end"
        contentClassName="min-w-[9rem]"
        trigger={
          <IconButton label={t('acp_sidebar.project_menu', { name })} size="xs" noTooltip>
            <MoreHorizontal className="size-3.5" aria-hidden />
          </IconButton>
        }>
        <DropdownItem icon={<Pencil className="size-3.5" />} onClick={onRename}>
          {t('acp_sidebar.rename_project')}
        </DropdownItem>
        <DropdownItem danger icon={<Trash2 className="size-3.5" />} onClick={onRemove}>
          {t('acp_sidebar.remove_project')}
        </DropdownItem>
      </Dropdown>
    </>
  );
}
