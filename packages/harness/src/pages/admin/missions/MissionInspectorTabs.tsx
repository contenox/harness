import { Tabs } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { MissionInspectorTab } from './inspectorTabs';

export interface MissionInspectorTabsProps {
  tabs: readonly MissionInspectorTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function MissionInspectorTabs({ tabs, activeTab, onTabChange }: MissionInspectorTabsProps) {
  const { t } = useTranslation();

  const uiTabs = tabs.map(tab => {
    const Icon = tab.icon;
    return {
      id: tab.id,
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Icon aria-hidden="true" className="h-4 w-4" />
          {t(tab.labelKey)}
        </span>
      ),
    };
  });

  return (
    <div className="border-surface-200 dark:border-dark-surface-600 border-b">
      <Tabs tabs={uiTabs} activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
