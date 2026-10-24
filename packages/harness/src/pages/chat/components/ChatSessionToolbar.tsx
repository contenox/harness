import { Button } from '@contenox/ui';
import { PanelLeft, PanelLeftClose, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AcpUsageState } from '../../../hooks/acpSessionState';
import type { SessionConfigOption, SessionConfigOptionValue } from '../../../lib/acp';
import { ConfigOptionControls } from './ConfigOptionControls';
import { UsageMeter } from './UsageMeter';

export interface ChatSessionToolbarProps {
  usage: AcpUsageState | null;
  configOptions: SessionConfigOption[];
  onConfigChange: (configId: string, value: SessionConfigOptionValue) => void;
  showNewSession: boolean;
  onNewSession: () => void;
  showFilesToggle: boolean;
  filesOpen: boolean;
  onToggleFiles: () => void;
  sidecarOpen: boolean;
  onToggleSidecar: () => void;
}

export function ChatSessionToolbar({
  usage,
  configOptions,
  onConfigChange,
  showNewSession,
  onNewSession,
  showFilesToggle,
  filesOpen,
  onToggleFiles,
  sidecarOpen,
  onToggleSidecar,
}: ChatSessionToolbarProps) {
  const { t } = useTranslation();
  const pressedClass = 'bg-surface-200 text-text dark:bg-dark-surface-300 dark:text-dark-text';

  return (
    <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 flex-wrap items-center justify-end gap-3 border-b px-3 py-2 sm:px-4">

      <div className="mr-auto flex items-center gap-1 sm:hidden">
        {showFilesToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-pressed={filesOpen}
            aria-label={t('workspace.toggle_label')}
            title={t('workspace.show_files')}
            className={filesOpen ? pressedClass : undefined}
            onClick={onToggleFiles}>
            {filesOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-pressed={sidecarOpen}
          aria-label={sidecarOpen ? t('terminal.close_in_canvas') : t('terminal.open_in_canvas')}
          title={sidecarOpen ? t('terminal.close_in_canvas') : t('terminal.open_in_canvas')}
          className={sidecarOpen ? pressedClass : undefined}
          onClick={onToggleSidecar}>
          <Terminal className="h-4 w-4" />
        </Button>
      </div>
      <UsageMeter usage={usage} />
      <ConfigOptionControls configOptions={configOptions} onChange={onConfigChange} />
      {showNewSession && (
        <Button
          type="button"
          variant="outline"
          palette="neutral"
          size="sm"
          className="sm:hidden"
          onClick={onNewSession}>
          {t('acp_chat.new_session')}
        </Button>
      )}
    </div>
  );
}
