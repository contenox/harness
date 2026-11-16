import { Button, InlineNotice, P } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useProviderLoginFlow } from '../../hooks/useProviderLoginFlow';
import { DeviceCodeSteps } from './DeviceCodeSteps';
import { useBrowserHandoff } from './useBrowserHandoff';
import { CODEX } from './useSignInFlow';

type Props = {
  onSignedIn: () => void;
  onUseOtherProviders: () => void;
};

/**
 * Sign-in with ChatGPT. One click starts the device-code flow; the sign-in page opens in the
 * browser and the code lands on the clipboard, then numbered steps say what to do next.
 */
export function ChatGptLoginPanel({ onSignedIn, onUseOtherProviders }: Props) {
  const { t } = useTranslation();
  const flow = useProviderLoginFlow(CODEX, onSignedIn);
  const codeCopied = useBrowserHandoff(flow.deviceUrl, flow.deviceCode);
  const waiting = flow.pending && flow.deviceUrl && flow.deviceCode;

  return (
    <div className="flex w-full flex-col gap-3">
      {flow.error && (
        <InlineNotice variant="error" role="alert">
          {flow.error}
        </InlineNotice>
      )}

      {waiting ? (
        <DeviceCodeSteps
          url={flow.deviceUrl!}
          code={flow.deviceCode!}
          codeCopied={codeCopied}
          cancelling={flow.cancelling}
          onCancel={flow.cancel}
        />
      ) : (
        <>
          <Button size="lg" className="w-full" isLoading={flow.starting} onClick={flow.start}>
            {t('signin.continue')}
          </Button>
          <P variant="muted" className="text-center text-xs">
            {t('signin.start_desc')}
          </P>
          <Button variant="outline" size="lg" className="w-full" onClick={onUseOtherProviders}>
            {t('signin.other_providers')}
          </Button>
        </>
      )}
    </div>
  );
}
