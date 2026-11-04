import { Dropdown, DropdownItem, IconButton } from '@contenox/ui';
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  name: string;
  enabled: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onRemove: () => void;
};

export function AgentMenu({ name, enabled, onToggle, onEdit, onRemove }: Props) {
  const { t } = useTranslation();
  return (
    <Dropdown
      align="end"
      contentClassName="min-w-[10rem]"
      trigger={
        <IconButton label={t('external_agents.menu', { name })} size="xs" noTooltip>
          <MoreHorizontal className="size-3.5" aria-hidden />
        </IconButton>
      }>
      <DropdownItem icon={enabled ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />} onClick={onToggle}>
        {enabled ? t('external_agents.turn_off') : t('external_agents.turn_on')}
      </DropdownItem>
      {onEdit && (
        <DropdownItem icon={<Pencil className="size-3.5" />} onClick={onEdit}>
          {t('external_agents.edit')}
        </DropdownItem>
      )}
      <DropdownItem danger icon={<Trash2 className="size-3.5" />} onClick={onRemove}>
        {t('external_agents.remove')}
      </DropdownItem>
    </Dropdown>
  );
}
