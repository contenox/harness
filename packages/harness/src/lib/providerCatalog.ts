import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Brain,
  Cloud,
  Gem,
  Layers,
  MessageCircle,
  Monitor,
  Network,
  Server,
  Sparkles,
  Wind,
} from 'lucide-react';
import type { TranslationKey } from '../i18n';
import type { CloudProviderType } from './types';

export type ProviderSecretKind = 'api-key' | 'service-account-json' | 'aws-credentials-json' | 'none';

/** Where a provider appears in the provider list. */
export type ProviderGroup = 'recommended' | 'cloud' | 'local' | 'more';

export type CloudProviderSetup = {
  provider: CloudProviderType;
  /** Section in the provider list; ChatGPT (openai-codex) is handled separately. */
  group: ProviderGroup;
  icon: LucideIcon;
  /** Where users create an API key for this provider (opened externally). */
  keyUrl?: string;
  /** Show the base URL up front (prefilled) instead of under "Advanced". */
  baseUrlPrimary?: boolean;
  titleKey: TranslationKey;
  /** Plain provider name for cards and row titles where the long `titleKey` reads awkwardly. */
  nameKey?: TranslationKey;
  /** One-line description for list rows. */
  shortKey: TranslationKey;
  secretKind: ProviderSecretKind;
  secretRequired: boolean;
  secretLabelKey?: TranslationKey;
  secretPlaceholderKey?: TranslationKey;
  baseUrlLabelKey?: TranslationKey;
  baseUrlPlaceholder?: string;
  baseUrlRequired?: boolean;
  defaultBaseUrl?: string;
  loginRequired?: boolean;
};

export const CLOUD_PROVIDER_SETUPS: CloudProviderSetup[] = [
  {
    provider: 'ollama',
    group: 'local',
    icon: Monitor,
    keyUrl: 'https://ollama.com/settings/keys',
    baseUrlPrimary: true,
    titleKey: 'cloud_providers.ollama.title',
    nameKey: 'cloud_providers.ollama.name',
    shortKey: 'providers.ollama.short',
    secretKind: 'api-key',
    secretRequired: false,
    secretLabelKey: 'cloud_providers.api_key_optional',
    secretPlaceholderKey: 'cloud_providers.api_key_placeholder_optional',
    baseUrlLabelKey: 'cloud_providers.base_url',
    baseUrlPlaceholder: 'http://127.0.0.1:11434 or https://ollama.com/api',
    defaultBaseUrl: 'http://127.0.0.1:11434',
  },
  {
    provider: 'openai',
    group: 'more',
    icon: Bot,
    keyUrl: 'https://platform.openai.com/api-keys',
    titleKey: 'cloud_providers.openai.title',
    shortKey: 'providers.openai.short',
    secretKind: 'api-key',
    secretRequired: true,
    secretLabelKey: 'cloud_providers.api_key',
    secretPlaceholderKey: 'cloud_providers.api_key_placeholder',
    baseUrlLabelKey: 'cloud_providers.base_url_optional',
    baseUrlPlaceholder: 'https://api.openai.com/v1',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    provider: 'openai-codex',
    group: 'recommended',
    icon: MessageCircle,
    titleKey: 'cloud_providers.codex.title',
    shortKey: 'providers.codex.short',
    secretKind: 'none',
    secretRequired: false,
    loginRequired: true,
  },
  {
    provider: 'openrouter',
    group: 'more',
    icon: Network,
    keyUrl: 'https://openrouter.ai/keys',
    titleKey: 'cloud_providers.openrouter.title',
    shortKey: 'providers.openrouter.short',
    secretKind: 'api-key',
    secretRequired: true,
    secretLabelKey: 'cloud_providers.api_key',
    secretPlaceholderKey: 'cloud_providers.api_key_placeholder',
    baseUrlLabelKey: 'cloud_providers.base_url_optional',
    baseUrlPlaceholder: 'https://openrouter.ai/api/v1',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
  },
  {
    provider: 'deepseek',
    group: 'recommended',
    icon: Brain,
    keyUrl: 'https://platform.deepseek.com/api_keys',
    titleKey: 'cloud_providers.deepseek.title',
    shortKey: 'providers.deepseek.short',
    secretKind: 'api-key',
    secretRequired: true,
    secretLabelKey: 'cloud_providers.api_key',
    secretPlaceholderKey: 'cloud_providers.api_key_placeholder',
    baseUrlLabelKey: 'cloud_providers.base_url_optional',
    baseUrlPlaceholder: 'https://api.deepseek.com',
    defaultBaseUrl: 'https://api.deepseek.com',
  },
  {
    provider: 'anthropic',
    group: 'recommended',
    icon: Sparkles,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    titleKey: 'cloud_providers.anthropic.title',
    shortKey: 'providers.anthropic.short',
    secretKind: 'api-key',
    secretRequired: true,
    secretLabelKey: 'cloud_providers.api_key',
    secretPlaceholderKey: 'cloud_providers.api_key_placeholder',
    baseUrlLabelKey: 'cloud_providers.base_url_optional',
    baseUrlPlaceholder: 'https://api.anthropic.com',
    defaultBaseUrl: 'https://api.anthropic.com',
  },
  {
    provider: 'gemini',
    group: 'recommended',
    icon: Gem,
    keyUrl: 'https://aistudio.google.com/apikey',
    titleKey: 'cloud_providers.gemini.title',
    shortKey: 'providers.gemini.short',
    secretKind: 'api-key',
    secretRequired: true,
    secretLabelKey: 'cloud_providers.api_key',
    secretPlaceholderKey: 'cloud_providers.api_key_placeholder',
    baseUrlLabelKey: 'cloud_providers.base_url_optional',
    baseUrlPlaceholder: 'https://generativelanguage.googleapis.com',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
  },
  {
    provider: 'mistral',
    group: 'more',
    icon: Wind,
    keyUrl: 'https://console.mistral.ai/api-keys',
    titleKey: 'cloud_providers.mistral.title',
    shortKey: 'providers.mistral.short',
    secretKind: 'api-key',
    secretRequired: true,
    secretLabelKey: 'cloud_providers.api_key',
    secretPlaceholderKey: 'cloud_providers.api_key_placeholder',
    baseUrlLabelKey: 'cloud_providers.base_url_optional',
    baseUrlPlaceholder: 'https://api.mistral.ai/v1',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
  },
  {
    provider: 'vertex-google',
    group: 'cloud',
    icon: Cloud,
    titleKey: 'cloud_providers.vertex_google.title',
    shortKey: 'providers.vertex_google.short',
    secretKind: 'service-account-json',
    secretRequired: false,
    secretLabelKey: 'cloud_providers.service_account_json_optional',
    secretPlaceholderKey: 'cloud_providers.service_account_json_placeholder',
    baseUrlLabelKey: 'cloud_providers.vertex_url',
    baseUrlPlaceholder:
      'https://us-central1-aiplatform.googleapis.com/v1/projects/MY_PROJECT/locations/us-central1',
    baseUrlRequired: true,
  },
  {
    provider: 'bedrock',
    group: 'cloud',
    icon: Layers,
    titleKey: 'cloud_providers.bedrock.title',
    shortKey: 'providers.bedrock.short',
    secretKind: 'aws-credentials-json',
    secretRequired: false,
    secretLabelKey: 'cloud_providers.aws_credentials_json_optional',
    secretPlaceholderKey: 'cloud_providers.aws_credentials_json_placeholder',
    baseUrlLabelKey: 'cloud_providers.bedrock_region',
    baseUrlPlaceholder: 'us-east-1',
    baseUrlRequired: true,
  },
  {
    provider: 'vllm',
    group: 'cloud',
    icon: Server,
    baseUrlPrimary: true,
    titleKey: 'cloud_providers.vllm.title',
    shortKey: 'providers.vllm.short',
    secretKind: 'api-key',
    secretRequired: false,
    secretLabelKey: 'cloud_providers.api_key_optional',
    secretPlaceholderKey: 'cloud_providers.api_key_placeholder_optional',
    baseUrlLabelKey: 'cloud_providers.base_url',
    baseUrlPlaceholder: 'http://localhost:8000/v1',
  },
];

