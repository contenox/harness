import { IconButton } from '@contenox/ui';
import { FileDiff, FolderTree, Terminal, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useActiveChatPane } from '../../../hooks/chatPaneStore';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { PaneKind } from '../lib/panes';

const TOGGLES: Array<{
  pane: Extract<PaneKind, 'terminal' | 'diff'>;
  Icon: LucideIcon;
  labelKey: 'panes.terminal' | 'panes.diff';
}> = [
  { pane: 'terminal', Icon: Terminal, labelKey: 'panes.terminal' },
  { pane: 'diff', Icon: FileDiff, labelKey: 'panes.diff' },
];

/** Top-bar buttons for the right-hand panes. The file tree has no toggle: it is the workspace column. */
export function ChatPaneToggles() {
  const { t } = useTranslation();
  const { state, dispatch } = useActiveChatPane();
  const wide = useMediaQuery('(min-width: 1280px)');

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={t('panes.group_label')}>
      {!wide && (
        <IconButton
          label={t('panes.files')}
          tooltipPosition="bottom"
          active={state.pane === 'files'}
          onClick={() => dispatch({ type: 'toggle', pane: 'files' })}>
          <FolderTree className="size-4" aria-hidden />
        </IconButton>
      )}
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
