import { apiFetch } from './fetch';
import {
  Agent,
  AuthStatus,
  Backend,
  BackendRuntimeState,
  CLIConfig,
  CLIConfigUpdateRequest,
  CLIConfigUpdateResponse,
  CloudProviderType,
  Connection,
  CreateConnectionInput,
  PatchConnectionInput,
  DispatchRequest,
  DispatchResult,
  Envelope,
  FleetEntry,
  HITLApproval,
  Mission,
  MissionChangesResponse,
  MissionFileDiff,
  MissionReport,
  AgentPreset,
  AgentPresetInstallResult,
  AgentRecord,
  OperatorInboxItem,
  ProviderLoginStart,
  ProviderLoginStatus,
  SetupStatus,
  ShellEnvResponse,
  ShellEnvUpdateRequest,
  StatusResponse,
  WorkspaceRootsResponse,
} from './types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  credentials?: RequestCredentials;
}

const options = (method: HttpMethod, data?: unknown): ApiOptions => {
  const options: ApiOptions = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  return options;
};

const normalizeSetupStatus = (raw: SetupStatus): SetupStatus => ({
  ...raw,
  defaultModel: raw.defaultModel ?? '',
  defaultProvider: raw.defaultProvider ?? '',
  defaultChain: raw.defaultChain ?? '',
  hitlPolicyName: raw.hitlPolicyName ?? '',
  backendCount: raw.backendCount ?? 0,
  reachableBackendCount: raw.reachableBackendCount ?? 0,
  issues: Array.isArray(raw.issues) ? raw.issues : [],
  backendChecks: Array.isArray(raw.backendChecks) ? raw.backendChecks : [],
});

