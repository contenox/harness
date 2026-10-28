import type { CapturedStateUnit, InlineAttachment } from '@contenox/ui';
export type { InlineAttachment };

export type ModelDescriptor = {
  id?: string;
  name: string;
  sourceUrl: string;
  sizeBytes: number;
  curated: boolean;
};

export type ModelRegistryEntry = {
  id: string;
  name: string;
  sourceUrl: string;
  sizeBytes: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Backend = {
  id: string;
  name: string;
  baseUrl: string;
  type: string;
  models: string[];
  pulledModels: ObservedModel[];
  error: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendRuntimeState = {
  id: string;
  name: string;
  models: string[];
  pulledModels: ObservedModel[];
  backend: Backend;
  error?: string;
};

export type ObservedModel = {
  name?: string;
  model: string;
  modifiedAt?: string;
  size?: number;
  digest?: string;
  contextLength: number;
  canChat: boolean;
  canEmbed: boolean;
  canPrompt: boolean;
  canStream: boolean;
};

export type LayoutDirection = 'horizontal' | 'vertical';

export type StateResponse = {
  response: string;
  state: CapturedStateUnit[];
  inputTokenCount: number;
  outputTokenCount: number;
  error?: string;
};

export type ChatContextArtifact = {
  kind: string;
  payload?: unknown;
};

export type { TaskEvent, TaskEventKind } from '@contenox/ui';

export type SetupIssue = {
  code: string;
  severity: string;
  category?: string;
  message: string;
  fixPath?: string;
  cliCommand?: string;
};

export type SetupBackendCheck = {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  status: string;
  reachable: boolean;
  defaultProvider: boolean;
  modelCount: number;
  chatModelCount: number;
  chatModels?: string[];
  error?: string;
  hint?: string;
};

export type ConfigResolvedFrom = {
  defaultChain?: 'workspace' | 'global';
  hitlPolicyName?: 'workspace' | 'global';
};

export type SetupStatus = {
  defaultModel: string;
  defaultProvider: string;
  defaultChain: string;
  hitlPolicyName: string;
  backendCount: number;
  reachableBackendCount: number;
  issues: SetupIssue[];
  backendChecks: SetupBackendCheck[];
  resolvedFrom?: ConfigResolvedFrom;
};

export type CLIConfigUpdateResponse = {
  defaultModel: string;
  defaultProvider: string;
  defaultAltModel?: string;
  defaultAltProvider?: string;
  defaultAutocompleteModel?: string;
  defaultAutocompleteProvider?: string;
  defaultMaxTokens?: string;
  defaultThink?: string;
  defaultChain: string;
  hitlPolicyName: string;
  telemetryEnabled?: string;
  updateCheck?: string;
  defaultMissionAgent?: string;
  defaultMissionPolicy?: string;
  resolvedFrom?: ConfigResolvedFrom;
};

export type CLIConfig = CLIConfigUpdateResponse;

export type CLIConfigUpdateRequest = {
  'default-model'?: string;
  'default-provider'?: string;
  'default-alt-model'?: string;
  'default-alt-provider'?: string;
  'default-autocomplete-model'?: string;
  'default-autocomplete-provider'?: string;
  'default-max-tokens'?: string;
  'default-think'?: string;
  'default-chain'?: string;
  'hitl-policy-name'?: string;
  'telemetry-enabled'?: string;
  'update-check'?: string;
  'default-mission-agent'?: string;
  'default-mission-policy'?: string;
};

export type ShellEnvResponse = {
  vars: Record<string, string>;
};

export type ShellEnvUpdateRequest = {
  vars: Record<string, string>;
};

export type HITLCondition = {
  key: string;
  op: 'eq' | 'glob';
  value: string;
};

export type HITLRule = {
  hook: string;
  tool: string;
  when?: HITLCondition[];
  action: 'allow' | 'approve' | 'deny';
  timeout_s?: number;
  on_timeout?: 'deny' | 'approve';
};

export type HITLPolicy = {
  default_action?: 'allow' | 'approve' | 'deny';
  rules: HITLRule[];
};

export type StatusResponse = {
  configured: boolean;
  provider: string;
  backendId?: string;
  backendName?: string;
  baseUrl?: string;
  secretSource?: string;
  secretConfigured?: boolean;
  secretPresent?: boolean;
  apiKeyEnv?: string;
  recommendedApiKeyEnv?: string;
  defaultProvider?: string;
  defaultModel?: string;
  updatedAt?: string;
  authState?: string;
  loginRequired?: boolean;
};

export type CloudProviderType =
  | 'ollama'
  | 'openai'
  | 'openai-codex'
  | 'openrouter'
  | 'deepseek'
  | 'anthropic'
  | 'gemini'
  | 'mistral'
  | 'bedrock'
  | 'vertex-google';

export type ConfigureProviderInput = {
  apiKey?: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  defaultModel?: string;
  upsert: boolean;
  setDefault?: boolean;
};

export type SupportedProvider = {
  provider: string;
  defaultBaseUrl?: string;
  requiresBaseUrl: boolean;
  requiresSecretConfig: boolean;
  requiresLogin?: boolean;
  recommendedApiKeyEnv?: string;
};

export type ProviderLoginStart = {
  provider: string;
  state: 'authenticated' | 'login_pending' | string;
  url?: string;
  code?: string;
  expiresAt?: string;
};

export type ProviderLoginStatus = ProviderLoginStart & {
  error?: string;
};

export type ModelJob = {
  url: string;
  model: string;
};

export type Job = {
  id: string;
  taskType: string;
  modelJob: ModelJob | undefined;
  scheduledFor: number;
  validUntil: number;
  createdAt: Date;
};

export type { CapturedStateUnit } from '@contenox/ui';

export type ErrorState = {
  error: string | null;
};

export type QueueItem = {
  url: string;
  model: string;
  status: QueueProgressStatus;
};

export type QueueProgressStatus = {
  total: number;
  completed: number;
  status: string;
};

export type Model = {
  id: string;
  model: string;
  contextLength: number;
  canChat: boolean;
  canEmbed: boolean;
  canPrompt: boolean;
  canStream: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Pool = {
  id: string;
  name: string;
  purposeType: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  user: User;
};

export type LocalHook = {
  name: string;
  description: string;
  type: string;
  source?: 'builtin' | 'mcp' | 'remote';
  tools: Tool[];
  unavailableReason?: string;
};

export type Agent = {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  configJson: unknown;
  harnessId?: string;
  workspaceId?: string;
  source?: string;
  registryId?: string;
  registryVersion?: string;
  createdAt: string;
  updatedAt: string;
};

export type FleetInstanceState = 'starting' | 'running' | 'stopped' | 'error' | 'warning';

export type InstanceStatus = {
  id: string;
  agentId: string;
  agentName: string;
  kind: string;
  state: FleetInstanceState;
  sessions: number;
  viewers: number;
  startedAt: string;
  sessionIds: string[];
};

export type FleetEntry = {
  agentId: string;
  agentName: string;
  kind: string;
  instances: InstanceStatus[] | null;
};

export type MissionStatus = 'open' | 'landed' | 'derailed' | 'stuck' | 'abandoned';

export type MissionPlanEntryStatus = 'pending' | 'in_progress' | 'completed';

export type MissionPlanEntryPriority = 'high' | 'medium' | 'low';

export type MissionPlanEntry = {
  id: string;
  content: string;
  status: MissionPlanEntryStatus;
  priority: MissionPlanEntryPriority;
};

export type MissionPlan = {
  entries: MissionPlanEntry[] | null;
  revision: number;
  explanation?: string;
};

export type PlanRevisionSummary = {
  revision: number;
  explanation?: string;
  added: number;
  removed: number;
  pending: number;
  inProgress: number;
  completed: number;
  at: string;
};

export type Mission = {
  id: string;
  intent: string;
  agentName: string;
  hitlPolicyName: string;
  sessionId?: string;
  instanceId?: string;
  parentSessionId?: string;
  status: MissionStatus;
  statusReason?: string;
  plan?: MissionPlan;
  planRevisions?: PlanRevisionSummary[];
  lastHeartbeat?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type MissionChangeStatus = 'added' | 'modified' | 'deleted';

export type MissionChangedFile = {
  path: string;
  status: MissionChangeStatus;
  score: number;
};

export type MissionChangeScope = {
  files: number;
  dirs: number;
  anomaly: boolean;
  outsidePaths?: string[];
};

export type MissionChangesResponse = {
  files: MissionChangedFile[];
  incomplete: boolean;
  scope: MissionChangeScope;
};

export type MissionFileDiff = {
  original: string;
  modified: string;
  truncated?: boolean;
};

export type WorkspaceSearchMatch = {
  path: string;
  line: number;
  column: number;
  length: number;
  preview: string;
};

export type WorkspaceSearchDone = {
  done: boolean;
  matches: number;
  truncated: boolean;
};

export type MissionReportKind = 'progress' | 'finding' | 'blocker' | 'result';

export type MissionReport = {
  id: string;
  missionId: string;
  kind: MissionReportKind;
  summary: string;
  detail?: string;
  refs?: string[];
  createdAt: string;
};

export type DispatchRequest = {
  agentName: string;
  intent: string;
  hitlPolicyName: string;
  cwd?: string;
};

export type DispatchResult = {
  instanceId: string;
  sessionId: string;
  missionId: string;
};

export type HITLApprovalState = 'pending' | 'approved' | 'denied' | 'expired';

export type HITLApproval = {
  id: string;
  toolsName: string;
  toolName: string;
  argsSummary?: string;
  diff?: string;
  policyName?: string;
  matchedRule?: number;
  onTimeout?: string;
  state: HITLApprovalState;
  resolution?: unknown;
  instanceId?: string;
  sessionId?: string;
  agentName?: string;
  missionId?: string;
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
};

export type OperatorInboxReason = 'operator_fired' | 'parent_gone';

export type OperatorInboxItem = {
  id: string;
  missionId: string;
  agentName?: string;
  intent?: string;
  parentSessionId?: string;
  reason: OperatorInboxReason;
  report: MissionReport;
  createdAt: string;
};

export type MCPServer = {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'http' | string;
  command?: string;
  args?: string[];
  url?: string;
  authType?: string;
  authToken?: string;
  authEnvKey?: string;
  connectTimeoutSeconds: number;
  headers?: Record<string, string>;
  injectParams?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

export type Tool = {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type User = {
  id: string;
  friendlyName: string;
  email: string;
  subject: string;
  password: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DownloadStatus = {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  model: string;
  baseUrl: string;
};

export type AccessEntry = {
  id: string;
  identity: string;
  resource: string;
  resourceType: string;
  permission: string;
  createdAt?: string;
  updatedAt?: string;
  identityDetails?: IdentityDetails;
  fileDetails?: filesDetails;
};

export type filesDetails = {
  id: string;
  path: string;
  type: string;
};

export type IdentityDetails = {
  id: string;
  friendlyName: string;
  email: string;
  subject: string;
};

export type UpdateUserRequest = {
  email?: string;
  subject?: string;
  friendlyName?: string;
  password?: string;
};

export type UpdateAccessEntryRequest = {
  identity?: string;
  resource?: string;
  permission?: string;
};

export type AuthenticatedUser = {
  id: string;
  subject: string;
  email: string;
  friendlyName: string;
  username: string;
  expiresAt?: string;
};

export type AuthStatus = {
  required: boolean;
  authenticated: boolean;
};

export type PendingJob = {
  id: string;
  taskType: string;
  operation: string;
  subject: string;
  entityId: string;
  scheduledFor: string;
  validUntil: string;
  retryCount: number;
  createdAt: string;
};

export type InProgressJob = PendingJob & {
  leaser: string;
  leaseExpiration: string;
};
export type Exec = {
  prompt: string;
};

export type ExecResp = {
  id: string;
  response: string;
};

export type TaskExecutionRequest = {
  input: unknown;
  inputType: string;
  chain: ChainDefinition;
  templateVars?: Record<string, string>;
};

export type TaskExecutionResponse = {
  output: unknown;
  outputType: string;
  state: CapturedStateUnit[];
};

export interface HookCall {
  name: string;
  tool_name?: string;
  args?: Record<string, string>;
}

export type ComposeStrategy = 'override' | 'merge_chat_histories' | 'append_string_to_chat_history';

export type OperatorTerm =
  | 'equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'lt'
  | 'in_range'
  | 'default';

export interface TransitionBranch {
  operator?: OperatorTerm;
  when: string;
  goto: string;
  compose?: BranchCompose;
}

export interface TaskTransition {
  on_failure?: string;
  branches: TransitionBranch[];
}

export type FormTransition = TaskTransition;

export interface ChainTask {
  id: string;
  description: string;
  handler: TaskHandler;
  system_instruction?: string;
  execute_config?: ExecuteConfig;
  tools?: HookCall;
  print?: string;
  prompt_template: string;
  output_template?: string;
  input_var?: string;
  transition: TaskTransition;
  timeout?: string;
  retry_on_failure?: number;
}

export type FormTask = Partial<ChainTask> & {
  id: string;
  handler: TaskHandler;
  prompt_template: string;
  transition: TaskTransition;
};

export interface RetryPolicy {
  max_attempts?: number;
  initial_backoff?: string;
  max_backoff?: string;
  jitter?: number;
  rate_limit_min_wait?: string;
  fallback_model_id?: string;
  fallback_after?: number;
}

export interface CompactPolicy {
  trigger_fraction?: number;
  keep_recent?: number;
  model?: string;
  provider?: string;
  max_failures?: number;
  min_replaced_messages?: number;
}

export interface ExecuteConfig {
  model?: string;
  models?: string[];
  provider?: string;
  providers?: string[];
  temperature?: number;
  tools?: string[];
  hooks?: string[];
  hide_tools?: string[];
  pass_clients_tools?: boolean;
  tools_policies?: Record<string, Record<string, string>>;
  hook_policies?: Record<string, Record<string, string>>;
  think?: string;
  shift?: boolean;
  retry_policy?: RetryPolicy;
  compact_policy?: CompactPolicy;
}

export interface ChainDefinition {
  id: string;
  description: string;
  tasks: ChainTask[];
  token_limit?: number;
  debug?: boolean;
}

export type ActivityLog = {
  id: string;
  operation: string;
  subject: string;
  start: string;
  end?: string;
  error?: string;
  entityID?: string;
  entityData?: undefined;
  durationMS?: number;
  metadata?: Record<string, string>;
  requestID?: string;
};

export type ActivityLogsResponse = ActivityLog[];

export type TrackedRequest = {
  id: string;
};

export type ActivityOperation = {
  operation: string;
  subject: string;
};

export type TrackedEvent = {
  id: string;
  operation: string;
  subject: string;
  start: string;
  end?: string;
  error?: string;
  entityID?: string;
  entityData?: unknown;
  durationMS?: number;
  metadata?: Record<string, string>;
  requestID?: string;
};

export type Operation = {
  operation: string;
  subject: string;
};

export type TrackedRequestsResponse = TrackedRequest[];
export type ActivityOperationsResponse = ActivityOperation[];

export type Alert = {
  id: string;
  requestID: string;
  metadata: unknown;
  message: string;
  timestamp: string;
};

export type ActivityAlertsResponse = Alert[];

export interface GitHubRepo {
  id: string;
  userID: string;
  botUserName: string;
  owner: string;
  repoName: string;
  accessToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  authorLogin: string;
}

export type TelegramFrontend = {
  id: string;
  userID: string;
  chatChain: string;
  description: string;
  botToken: string;
  syncInterval: number;
  status: string;
  lastOffset: number;
  lastHeartbeat?: string;
  lastError: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Bot = {
  id: string;
  name: string;
  botType: string;
  jobType: string;
  taskChainID: string;
  createdAt: string;
  updatedAt: string;
};

export type InternalEvent = {
  id: string;
  nid: number;
  created_at: string;
  event_type: string;
  event_source: string;
  aggregate_id: string;
  aggregate_type: string;
  version: number;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type RawEvent = {
  id: string;
  nid: number;
  received_at: string;
  path: string;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
};

export type MappingConfig = {
  path: string;
  eventType: string;
  eventSource: string;
  aggregateType: string;
  aggregateIDField: string;
  aggregateTypeField: string;
  eventTypeField: string;
  eventSourceField: string;
  eventIDField: string;
  version: number;
  metadataMapping: Record<string, string>;
};

export type EventStreamMessage = {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  version: number;
  data: Record<string, unknown>;
  created_at: string;
};

export type TaskRequest = {
  prompt: string;
  modelName: string;
  modelProvider: string;
};

export type TaskResponse = {
  id: string;
  response: string;
};

export type DataType = 'string' | 'json';

export type ExecutionHistory = {
  taskID: string;
  taskType: string;
  inputType: string;
  outputType: string;
  transition: string;
  duration: number;
  error?: string;
}[];

export type PaginationParams = {
  limit?: number;
  cursor?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
};

export type ValidationError = {
  field: string;
  message: string;
  code: string;
};

export type ApiError = {
  message: string;
  code: string;
  details?: ValidationError[];
};

export type WebhookPayload = {
  headers: Record<string, string>;
  body: Record<string, unknown>;
  query: Record<string, string>;
  method: string;
  path: string;
};

export interface BranchCompose {
  with_var?: string;
  strategy?: string;
}

export type IntegrationConfig = {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'event';
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemHealth = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: HealthStatus;
    cache: HealthStatus;
    executor: HealthStatus;
    eventBus: HealthStatus;
  };
  timestamp: string;
};

export type HealthStatus = {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  error?: string;
  lastChecked: string;
};

export interface BackendApiError {
  error: {
    message: string;
    type?: string;
    code?: string;
    param?: string;
  };
}

export type RemoteHook = {
  id: string;
  name: string;
  endpointUrl: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  properties: InjectionArg;
  createdAt?: string;
  updatedAt?: string;
};

export type InjectionArg = {
  name: string;
  value: unknown;
  in: 'path' | 'query' | 'body';
};

export type RemoteHookListResponse = {
  hooks: RemoteHook[];
  nextCursor?: string;
};

export interface DragResult {
  draggableId: string;
  source: {
    index: number;
    droppableId: string;
  };
  destination: {
    index: number;
    droppableId: string;
  } | null;
}

export interface DroppableProvided {
  innerRef: (element: HTMLElement | null) => void;
  droppableProps: {
    [key: string]: unknown;
  };
  placeholder?: React.ReactNode;
}

export interface DraggableProvided {
  innerRef: (element: HTMLElement | null) => void;
  draggableProps: {
    [key: string]: unknown;
    style?: React.CSSProperties;
  };
  dragHandleProps: {
    [key: string]: unknown;
  } | null;
}

export type TaskHandler =
  | 'raise_error'
  | 'route'
  | 'chat_completion'
  | 'execute_tool_calls'
  | 'noop'
  | 'tools';

export const HandleRaiseError: TaskHandler = 'raise_error';
export const HandleRoute: TaskHandler = 'route';
export const HandleChatCompletion: TaskHandler = 'chat_completion';
export const HandleExecuteToolCalls: TaskHandler = 'execute_tool_calls';
export const HandleNoop: TaskHandler = 'noop';
export const HandleTools: TaskHandler = 'tools';

export type WorkspaceRoot = {
  path: string;
  default: boolean;
  name?: string;
  managed?: boolean;
};

export type WorkspaceRootsResponse = {
  roots: WorkspaceRoot[];
};

export type TerminalSessionRequest = {
  cwd?: string;
  cols: number;
  rows: number;
  shell?: string;
};

export type TerminalSession = {
  id: string;
  wsPath: string;
};

export type AgentPreset = {
  name: string;
  title: string;
  description: string;
  installed: boolean;
  path?: string;
};

export type AgentRecord = {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  configJson?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type AgentPresetInstallResult = {
  preset: string;
  path: string;
  installed: boolean;
  reason?: string;
  agent?: { id: string; name: string; kind: string; enabled: boolean } | null;
};
