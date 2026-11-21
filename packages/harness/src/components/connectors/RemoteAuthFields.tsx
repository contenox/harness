import { FormField, Input, SecretInput, Select } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { ConnectorFormErrors, ConnectorFormValues } from '../../lib/connectorForm';

type Props = {
  values: ConnectorFormValues;
  errors: ConnectorFormErrors;
  preset: boolean;
  forChat: boolean;
  showClientSettings: boolean;
  set: <K extends keyof ConnectorFormValues>(key: K, value: ConnectorFormValues[K]) => void;
  err: (key: keyof ConnectorFormErrors) => string | undefined;
};

export function RemoteAuthFields({
  values,
  errors,
  preset,
  forChat,
  set,
  err,
  showClientSettings,
}: Props) {
  const { t } = useTranslation();
  return (
    <>
      {!preset && (
        <FormField label={t('connectors.form.auth')}>
          <Select
            value={values.auth}
            onChange={e => set('auth', e.target.value as ConnectorFormValues['auth'])}
            options={[
              { value: 'none', label: t('connectors.form.auth_none') },
              { value: 'bearer', label: t('connectors.form.auth_bearer') },
              { value: 'apiKey', label: t('connectors.form.auth_key') },
              { value: 'basic', label: t('connectors.form.auth_basic') },
              ...(forChat
                ? []
                : [
                    { value: 'oauth', label: t('connectors.form.auth_oauth') },
                    { value: 'client_credentials', label: t('connectors.form.auth_service') },
                  ]),
            ]}
          />
        </FormField>
      )}
      {values.auth === 'basic' && (
        <FormField label={t('connectors.form.username')} error={err('username')}>
          <Input
            value={values.username}
            onChange={e => set('username', e.target.value)}
            autoComplete="off"
          />
        </FormField>
      )}
      {(values.auth === 'basic' || values.auth === 'apiKey') && (
        <FormField
          label={t(
            values.auth === 'basic' ? 'connectors.form.password' : 'connectors.form.auth_key',
          )}
          error={err('credential')}>
          <SecretInput
            value={values.credential}
            onChange={e => set('credential', e.target.value)}
            autoComplete="off"
            showLabel={t('connectors.form.show')}
            hideLabel={t('connectors.form.hide')}
          />
        </FormField>
      )}
      {values.auth === 'bearer' && (
        <>
          <FormField
            label={t('connectors.form.token')}
            error={err('token')}
            description={t('connectors.form.token_hint')}>
            <SecretInput
              value={values.token}
              onChange={e => set('token', e.target.value)}
              showLabel={t('connectors.form.show')}
              hideLabel={t('connectors.form.hide')}
              autoComplete="off"
              error={!!errors.token}
            />
          </FormField>
          {!forChat && (
            <FormField
              label={t('connectors.form.token_env')}
              description={t('connectors.form.token_env_hint')}>
              <Input
                value={values.tokenEnv}
                onChange={e => set('tokenEnv', e.target.value)}
                placeholder="MCP_TOKEN"
                autoComplete="off"
                spellCheck={false}
                mono
              />
            </FormField>
          )}
        </>
      )}
      {(values.auth === 'oauth' || values.auth === 'client_credentials') && showClientSettings && (
        <FormField
          label={t('connectors.form.oauth_client')}
          error={err('oauthClientId')}
          description={t(
            values.auth === 'client_credentials' || preset
              ? 'connectors.form.registered_client_hint'
              : 'connectors.form.oauth_client_hint',
          )}>
          <Input
            value={values.oauthClientId}
            onChange={e => set('oauthClientId', e.target.value)}
            autoComplete="off"
            spellCheck={false}
            mono
          />
        </FormField>
      )}
      {values.auth === 'client_credentials' && (
        <>
          <FormField
            label={t('connectors.form.token_url')}
            description={t('connectors.form.token_url_hint')}
            error={err('oauthTokenUrl')}>
            <Input
              type="url"
              value={values.oauthTokenUrl}
              onChange={e => set('oauthTokenUrl', e.target.value)}
            />
          </FormField>
          <FormField
            label={t('connectors.form.oauth_secret_env')}
            description={t('connectors.form.oauth_secret_env_hint')}
            error={err('oauthSecretEnv')}>
            <Input
              value={values.oauthSecretEnv}
              onChange={e => set('oauthSecretEnv', e.target.value)}
              placeholder="MCP_CLIENT_SECRET"
              autoComplete="off"
              mono
            />
          </FormField>
        </>
      )}
      {forChat && !preset && (
        <p className="text-text-muted text-xs">{t('connectors.form.chat_auth_hint')}</p>
      )}
    </>
  );
}
