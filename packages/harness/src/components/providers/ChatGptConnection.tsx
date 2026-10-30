import { Button, InlineNotice, SettingsGroup, SettingsRow, StatusDot } from '@contenox/ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectionLoginFlow } from '../../hooks/useProviderLoginFlow';
import { connectionStatus } from '../../lib/connectionStatus';
import type { Connection } from '../../lib/types';
import { DeviceCodeSteps } from '../setup/DeviceCodeSteps';
import { useBrowserHandoff } from '../setup/useBrowserHandoff';
import { ConnectionDeleteConfirm } from './ConnectionDeleteConfirm';
import { ConnectionMenu } from './ConnectionMenu';
import { ConnectionRename } from './ConnectionRename';

export type ChatGptConnectionProps = {
  connection: Connection;
  /** Start the device-code sign-in right away (a connection that was just created). */
  autoStart?: boolean;
  onSignedIn?: () => void;
};

/**
 * One ChatGPT connection: signed in (with "Abmelden"), or the device-code steps. Cancel stops
 * only the pending attempt; sign out is the explicit action that removes the session.
 */
export function ChatGptConnection({ connection, autoStart, onSignedIn }: ChatGptConnectionProps) {
  const { t } = useTranslation();
  const flow = useConnectionLoginFlow(connection, onSignedIn);
  const codeCopied = useBrowserHandoff(flow.deviceUrl, flow.deviceCode);
  const waiting = flow.pending && flow.deviceUrl && flow.deviceCode;
  const status = connectionStatus(connection);
  const [mode, setMode] = useState<'rename' | 'delete' | null>(null);

  const started = useRef(false);
  const { start } = flow;
  useEffect(() => {
    if (!autoStart || started.current || flow.signedIn) return;
    started.current = true;
    start();
  }, [autoStart, flow.signedIn, start]);

  return (
    <div className="flex flex-col gap-3">
      <SettingsGroup>
        <SettingsRow
          title={connection.name}
          description={flow.signedIn ? t('connections.chatgpt.signed_in') : undefined}
          trailing={
            <>
              <StatusDot
                status={flow.signedIn ? status.statusDot : waiting ? 'checking' : 'attention'}
                label={t(
                  flow.signedIn
                    ? status.summaryKey
                    : waiting
                      ? 'connections.status.login_pending'
                      : 'connections.status.login_required',
                )}
              />
              {flow.signedIn && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  isLoading={flow.loggingOut}
                  onClick={flow.logout}>
                  {t('connections.chatgpt.sign_out')}
                </Button>
              )}
              <ConnectionMenu
                name={connection.name}
                onRename={() => setMode('rename')}
                onDelete={() => setMode('delete')}
              />
            </>
          }
        />
      </SettingsGroup>

      {mode === 'rename' && (
        <ConnectionRename connection={connection} onDone={() => setMode(null)} />
      )}
      {mode === 'delete' && (
        <ConnectionDeleteConfirm connection={connection} onDone={() => setMode(null)} />
      )}

      {flow.error && (
        <InlineNotice variant="error" role="alert">
          {flow.error}
        </InlineNotice>
      )}

      {!flow.signedIn &&
        (waiting ? (
          <DeviceCodeSteps
            url={flow.deviceUrl!}
            code={flow.deviceCode!}
            codeCopied={codeCopied}
            cancelling={flow.cancelling}
            onCancel={flow.cancel}
          />
        ) : (
          <div>
            <Button type="button" size="sm" isLoading={flow.starting} onClick={flow.start}>
              {t('connections.chatgpt.sign_in')}
            </Button>
          </div>
        ))}
    </div>
  );
}
