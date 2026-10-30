import { IconButton } from '@contenox/ui';
import { FileDiff, FolderTree, Terminal, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useActiveChatPane } from '../../../hooks/chatPaneStore';
import type { PaneKind } from '../lib/panes';

const TOGGLES: Array<{ pane: PaneKind; Icon: LucideIcon; labelKey: 'panes.terminal' | 'panes.files' | 'panes.diff' }> = [
  { pane: 'terminal', Icon: Terminal, labelKey: 'panes.terminal' },
  { pane: 'files', Icon: FolderTree, labelKey: 'panes.files' },
  { pane: 'diff', Icon: FileDiff, labelKey: 'panes.diff' },
];

/** Top-bar buttons that open / close the right-hand pane of the active chat tab. */
export function ChatPaneToggles() {
  const { t } = useTranslation();
  const { state, dispatch } = useActiveChatPane();

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={t('panes.group_label')}>
      {TOGGLES.map(({ pane, Icon, labelKey }) => (
        <IconButton
          key={pane}
          label={t(labelKey)}
          tooltipPosition="bottom"
          active={state.pane === pane}
          onClick={() => dispatch({ type: 'toggle', pane })}>
          <Icon className="size-4" aria-hidden />
        </IconButton>
      ))}
    </div>
  );
}
