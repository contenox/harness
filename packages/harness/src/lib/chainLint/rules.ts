import type { ChainDefinition, ChainTask } from '../types';
import type { DiagnosticSeverity } from './index';

export interface LintRule {
  id: string;
  severity: DiagnosticSeverity;
  check: (task: ChainTask, chain: ChainDefinition) => string | null;
}

function exposesToolsProvider(task: ChainTask, toolsName: string): boolean {
  const tools = task.execute_config?.tools ?? task.execute_config?.hooks;
  if (tools == null) return false;
  if (tools.includes(`!${toolsName}`)) return false;
  if (tools.includes(toolsName)) return true;
  if (tools.includes('*')) return true;
  return false;
}

function getPolicy(task: ChainTask, toolsName: string): Record<string, string> | undefined {
  return task.execute_config?.tools_policies?.[toolsName] ?? task.execute_config?.hook_policies?.[toolsName];
}

function isChatCompletion(task: ChainTask): boolean {
  return task.handler === 'chat_completion';
}

export const ruleHookPoliciesMissingForLocalShell: LintRule = {
  id: 'hook_policies_missing_for_local_shell',
  severity: 'warning',
  check: (task) => {
    if (!exposesToolsProvider(task, 'local_shell')) return null;
    const p = getPolicy(task, 'local_shell');
    const allowed = p?.['_allowed_commands']?.trim();
    if (allowed) return null;
    return 'Task exposes local_shell but has no tools_policies.local_shell._allowed_commands. local_shell denies every call without an allowlist.';
  },
};

export const ruleHookPoliciesMissingForLocalFs: LintRule = {
  id: 'hook_policies_missing_for_local_fs',
  severity: 'warning',
  check: (task) => {
    if (!exposesToolsProvider(task, 'local_fs')) return null;
    const p = getPolicy(task, 'local_fs');
    const allowed = p?.['_allowed_dir']?.trim();
    if (allowed) return null;
    return 'Task exposes local_fs but has no tools_policies.local_fs._allowed_dir. Read paths default to deny without an allowed root.';
  },
};

export const ruleChatCompletionNoRetryPolicy: LintRule = {
  id: 'chat_completion_no_retry_policy',
  severity: 'info',
  check: (task) => {
    if (!isChatCompletion(task)) return null;
    if (task.execute_config?.retry_policy) return null;
    return 'chat_completion task has no retry_policy. Transient provider errors (429 / 5xx) will surface immediately and fail the run.';
  },
};

export const ruleChatCompletionNoCompactPolicy: LintRule = {
  id: 'chat_completion_no_compact_policy',
  severity: 'info',
  check: (task) => {
    if (!isChatCompletion(task)) return null;
    if (task.execute_config?.compact_policy) return null;
    if (!task.execute_config?.shift) {
      return 'chat_completion task has neither compact_policy nor shift:true. Long sessions / large tool outputs will overflow context with no recovery.';
    }
    return null;
  },
};

export const DEFAULT_RULES: LintRule[] = [
  ruleHookPoliciesMissingForLocalShell,
  ruleHookPoliciesMissingForLocalFs,
  ruleChatCompletionNoRetryPolicy,
  ruleChatCompletionNoCompactPolicy,
];
