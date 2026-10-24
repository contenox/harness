import { TerminalOutput } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useTerminalStream } from '../../../hooks/useTerminalStream';

export interface TerminalTabProps {
  sessionId: string | null;
}

export function TerminalTab({ sessionId }: TerminalTabProps) {
  const { t } = useTranslation();
  const { lines, hasOutput } = useTerminalStream(sessionId);

  return (
    <TerminalOutput
      lines={hasOutput ? lines : [t('terminal.empty')]}
      maxHeight="100%"
      className="min-h-0 flex-1 rounded-none border-0"
    />
  );
}
