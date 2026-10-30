import type { TranslationKey } from '../i18n';
import { ApiError } from './fetch';
import type { CloudProviderSetup, FieldSpec, ProviderFieldId } from './providerCatalog';
import type { CreateConnectionInput, PatchConnectionInput } from './types';

/** What the setup form collects. Everything is optional text; blanks mean "not provided". */
export type ProviderSetupValues = {
  name?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  credentialsJson?: string;
};

export type FieldErrorKey = ProviderFieldId | 'name';
export type FieldErrors = Partial<Record<FieldErrorKey, TranslationKey>>;

const trimmed = (value: string | undefined): string | undefined => {
  const next = value?.trim();
  return next ? next : undefined;
};

/** Initial form values for a provider (prefilled address), or for editing an existing connection. */
export function initialValues(
  setup: CloudProviderSetup,
  existing?: { baseUrl?: string; apiKeyEnv?: string },
): ProviderSetupValues {
  return {
    baseUrl: existing?.baseUrl ?? setup.defaultBaseUrl ?? '',
    apiKeyEnv: existing?.apiKeyEnv ?? '',
    apiKey: '',
    credentialsJson: '',
  };
}

/** Request body for create or patch. Secrets are sent only if typed, so an edit keeps the stored one. */
export function buildConnectionPayload(
  values: ProviderSetupValues,
): CreateConnectionInput & PatchConnectionInput {
  const secret = trimmed(values.credentialsJson) ?? trimmed(values.apiKey);
  const payload: CreateConnectionInput & PatchConnectionInput = {};
  const name = trimmed(values.name);
  if (name) payload.name = name;
  const baseUrl = trimmed(values.baseUrl);
  if (baseUrl) payload.baseUrl = baseUrl;
  if (secret) payload.apiKey = secret;
  const env = trimmed(values.apiKeyEnv);
  if (env) payload.apiKeyEnv = env;
  return payload;
}

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KEY_PREFIXES = ['sk-', 'sk_', 'AIza', 'gsk_', 'xai-', 'pk-', 'or-'];
const ENV_NAME_MAX = 64;

/** True when text typed into the env-var field is not a plausible variable name (likely a pasted key). */
export function looksLikeSecret(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  return (
    text.length > ENV_NAME_MAX ||
    !ENV_NAME.test(text) ||
    KEY_PREFIXES.some(prefix => text.startsWith(prefix))
  );
}

/** Client-side checks that mirror the runtime's 422 rules, so obvious mistakes never leave the form. */
export function validateSetupValues(
  setup: CloudProviderSetup,
  values: ProviderSetupValues,
  opts: { secretStored: boolean },
): FieldErrors {
  const errors: FieldErrors = {};
  const key = trimmed(values.apiKey);
  const env = trimmed(values.apiKeyEnv);
  const json = trimmed(values.credentialsJson);

  if ((setup.baseUrlRequired || setup.baseUrlPrimary) && !trimmed(values.baseUrl)) {
    errors.baseUrl = 'providers.field.required';
  }
  if (setup.secretKind === 'api-key') {
    if (env && looksLikeSecret(env)) errors.apiKeyEnv = 'cloud_providers.api_key_env_looks_like_key';
    else if (key && env) errors.apiKeyEnv = 'cloud_providers.secret_source_error';
    else if (setup.secretRequired && !key && !env && !opts.secretStored) {
      errors.apiKey = 'providers.field.required';
    }
  } else if (setup.secretKind !== 'none' && setup.secretRequired && !json && !opts.secretStored) {
    errors.credentialsJson = 'providers.field.required';
  }
  return errors;
}

/** Which form field a runtime validation message is about, judged from its wording. */
function fieldOfMessage(message: string, setup: CloudProviderSetup): FieldErrorKey | undefined {
  const text = message.toLowerCase();
  if (/\bname\b/.test(text)) return 'name';
  if (/base.?url|region|\burl\b/.test(text)) return 'baseUrl';
  if (/env/.test(text)) return 'apiKeyEnv';
  if (/key|secret|credential|token/.test(text)) {
    return setup.secretKind === 'api-key' ? 'apiKey' : 'credentialsJson';
  }
  return undefined;
}

export type MappedSetupError = {
  fieldErrors: FieldErrors;
  /** Runtime text to show as a form-level error when no field could be blamed. */
  message?: string;
};

/**
 * Turns a failed create/patch into field errors where possible: 409 is a duplicate name, 422 is
 * a validation problem mapped to a field by its wording. Anything else stays a form-level message.
 */
export function mapSetupError(error: unknown, setup: CloudProviderSetup): MappedSetupError {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof ApiError) {
    if (error.status === 409) return { fieldErrors: { name: 'providers.field.name_taken' } };
    if (error.status === 422) {
      const field = fieldOfMessage(message, setup);
      if (field) {
        const key: TranslationKey =
          field === 'name' ? 'providers.field.name_invalid' : 'providers.field.rejected';
        return { fieldErrors: { [field]: key }, message };
      }
    }
  }
  return { fieldErrors: {}, message };
}

/** Open the "Advanced" section when it holds an error or a value that differs from the defaults. */
export function advancedNeedsAttention(
  advanced: FieldSpec[],
  values: ProviderSetupValues,
  fieldErrors: FieldErrors,
  defaults: ProviderSetupValues,
): boolean {
  return advanced.some(field => {
    if (fieldErrors[field.id]) return true;
    const current = (values[field.id] ?? '').trim();
    return current !== '' && current !== (defaults[field.id] ?? '').trim();
  });
}
