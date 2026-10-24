export type AcpFailureKind = 'backend_unreachable' | 'model_unavailable' | 'workspace_required' | 'generic';

const BACKEND_UNREACHABLE_PATTERN =
  /no models found in runtime state|modeld (?:is )?not (?:running|available)|modeld unavailable|requires a running modeld|connection refused|dial tcp|no such host|context deadline exceeded|network is unreachable/i;

const MODEL_UNAVAILABLE_PATTERN =
  /no model matched|client resolution failed|tokens? of context but the largest available model|provides only \d+/i;

const WORKSPACE_REQUIRED_PATTERN = /cwd is required to confine the agent/i;

export function classifyAcpExecutionError(message: string | null | undefined): AcpFailureKind {
  if (!message) return 'generic';
  if (BACKEND_UNREACHABLE_PATTERN.test(message)) return 'backend_unreachable';
  if (MODEL_UNAVAILABLE_PATTERN.test(message)) return 'model_unavailable';
  if (WORKSPACE_REQUIRED_PATTERN.test(message)) return 'workspace_required';
  return 'generic';
}

export interface AcpFailureCopyKeys {
  titleKey: string | null;
  descriptionKey: string | null;
}

export function acpFailureCopyKeys(kind: AcpFailureKind): AcpFailureCopyKeys {
  switch (kind) {
    case 'backend_unreachable':
      return {
        titleKey: 'acp_recovery.backend_unreachable_title',
        descriptionKey: 'acp_recovery.backend_unreachable_description',
      };
    case 'model_unavailable':
      return {
        titleKey: 'acp_recovery.model_unavailable_title',
        descriptionKey: 'acp_recovery.model_unavailable_description',
      };
    case 'workspace_required':
      return {
        titleKey: 'acp_recovery.workspace_required_title',
        descriptionKey: 'acp_recovery.workspace_required_description',
      };
    case 'generic':
    default:
      return { titleKey: null, descriptionKey: null };
  }
}

export function classifySetupIssueCode(code: string | null | undefined): AcpFailureKind {
  switch (code) {
    case 'runtime_state_empty':
    case 'all_backends_unreachable':
    case 'default_provider_unreachable':
    case 'default_provider_not_synced':
      return 'backend_unreachable';
    case 'default_model_not_available':
    case 'missing_default_model':
      return 'model_unavailable';
    default:
      return 'generic';
  }
}
