import { Button, InlineNotice, LoadingState, Page } from '@contenox/ui';
import { SquareTerminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TerminalView } from '../../../components/terminal/TerminalView';
import { useHostTerminalSession } from '../../../hooks/useHostTerminalSession';

export default function ConsolePage() {
  const { t } = useTranslation();
  const { session, isAbsent, isLoading, error, retry } = useHostTerminalSession('host-console', {
    enabled: true,
  });

  return (
    <Page bodyScroll="hidden">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <SquareTerminal
            className="text-text-muted dark:text-dark-text-muted h-4 w-4 shrink-0"
            aria-hidden
          />
          <h1 className="text-text dark:text-dark-text truncate text-sm font-semibold">
            {t('hostTerminal.page_title')}
          </h1>
        </div>

        <div className="min-h-0 flex-1">
          {isAbsent ? (
            <div className="p-4 md:p-6">
              <InlineNotice variant="info">
                <p className="font-medium">{t('hostTerminal.unavailable_title')}</p>
                <p className="mt-1 text-xs">{t('hostTerminal.unavailable_body')}</p>
              </InlineNotice>
            </div>
          ) : error ? (
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
          ) : isLoading || !session ? (
            <div className="p-4 md:p-6">
              <LoadingState message={t('hostTerminal.connecting')} />
            </div>
          ) : (
            <TerminalView key={session.wsPath} wsPath={session.wsPath} />
          )}
        </div>
      </div>
    </Page>
  );
}
