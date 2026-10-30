import { Button, ButtonGroup, CopyRow, InlineNotice, P, Panel, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useProviderLoginFlow } from '../../../../hooks/useProviderLoginFlow';
import { useProviderLogout } from '../../../../hooks/useProviders';
import type { CloudProviderSetup } from '../../../../lib/providerCatalog';

type Props = {
  setup: CloudProviderSetup;
  onSaved?: () => void;
};

export default function ProviderLogin({ setup, onSaved }: Props) {
  const { t } = useTranslation();
  const logoutMutation = useProviderLogout(setup.provider);
  const flow = useProviderLoginFlow(setup.provider, onSaved);
  const { signedIn, pending, deviceUrl, deviceCode, error } = flow;

  return (
    <Panel variant="flat" className="space-y-3">
      <P variant="muted" className="text-sm">
        {t(setup.descriptionKey)}
      </P>
      <P variant="muted" className="text-xs">
        {t('cloud_providers.login_hint')}
      </P>

      {error && (
        <InlineNotice variant="error" role="alert">
          {error}
        </InlineNotice>
      )}

      {signedIn ? (
        <ButtonGroup className="items-center">
          <Span className="text-sm font-medium">{t('cloud_providers.login_signed_in')}</Span>
          <Button
            type="button"
            variant="outline"
            palette="neutral"
            size="sm"
            isLoading={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}>
            {t('cloud_providers.login_sign_out')}
          </Button>
        </ButtonGroup>
      ) : pending && deviceCode ? (
        <>
          <CopyRow
            label={t('cloud_providers.login_code')}
            copyLabel={t('cloud_providers.login_copy')}
            value={deviceCode}
          />
          {deviceUrl && (
            <ButtonGroup>
              <Button
                type="button"
                variant="outline"
                palette="primary"
                size="sm"
                onClick={() => window.open(deviceUrl, '_blank', 'noopener,noreferrer')}>
                {t('cloud_providers.login_open')}
              </Button>
            </ButtonGroup>
          )}
          <InlineNotice variant="info">{t('cloud_providers.login_pending')}</InlineNotice>
        </>
      ) : (
        <Button
          type="button"
          variant="primary"
          size="sm"
          isLoading={flow.starting}
          onClick={flow.start}>
          {t('cloud_providers.login_button')}
        </Button>
      )}
    </Panel>
  );
}
