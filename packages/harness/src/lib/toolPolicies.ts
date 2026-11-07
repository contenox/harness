export type PolicyKind = 'list' | 'path' | 'number' | 'bool';

export type PolicyKey = {
  key: string;
  kind: PolicyKind;
};

export const TOOL_POLICY_KEYS: Record<string, PolicyKey[]> = {
  local_shell: [
    { key: '_allowed_commands', kind: 'list' },
    { key: '_denied_commands', kind: 'list' },
    { key: '_allowed_dir', kind: 'path' },
    { key: '_allowed_tool_dirs', kind: 'list' },
  ],
  local_fs: [
    { key: '_allowed_dir', kind: 'path' },
    { key: '_denied_path_substrings', kind: 'list' },
    { key: '_skip_dir_names', kind: 'list' },
    { key: '_list_extensions', kind: 'list' },
    { key: '_use_gitignore', kind: 'bool' },
    { key: '_max_read_bytes', kind: 'number' },
    { key: '_max_output_bytes', kind: 'number' },
    { key: '_max_list_depth', kind: 'number' },
    { key: '_max_list_scan', kind: 'number' },
    { key: '_max_grep_matches', kind: 'number' },
    { key: '_max_find_results', kind: 'number' },
    { key: '_max_find_depth', kind: 'number' },
    { key: '_model_context_tokens', kind: 'number' },
    { key: '_verbose_tool_descriptions', kind: 'bool' },
  ],
  webtools: [
    { key: '_allowed_hosts', kind: 'list' },
    { key: '_denied_hosts', kind: 'list' },
    { key: '_allowed_schemes', kind: 'list' },
    { key: '_disallow_redirects', kind: 'bool' },
    { key: '_request_timeout_seconds', kind: 'number' },
    { key: '_max_response_bytes', kind: 'number' },
    { key: '_max_request_body_bytes', kind: 'number' },
    { key: '_max_attempts', kind: 'number' },
    { key: '_initial_backoff_ms', kind: 'number' },
    { key: '_max_backoff_ms', kind: 'number' },
  ],
  'native-git': [{ key: '_allowed_dir', kind: 'path' }],
};

export function policyKeysFor(toolset: string): PolicyKey[] {
  return TOOL_POLICY_KEYS[toolset] ?? [];
}

export function hasPolicies(toolset: string): boolean {
  return policyKeysFor(toolset).length > 0;
}

export function validPolicyValue(kind: PolicyKind, value: string): boolean {
  const v = value.trim();
  if (v === '') return true;
  if (kind === 'number') return /^-?\d+$/.test(v);
  if (kind === 'bool') return v === 'true' || v === 'false';
  return true;
}

export function policyLabelKey(key: string): string {
  return 'connectors.rules.keys.' + key.replace(/^_/, '');
}
