export type AcpFailureKind =
  | 'backend_unreachable'
  | 'model_unavailable'
  | 'workspace_required'
  | 'agent_sign_in'
  | 'agent_unavailable'
  | 'generic';

const BACKEND_UNREACHABLE_PATTERN =
  /no models found in runtime state|modeld (?:is )?not (?:running|available)|modeld unavailable|requires a running modeld|connection refused|dial tcp|no such host|context deadline exceeded|network is unreachable/i;

const MODEL_UNAVAILABLE_PATTERN =
  /no model matched|client resolution failed|tokens? of context but the largest available model|provides only \d+/i;

const WORKSPACE_REQUIRED_PATTERN = /cwd is required to confine the agent/i;

const AGENT_SIGN_IN_PATTERN = /(\S+) needs you to sign in before it can answer/i;

const AGENT_UNAVAILABLE_PATTERN = /(?:spawn|start) agent "([^"]+)"/i;

export function failedAgentName(message: string | null | undefined): string | null {
  if (!message) return null;
  const m = AGENT_SIGN_IN_PATTERN.exec(message) ?? AGENT_UNAVAILABLE_PATTERN.exec(message);
  return m ? m[1] : null;
}

export function classifyAcpExecutionError(message: string | null | undefined): AcpFailureKind {
  if (!message) return 'generic';
  if (BACKEND_UNREACHABLE_PATTERN.test(message)) return 'backend_unreachable';
  if (MODEL_UNAVAILABLE_PATTERN.test(message)) return 'model_unavailable';
  if (WORKSPACE_REQUIRED_PATTERN.test(message)) return 'workspace_required';
  if (AGENT_SIGN_IN_PATTERN.test(message)) return 'agent_sign_in';
  if (AGENT_UNAVAILABLE_PATTERN.test(message)) return 'agent_unavailable';
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
    case 'agent_sign_in':
      return {
        titleKey: 'acp_recovery.agent_sign_in_title',
        descriptionKey: 'acp_recovery.agent_sign_in_description',
      };
    case 'agent_unavailable':
      return {
        titleKey: 'acp_recovery.agent_unavailable_title',
        descriptionKey: 'acp_recovery.agent_unavailable_description',
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
    case 'missing_default_provider':
      return 'model_unavailable';
    default:
      return 'generic';
  }
}
