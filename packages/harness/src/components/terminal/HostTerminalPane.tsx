import { Button, cn, InlineNotice, LoadingState } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useHostTerminalSession } from '../../hooks/useHostTerminalSession';
import { useCwdPrefix, withPrefix } from '../../lib/projectRuntime';
import { TerminalView } from './TerminalView';

export interface HostTerminalPaneProps {
  /** Identity of the shell: the same key reuses the same PTY session. */
  ownerKey: string;
  /** Folder the shell starts in; the shell is created on (and its socket routed to) the runtime owning it. */
  cwd?: string;
  /** Classes for the terminal itself (not the status notices). */
  terminalClassName?: string;
}

/** A real PTY terminal with absent / error / loading states, shared by the chat pane, missions and console. */
export function HostTerminalPane({ ownerKey, cwd, terminalClassName }: HostTerminalPaneProps) {
  const { t } = useTranslation();
  const { session, isAbsent, isLoading, error, retry } = useHostTerminalSession(ownerKey, {
    enabled: true,
    cwd,
  });
  const prefix = useCwdPrefix(cwd);

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

  if (isLoading || !session || prefix === null) {
    return (
      <div className="p-4 md:p-6">
        <LoadingState message={t('hostTerminal.connecting')} />
      </div>
    );
  }

  const wsPath = withPrefix(prefix, session.wsPath);
  return (
    <div className={cn('h-full min-h-0', terminalClassName)}>
      <TerminalView key={wsPath} wsPath={wsPath} />
    </div>
  );
}
