import { FormField, Input, SecretInput, TextFileField } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { FieldSpec } from '../../lib/providerCatalog';
import type { FieldErrors } from '../../lib/providerSetupValues';

type Props = {
  spec: FieldSpec;
  value: string;
  onChange: (value: string) => void;
  errors: FieldErrors;
  disabled?: boolean;
  /** A secret (key or credentials) is already stored for the edited connection. */
  secretStored?: boolean;
  /** Help text under the field. */
  description?: string;
  /** Greys the field out without the form-wide busy state. */
  inactive?: boolean;
};

/** One field of the provider setup schema, rendered with the matching library control. */
export function ProviderField({ spec, value, onChange, errors, disabled, secretStored, description, inactive }: Props) {
  const { t } = useTranslation();
  const errorKey = errors[spec.id];
  const error = errorKey ? t(errorKey) : undefined;
  const label = t(spec.labelKey);

  if (spec.kind === 'file') {
    return (
      <FormField
        label={label}
        required={spec.required}
        description={secretStored ? t('providers.credentials_stored_hint') : undefined}>
        <TextFileField
          value={value}
          onChange={onChange}
          accept=".json,application/json"
          disabled={disabled}
          error={error}
          labels={{
            choose: t('providers.file_choose'),
            textLabel: t('providers.file_text_label'),
            placeholder: t('providers.file_placeholder'),
            tooLarge: t('providers.file_too_large'),
            invalidJson: t('providers.file_invalid_json'),
            readFailed: t('providers.file_read_failed'),
          }}
        />
      </FormField>
    );
  }

  return (
    <FormField label={label} required={spec.required} error={error} description={description}>
      {spec.kind === 'secret' ? (
        <SecretInput
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={spec.placeholder}
          disabled={disabled || inactive}
          error={!!error}
          showLabel={t('providers.key_show')}
          hideLabel={t('providers.key_hide')}
          stored={secretStored}
          storedLabel={t('providers.key_stored')}
          replaceLabel={t('providers.key_replace')}
        />
      ) : (
        <Input
          type={spec.kind === 'url' ? 'url' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={spec.placeholder}
          disabled={disabled}
          error={!!error}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize={spec.id === 'apiKeyEnv' ? 'characters' : 'off'}
          mono={spec.id === 'apiKeyEnv'}
        />
      )}
    </FormField>
  );
}
