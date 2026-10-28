import { Button, ButtonGroup, CopyRow, InlineNotice, P, Panel, Span } from '@contenox/ui';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useProviderLoginStatus,
  useProviderLogout,
  useProviderStatus,
  useStartProviderLogin,
} from '../../../../hooks/useProviders';
import type { CloudProviderSetup } from '../../../../lib/providerCatalog';

type Props = {
  setup: CloudProviderSetup;
  onSaved?: () => void;
};

export default function ProviderLogin({ setup, onSaved }: Props) {
  const { t } = useTranslation();
  const statusQuery = useProviderStatus(setup.provider);
  const loginQuery = useProviderLoginStatus(setup.provider);
  const startMutation = useStartProviderLogin(setup.provider);
  const logoutMutation = useProviderLogout(setup.provider);
  const announced = useRef(false);

  const login = loginQuery.data;
  const started = startMutation.data;
  const state =
    login?.state ??
    started?.state ??
    (statusQuery.data?.loginRequired ? 'login_required' : statusQuery.data?.authState) ??
    'login_required';
  const signedIn = state === 'authenticated';
  const pending = state === 'login_pending';
  const deviceUrl = pending ? (login?.url ?? started?.url) : undefined;
  const deviceCode = pending ? (login?.code ?? started?.code) : undefined;

  useEffect(() => {
    if (!signedIn || announced.current) return;
    announced.current = true;
    onSaved?.();
  }, [signedIn, onSaved]);

  const error = login?.error ?? startMutation.error?.message ?? statusQuery.error?.message ?? null;

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
          isLoading={startMutation.isPending}
          onClick={() => startMutation.mutate()}>
          {t('cloud_providers.login_button')}
        </Button>
      )}
    </Panel>
  );
}
