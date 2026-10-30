import { FileDiff, Info, Search, Terminal, type LucideProps } from 'lucide-react';
import { useCallback, useEffect, useState, type ComponentType } from 'react';
import type { TranslationKey } from '../../../i18n';

export interface MissionInspectorTab {
  id: string;
  icon: ComponentType<LucideProps>;
  labelKey: TranslationKey;
}

export const MISSION_INSPECTOR_TABS: readonly MissionInspectorTab[] = [
  { id: 'overview', icon: Info, labelKey: 'inspector.tab_overview' },
  { id: 'changes', icon: FileDiff, labelKey: 'inspector.tab_changes' },
  { id: 'search', icon: Search, labelKey: 'inspector.tab_search' },
  { id: 'terminal', icon: Terminal, labelKey: 'inspector.tab_terminal' },
];

const STORAGE_KEY = 'contenox.missionInspector.activeTab';

export function resolveActiveTab(
  stored: string | null,
  tabs: readonly MissionInspectorTab[] = MISSION_INSPECTOR_TABS,
): string {
  if (stored && tabs.some(t => t.id === stored)) return stored;
  return tabs[0]?.id ?? 'overview';
}

export function readStoredTab(): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(STORAGE_KEY);
  } catch {
  }
  return null;
}

export function writeStoredTab(id: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  } catch {
  }
}

export function useInspectorTab(
  tabs: readonly MissionInspectorTab[] = MISSION_INSPECTOR_TABS,
): [string, (id: string) => void] {
  const [active, setActive] = useState(() => resolveActiveTab(readStoredTab(), tabs));

  useEffect(() => {
    const resolved = resolveActiveTab(active, tabs);
    if (resolved !== active) setActive(resolved);
  }, [active, tabs]);

  const select = useCallback((id: string) => {
    setActive(id);
    writeStoredTab(id);
  }, []);

  return [active, select];
}
