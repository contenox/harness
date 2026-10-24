import { apiFetch } from './fetch';
import {
  Agent,
  AuthenticatedUser,
  AuthStatus,
  Backend,
  BackendRuntimeState,
  ChainDefinition,
  CLIConfig,
  CLIConfigUpdateRequest,
  CLIConfigUpdateResponse,
  CloudProviderType,
  ConfigureProviderInput,
  DispatchRequest,
  DispatchResult,
  FleetEntry,
  HITLApproval,
  HITLPolicy,
  LocalHook,
  MCPServer,
  Mission,
  MissionChangesResponse,
  MissionFileDiff,
  MissionReport,
  ModelDescriptor,
  ModelRegistryEntry,
  OperatorInboxItem,
  RemoteHook,
  SetupStatus,
  ShellEnvResponse,
  ShellEnvUpdateRequest,
  StatusResponse,
  SupportedProvider,
  TaskExecutionRequest,
  TaskExecutionResponse,
  TerminalSession,
  TerminalSessionRequest,
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

const localAuthenticatedUser: AuthenticatedUser = {
  id: 'local-user',
  subject: 'local-user',
  email: 'local@localhost',
  friendlyName: 'Local user',
  username: 'local-user',
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
  getRemoteHooks: (params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit !== undefined) search.set('limit', params.limit.toString());
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return apiFetch<RemoteHook[]>(`/api/tools/remote${qs}`);
  },

  getRemoteHook: (id: string) => apiFetch<RemoteHook>(`/api/tools/remote/${id}`),

  getRemoteHookByName: (name: string) => apiFetch<RemoteHook>(`/api/tools/remote/by-name/${name}`),

  createRemoteHook: (data: Partial<RemoteHook>) =>
    apiFetch<RemoteHook>('/api/tools/remote', options('POST', data)),

  updateRemoteHook: (id: string, data: Partial<RemoteHook>) =>
    apiFetch<RemoteHook>(`/api/tools/remote/${id}`, options('PUT', data)),

  deleteRemoteHook: (id: string) => apiFetch<string>(`/api/tools/remote/${id}`, options('DELETE')),
  getLocalHooks: () => apiFetch<LocalHook[]>('/api/tools/local'),

  getRemoteHookSchemas: () => apiFetch<Record<string, unknown>>('/api/tools/schemas'),

  getMcpServers: (params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit !== undefined) search.set('limit', params.limit.toString());
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return apiFetch<MCPServer[]>(`/api/mcp-servers${qs}`);
  },
  getMcpServer: (id: string) => apiFetch<MCPServer>(`/api/mcp-servers/${id}`),
  getMcpServerByName: (name: string) =>
    apiFetch<MCPServer>(`/api/mcp-servers/by-name/${encodeURIComponent(name)}`),
  createMcpServer: (data: Partial<MCPServer>) =>
    apiFetch<MCPServer>('/api/mcp-servers', options('POST', data)),
  updateMcpServer: (id: string, data: Partial<MCPServer>) =>
    apiFetch<MCPServer>(`/api/mcp-servers/${id}`, options('PUT', data)),
  deleteMcpServer: (id: string) => apiFetch<string>(`/api/mcp-servers/${id}`, options('DELETE')),
  startMcpOAuth: (id: string, body: { redirectBase: string }) =>
    apiFetch<{ authorizationUrl: string }>(
      `/api/mcp-servers/${id}/oauth/start`,
      options('POST', body),
    ),

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

  createTerminalSession: (data: TerminalSessionRequest) =>
    apiFetch<TerminalSession>('/api/terminal/sessions', options('POST', data)),
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
  getPolicy: (name: string) =>
    apiFetch<HITLPolicy>(`/api/hitl-policies?name=${encodeURIComponent(name)}`),
  createPolicy: (name: string, policy: HITLPolicy) =>
    apiFetch<HITLPolicy>(
      `/api/hitl-policies?name=${encodeURIComponent(name)}`,
      options('POST', policy),
    ),
  updatePolicy: (name: string, policy: HITLPolicy) =>
    apiFetch<HITLPolicy>(
      `/api/hitl-policies?name=${encodeURIComponent(name)}`,
      options('PUT', policy),
    ),
  deletePolicy: (name: string) =>
    apiFetch<string>(`/api/hitl-policies?name=${encodeURIComponent(name)}`, options('DELETE')),

  getRuntimeBackendState: () => apiFetch<BackendRuntimeState[]>('/api/state'),

  taskEvents(requestId: string): EventSource {
    return new EventSource(`/api/task-events?requestId=${encodeURIComponent(requestId)}`);
  },

  configureProvider: (provider: CloudProviderType, data: ConfigureProviderInput) =>
    apiFetch<StatusResponse>(`/api/providers/${provider}/configure`, options('POST', data)),

  getProviderStatus: (provider: CloudProviderType) =>
    apiFetch<StatusResponse>(`/api/providers/${provider}/status`),
  getSupportedProviders: () => apiFetch<SupportedProvider[]>('/api/providers/supported'),

  getCurrentUser: async (): Promise<AuthenticatedUser> => localAuthenticatedUser,

  getAuthStatus: () => apiFetch<AuthStatus>('/ui/auth-status', { credentials: 'same-origin' }),
  loginWithToken: (token: string) => apiFetch<AuthStatus>('/ui/login', options('POST', { token })),
  logout: () => apiFetch<AuthStatus>('/ui/logout', options('POST')),

  executeTaskChain: (
    data: TaskExecutionRequest,
    opts?: { signal?: AbortSignal; requestId?: string },
  ) => {
    const requestOptions = options('POST', data);
    if (opts?.requestId) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'X-Request-ID': opts.requestId,
      };
    }
    return apiFetch<TaskExecutionResponse>(`/api/tasks`, {
      ...requestOptions,
      signal: opts?.signal,
    });
  },

  listChains: () => apiFetch<string[]>('/api/taskchains/list'),
  getChain: (path: string) =>
    apiFetch<ChainDefinition>(`/api/taskchains?path=${encodeURIComponent(path)}`),
  createChain: (path: string, data: Partial<ChainDefinition>) =>
    apiFetch<ChainDefinition>(
      `/api/taskchains?path=${encodeURIComponent(path)}`,
      options('POST', data),
    ),
  updateChain: (path: string, data: Partial<ChainDefinition>) =>
    apiFetch<ChainDefinition>(
      `/api/taskchains?path=${encodeURIComponent(path)}`,
      options('PUT', data),
    ),
  deleteChain: (path: string) =>
    apiFetch<void>(`/api/taskchains?path=${encodeURIComponent(path)}`, options('DELETE')),

  listModelRegistry: () => apiFetch<ModelDescriptor[]>('/api/model-registry'),
  createModelRegistryEntry: (data: Omit<ModelRegistryEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<ModelRegistryEntry>('/api/model-registry', options('POST', data)),
  deleteModelRegistryEntry: (id: string) =>
    apiFetch<void>(`/api/model-registry/${encodeURIComponent(id)}`, options('DELETE')),
  downloadModel: (name: string) =>
    apiFetch<string>('/api/model-registry/download', {
      ...options('POST', { name }),
      timeoutMs: null,
    }),
};
