import { Button, InlineNotice, LoadingState } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { TerminalView } from '../../../components/terminal/TerminalView';
import { useHostTerminalSession } from '../../../hooks/useHostTerminalSession';

export interface MissionTerminalTabProps {
  missionId: string;
}

export default function MissionTerminalTab({ missionId }: MissionTerminalTabProps) {
  const { t } = useTranslation();
  const { session, isAbsent, isLoading, error, retry } = useHostTerminalSession(missionId, {
    enabled: true,
  });

  if (isAbsent) {
    return (
      <div className="p-4 md:p-6">
        <InlineNotice variant="info">
          <p className="font-medium">{t('hostTerminal.unavailable_title')}</p>
          <p className="mt-1 text-xs">{t('hostTerminal.unavailable_body')}</p>
        </InlineNotice>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <InlineNotice variant="error">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0">
              {t('hostTerminal.session_error')} {error.message}
            </span>
            <Button type="button" variant="outline" size="xs" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        </InlineNotice>
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="p-4 md:p-6">
        <LoadingState message={t('hostTerminal.connecting')} />
      </div>
    );
  }

  return (
    <div className="border-surface-200 dark:border-dark-surface-600 h-[60vh] min-h-[24rem] overflow-hidden rounded-lg border">
      <TerminalView wsPath={session.wsPath} />
    </div>
  );
}
