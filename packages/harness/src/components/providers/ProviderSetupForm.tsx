import { Button, Disclosure, ExternalLink, InlineNotice, Span, Spinner, StatusDot } from '@contenox/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useProviderSetup } from '../../hooks/useProviderSetup';
import { fieldsFor, type CloudProviderSetup, type FieldSpec } from '../../lib/providerCatalog';
import {
  advancedNeedsAttention,
  initialValues,
  type ProviderSetupValues,
} from '../../lib/providerSetupValues';
import type { Connection } from '../../lib/types';
import { ConnectionRecovery } from './ConnectionRecovery';
import { ProviderField } from './ProviderField';

export type ProviderSetupFormProps = {
  setup: CloudProviderSetup;
  /** Edit this connection instead of creating a new one. */
  connection?: Connection;
  /** Controlled draft (lifted by the provider list). Omit for local state. */
  values?: ProviderSetupValues;
  onValuesChange?: (values: ProviderSetupValues) => void;
  /** Called once the connection is saved and verified as available. */
  onVerified?: (connection: Connection) => void;
  /** Shows a quiet cancel button (e.g. when other connections exist). */
  onCancel?: () => void;
};

/** Provider setup: required fields first, the rest under "Advanced", save -> verify feedback. */
export function ProviderSetupForm({
  setup,
  connection,
  values: controlledValues,
  onValuesChange,
  onVerified,
  onCancel,
}: ProviderSetupFormProps) {
  const { t } = useTranslation();
  const [localValues, setLocalValues] = useState(() => initialValues(setup, connection));
  const values = controlledValues ?? localValues;
  const setValues = onValuesChange ?? setLocalValues;

  const controller = useProviderSetup({ setup, connection, onVerified });
  const { primary, advanced } = fieldsFor(setup);
  const saved = connection ?? controller.connection;
  const secretStored = !!saved && saved.secretSource === 'literal' && saved.secretConfigured;
  const needsAdvanced = advancedNeedsAttention(
    advanced,
    values,
    controller.fieldErrors,
    initialValues(setup),
  );
  const [advancedOpen, setAdvancedOpen] = useState(needsAdvanced);
  useEffect(() => {
    if (needsAdvanced) setAdvancedOpen(true);
  }, [needsAdvanced]);

  const change = (id: FieldSpec['id'], value: string) => {
    controller.edit();
    setValues({ ...values, [id]: value });
  };

  const renderField = (spec: FieldSpec) => {
    const isSecret = spec.id === 'apiKey' || spec.id === 'credentialsJson';
    const envName = (values.apiKeyEnv ?? '').trim();
    const description =
      spec.id === 'apiKeyEnv'
        ? t('cloud_providers.api_key_env_hint', { example: spec.placeholder })
        : spec.id === 'apiKey' && envName
          ? t('cloud_providers.api_key_unused_with_env')
          : undefined;
    const showEnvStatus =
      spec.id === 'apiKeyEnv' && !!saved && saved.secretSource === 'env' && envName === saved.apiKeyEnv;
    return (
      <div key={spec.id} className="flex flex-col gap-1.5">
        <ProviderField
          spec={spec}
          value={values[spec.id] ?? ''}
          onChange={value => change(spec.id, value)}
          errors={controller.fieldErrors}
          disabled={controller.busy}
          secretStored={isSecret && secretStored}
          description={description}
          inactive={spec.id === 'apiKey' && !!envName}
        />
        {showEnvStatus && (
          <StatusDot
            status={saved.secretPresent ? 'available' : 'attention'}
            label={t(saved.secretPresent ? 'cloud_providers.env_found' : 'cloud_providers.env_missing')}
          />
        )}
        {spec.id === 'apiKey' && setup.keyUrl && (
          <div>
            <ExternalLink href={setup.keyUrl}>{t('providers.create_key')}</ExternalLink>
          </div>
        )}
      </div>
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void controller.configure(values);
  };

  const { phase, error } = controller;
  const editing = !!saved;
  const verifyFailed = phase === 'error' && error?.stage === 'verify';
  const saveMessage =
    phase === 'error' && error?.stage === 'save' && Object.keys(controller.fieldErrors).length === 0
      ? error.message
      : undefined;
  const nameError = controller.fieldErrors.name ? t(controller.fieldErrors.name) : undefined;

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
      {primary.map(renderField)}

      {advanced.length > 0 && (
        <Disclosure label={t('providers.advanced')} open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <div className="flex flex-col gap-3">{advanced.map(renderField)}</div>
        </Disclosure>
      )}

      {nameError && (
        <InlineNotice variant="error" role="alert">
          {nameError}
        </InlineNotice>
      )}
      {saveMessage && (
        <InlineNotice variant="error" role="alert">
          {saveMessage}
        </InlineNotice>
      )}
      {verifyFailed && saved && (
        <ConnectionRecovery
          connection={{
            ...(controller.connection ?? saved),
            error: error?.message,
            errorCode: error?.code,
          }}
          providerTitle={t(setup.titleKey)}
          force
          onRetry={() => void controller.retry()}
        />
      )}
      {phase === 'success' && (
        <InlineNotice variant="success" role="status">
          {t('providers.connected')}
        </InlineNotice>
      )}

      <div className="flex items-center justify-end gap-3">
        {(phase === 'saving' || phase === 'verifying') && (
          <Span variant="muted" className="mr-auto flex items-center gap-2 text-sm" role="status">
            <Spinner size="xs" />
            {phase === 'saving' ? t('providers.saving') : t('providers.verifying')}
          </Span>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" disabled={controller.busy} onClick={onCancel}>
            {t('providers.cancel')}
          </Button>
        )}
        <Button type="submit" isLoading={controller.busy}>
          {editing ? t('providers.save') : t('providers.connect')}
        </Button>
      </div>
    </form>
  );
}
