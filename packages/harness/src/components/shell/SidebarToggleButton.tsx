import { IconButton } from '@contenox/ui';
import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SidebarToggleButton({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <IconButton label={t('navbar.toggle_sidebar')} active={isOpen} onClick={onToggle} aria-expanded={isOpen}>
      <PanelLeft className="size-4" aria-hidden />
    </IconButton>
  );
}