export const ONBOARDING_PROVIDER_SETUPS = CLOUD_PROVIDER_SETUPS.filter(
  setup => setup.provider !== 'ollama',
);

export const getCloudProviderSetup = (provider: CloudProviderType): CloudProviderSetup =>
  CLOUD_PROVIDER_SETUPS.find(setup => setup.provider === provider) ?? CLOUD_PROVIDER_SETUPS[0];

export const isCloudProviderType = (provider: string): provider is CloudProviderType =>
  CLOUD_PROVIDER_SETUPS.some(setup => setup.provider === provider);

export type ProviderFieldId = 'apiKey' | 'apiKeyEnv' | 'baseUrl' | 'credentialsJson';

export type FieldSpec = {
  id: ProviderFieldId;
  kind: 'secret' | 'text' | 'url' | 'file';
  labelKey: TranslationKey;
  placeholder?: string;
  required: boolean;
};

/**
 * What a provider asks for, separate from how it is rendered. Required fields (and Ollama's
 * address) come first; optional base URL, key env var and optional JSON credentials sit under
 * "Advanced".
 */
export function fieldsFor(setup: CloudProviderSetup): {
  primary: FieldSpec[];
  advanced: FieldSpec[];
} {
  const primary: FieldSpec[] = [];
  const advanced: FieldSpec[] = [];
  const place = (field: FieldSpec, isPrimary: boolean) =>
    (isPrimary ? primary : advanced).push(field);

  if (setup.secretKind === 'api-key') {
    place(
      {
        id: 'apiKey',
        kind: 'secret',
        labelKey: setup.secretLabelKey ?? 'cloud_providers.api_key',
        required: setup.secretRequired,
      },
      setup.secretRequired,
    );
  }
  if (setup.baseUrlLabelKey) {
    const required = !!setup.baseUrlRequired || !!setup.baseUrlPrimary;
    place(
      {
        id: 'baseUrl',
        kind: setup.provider === 'bedrock' ? 'text' : 'url',
        labelKey: setup.baseUrlLabelKey,
        placeholder: setup.baseUrlPlaceholder,
        required,
      },
      required,
    );
  }
  if (setup.secretKind === 'api-key') {
    place(
      {
        id: 'apiKeyEnv',
        kind: 'text',
        labelKey: 'cloud_providers.api_key_env',
        placeholder: `${setup.provider.toUpperCase().replace(/-/g, '_')}_API_KEY`,
        required: false,
      },
      false,
    );
  }
  if (setup.secretKind === 'service-account-json' || setup.secretKind === 'aws-credentials-json') {
    place(
      {
        id: 'credentialsJson',
        kind: 'file',
        labelKey: setup.secretLabelKey ?? 'cloud_providers.service_account_json_optional',
        required: setup.secretRequired,
      },
      setup.secretRequired,
    );
  }
  return { primary, advanced };
}

export const providersInGroup = (group: ProviderGroup): CloudProviderSetup[] =>
  CLOUD_PROVIDER_SETUPS.filter(setup => setup.group === group && !setup.loginRequired);
