import { Tabs, type Tab } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { PaneKind } from '../lib/panes';

const PANES: PaneKind[] = ['files', 'terminal', 'diff'];

export interface PaneTabsProps {
  active: PaneKind;
  onSelect: (pane: PaneKind) => void;
}

/** The right-hand work-surface tabs: Files, Terminal, Diff. */
export function PaneTabs({ active, onSelect }: PaneTabsProps) {
  const { t } = useTranslation();
  const tabs: Tab<PaneKind>[] = PANES.map(pane => ({
    id: pane,
    label: t(`panes.${pane}`),
  }));

  return <Tabs tabs={tabs} activeTab={active} onTabChange={onSelect} />;
}