export const api = {
  getAgents: (params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit !== undefined) search.set('limit', params.limit.toString());
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return apiFetch<Agent[]>(`/api/agents${qs}`);
  },
  getAgentByName: (name: string) =>
    apiFetch<Agent>(`/api/agents/by-name/${encodeURIComponent(name)}`),

  getFleet: () => apiFetch<FleetEntry[]>('/api/fleet'),
  stopInstance: (instanceId: string) =>
    apiFetch<string>(`/api/fleet/${encodeURIComponent(instanceId)}`, options('DELETE')),
  cancelInstance: (instanceId: string, sessionId?: string) =>
    apiFetch<string>(
      `/api/fleet/${encodeURIComponent(instanceId)}/cancel`,
      sessionId ? options('POST', { sessionId }) : options('POST'),
    ),

  listMissions: (params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit !== undefined) search.set('limit', params.limit.toString());
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return apiFetch<Mission[]>(`/api/missions${qs}`);
  },
  getMission: (id: string) => apiFetch<Mission>(`/api/missions/${encodeURIComponent(id)}`),
  listMissionReports: (missionId: string) =>
    apiFetch<MissionReport[]>(`/api/missions/${encodeURIComponent(missionId)}/reports`),

  getMissionChanges: (missionId: string) =>
    apiFetch<MissionChangesResponse>(`/api/missions/${encodeURIComponent(missionId)}/changes`),
  getMissionChangeDiff: (missionId: string, path: string) =>
    apiFetch<MissionFileDiff>(
      `/api/missions/${encodeURIComponent(missionId)}/changes/diff?path=${encodeURIComponent(path)}`,
    ),
  dispatchMission: (data: DispatchRequest) =>
    apiFetch<DispatchResult>('/api/fleet/dispatch', options('POST', data)),

  listApprovals: (limit?: number) => {
    const qs = limit !== undefined ? `?limit=${encodeURIComponent(limit)}` : '';
    return apiFetch<HITLApproval[]>(`/api/approvals${qs}`);
  },
  replyToAsk: (id: string, answer: string) =>
    apiFetch<string>(`/api/approvals/${encodeURIComponent(id)}`, options('POST', { answer })),

  answerApproval: (id: string, approved: boolean) =>
    apiFetch<string>(`/api/approvals/${encodeURIComponent(id)}`, options('POST', { approved })),

  getOperatorInbox: (limit?: number) => {
    const qs = limit !== undefined ? `?limit=${encodeURIComponent(limit)}` : '';
    return apiFetch<OperatorInboxItem[]>(`/api/operator-inbox${qs}`);
  },

  getWorkspaceRoots: () => apiFetch<WorkspaceRootsResponse>('/api/workspace/roots'),
  addWorkspaceRoot: (body: { path: string; name: string }) =>
    apiFetch<WorkspaceRootsResponse>('/api/workspace/roots', options('POST', body)),
  removeWorkspaceRoot: (path: string) =>
    apiFetch<WorkspaceRootsResponse>(
      `/api/workspace/roots?path=${encodeURIComponent(path)}`,
      options('DELETE'),
    ),

  deleteTerminalSession: (id: string) =>
    apiFetch<void>(`/api/terminal/sessions/${encodeURIComponent(id)}`, options('DELETE')),

  getBackends: () => apiFetch<Backend[]>('/api/backends'),
  getBackend: (id: string) => apiFetch<Backend>(`/api/backends/${id}`),
  createBackend: (data: Partial<Backend>) =>
    apiFetch<Backend>('/api/backends', options('POST', data)),
  updateBackend: (id: string, data: Partial<Backend>) =>
    apiFetch<Backend>(`/api/backends/${id}`, options('PUT', data)),
  deleteBackend: (id: string) => apiFetch<void>(`/api/backends/${id}`, options('DELETE')),
  getSetupStatus: async (): Promise<SetupStatus> =>
    normalizeSetupStatus(await apiFetch<SetupStatus>('/api/setup-status')),
  refreshSetupStatus: async (): Promise<SetupStatus> =>
    normalizeSetupStatus(await apiFetch<SetupStatus>('/api/setup/refresh', options('POST'))),
  getCLIConfig: () => apiFetch<CLIConfig>('/api/cli-config'),
  putCLIConfig: (body: CLIConfigUpdateRequest) =>
    apiFetch<CLIConfigUpdateResponse>('/api/cli-config', options('PUT', body)),

  getShellEnv: () => apiFetch<ShellEnvResponse>('/api/shell-env'),
  putShellEnv: (body: ShellEnvUpdateRequest) =>
    apiFetch<ShellEnvResponse>('/api/shell-env', options('PUT', body)),

  listPolicies: () => apiFetch<string[]>('/api/hitl-policies/list'),
  listEnvelopes: () => apiFetch<Envelope[]>('/api/envelopes'),

  getRuntimeBackendState: () => apiFetch<BackendRuntimeState[]>('/api/state'),

  getProviderStatus: (provider: CloudProviderType) =>
    apiFetch<StatusResponse>(`/api/providers/${provider}/status`),

  /** @deprecated the Agents view reads the declaration folder through the desktop bridge. */
  listAgentPresets: () => apiFetch<AgentPreset[]>('/api/agent-presets'),
  /** @deprecated the Agents view reads the declaration folder through the desktop bridge. */
  installAgentPreset: (name: string, force = false) =>
    apiFetch<AgentPresetInstallResult>(
      `/api/agent-presets/${encodeURIComponent(name)}${force ? '?force=true' : ''}`,
      options('POST'),
    ),
  listAgents: () => apiFetch<AgentRecord[]>('/api/agents?limit=100'),
  updateAgent: (agent: AgentRecord) =>
    apiFetch<AgentRecord>(`/api/agents/${encodeURIComponent(agent.id)}`, options('PUT', agent)),
  deleteAgent: (id: string) =>
    apiFetch<string>(`/api/agents/${encodeURIComponent(id)}`, options('DELETE')),

  startProviderLogin: (provider: CloudProviderType) =>
    apiFetch<ProviderLoginStart>(`/api/providers/${provider}/login`, options('POST')),
  getProviderLogin: (provider: CloudProviderType) =>
    apiFetch<ProviderLoginStatus>(`/api/providers/${provider}/login`),
  logoutProvider: (provider: CloudProviderType) =>
    apiFetch<string>(`/api/providers/${provider}/login`, options('DELETE')),

  cancelProviderLogin: (provider: CloudProviderType) =>
    apiFetch<ProviderLoginStatus>(`/api/providers/${provider}/login/cancel`, options('POST')),

  listConnections: () => apiFetch<Connection[]>('/api/providers/connections'),
  createConnection: (providerType: string, data: CreateConnectionInput) =>
    apiFetch<Connection>(
      `/api/providers/${encodeURIComponent(providerType)}/connections`,
      options('POST', data),
    ),
  patchConnection: (id: string, data: PatchConnectionInput) =>
    apiFetch<Connection>(
      `/api/providers/connections/${encodeURIComponent(id)}`,
      options('PATCH', data),
    ),
  deleteConnection: (id: string) =>
    apiFetch<string>(`/api/providers/connections/${encodeURIComponent(id)}`, options('DELETE')),
  checkConnection: (id: string) =>
    apiFetch<Connection>(
      `/api/providers/connections/${encodeURIComponent(id)}/check`,
      // A synchronous discovery cycle can take up to 30s on the runtime side.
      { ...options('POST'), timeoutMs: 45_000 },
    ),
  startConnectionLogin: (id: string) =>
    apiFetch<ProviderLoginStart>(
      `/api/providers/connections/${encodeURIComponent(id)}/login`,
      options('POST'),
    ),
  getConnectionLogin: (id: string) =>
    apiFetch<ProviderLoginStatus>(`/api/providers/connections/${encodeURIComponent(id)}/login`),
  cancelConnectionLogin: (id: string) =>
    apiFetch<ProviderLoginStatus>(
      `/api/providers/connections/${encodeURIComponent(id)}/login/cancel`,
      options('POST'),
    ),
  logoutConnection: (id: string) =>
    apiFetch<string>(
      `/api/providers/connections/${encodeURIComponent(id)}/login`,
      options('DELETE'),
    ),

  getAuthStatus: () => apiFetch<AuthStatus>('/ui/auth-status', { credentials: 'same-origin' }),
  loginWithToken: (token: string) => apiFetch<AuthStatus>('/ui/login', options('POST', { token })),
  logout: () => apiFetch<AuthStatus>('/ui/logout', options('POST')),

  listChains: () => apiFetch<string[]>('/api/taskchains/list'),
};
