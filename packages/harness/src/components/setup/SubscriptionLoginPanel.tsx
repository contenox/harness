import { Button, InlineNotice } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useProviderLoginFlow } from '../../hooks/useProviderLoginFlow';
import type { CloudProviderType } from '../../lib/types';
import { DeviceCodeSteps } from './DeviceCodeSteps';
import { useBrowserHandoff } from './useBrowserHandoff';
import { CODEX } from './useSignInFlow';

type Props = {
  onSignedIn: (provider: CloudProviderType) => void;
  onUseOtherProviders: () => void;
};

export function SubscriptionLoginPanel({ onSignedIn, onUseOtherProviders }: Props) {
  const { t } = useTranslation();
  const hosted = useProviderLoginFlow('contenox', () => onSignedIn('contenox'));
  const codex = useProviderLoginFlow(CODEX, () => onSignedIn(CODEX));
  const flow = hosted.pending || hosted.starting ? hosted : codex;
  const error = hosted.error ?? codex.error;
  const codeCopied = useBrowserHandoff(flow.deviceUrl, flow.deviceCode);
  const waiting = flow.pending && flow.deviceUrl && flow.deviceCode;

  return (
    <div className="flex w-full flex-col gap-3">
      {error && (
        <InlineNotice variant="error" role="alert">
          {error}
        </InlineNotice>
      )}

      {waiting ? (
        <DeviceCodeSteps
          compare={flow === hosted}
          url={flow.deviceUrl!}
          code={flow.deviceCode!}
          codeCopied={codeCopied}
          cancelling={flow.cancelling}
          onCancel={flow.cancel}
        />
      ) : (
        <>
          <Button
            size="lg"
            isLoading={hosted.starting}
            disabled={hosted.pending || codex.pending}
            onClick={hosted.start}>
            {t('signin.contenox')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            isLoading={codex.starting}
            disabled={hosted.pending || codex.pending}
            onClick={codex.start}>
            {t('signin.chatgpt')}
          </Button>
          <Button variant="ghost" size="lg" onClick={onUseOtherProviders}>
            {t('signin.other_providers')}
          </Button>
        </>
      )}
    </div>
  );
}
