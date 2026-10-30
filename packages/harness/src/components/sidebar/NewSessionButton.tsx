import { Button, IconButton } from '@contenox/ui';
import { ChevronDown, SquarePen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AgentPicker } from '../AgentPicker';

type Props = {
  /** Start a new session; null means the native agent. */
  onStart: (agent: string | null) => void;
};

/** Primary "new session" action plus a chevron to pick an external agent first. */
export function NewSessionButton({ onStart }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 items-center gap-1 p-2">
      <Button variant="secondary" className="min-w-0 flex-1 justify-start" onClick={() => onStart(null)}>
        <SquarePen className="size-4" aria-hidden />
        <span className="truncate">{t('acp_sidebar.new_session')}</span>
      </Button>
      <AgentPicker
        value={null}
        onSelect={onStart}
        trigger={
          <IconButton label={t('acp_sidebar.new_session_with_agent')} variant="secondary" noTooltip>
            <ChevronDown className="size-4" aria-hidden />
          </IconButton>
        }
      />
    </div>
  );
}
