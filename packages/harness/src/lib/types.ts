import type { InlineAttachment } from '@contenox/ui';
export type { InlineAttachment };

export type Backend = {
  id: string;
  name: string;
  baseUrl: string;
  type: string;
  models: string[];
  pulledModels: ObservedModel[];
  error: string;
  errorCode?: string;
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
  errorCode?: string;
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
  | 'vertex-google'
  | 'vllm';

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

export type ConnectionConfigState = 'missing' | 'configured' | 'invalid';
export type ConnectionAuthState =
  | 'not_required'
  | 'authenticated'
  | 'login_required'
  | 'refresh_required'
  | 'login_pending';
export type ConnectionHealth = 'unknown' | 'checking' | 'available' | 'unavailable';
export type BackendErrorCode =
  | 'login_required'
  | 'unauthorized'
  | 'unreachable'
  | 'no_models'
  | 'model_unavailable'
  | 'misconfigured';

/** A configured provider instance (runtime backend + credentials + auth). Secrets are never returned. */
export type Connection = {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string;
  configState: ConnectionConfigState;
  authState: ConnectionAuthState;
  health: ConnectionHealth;
  errorCode?: BackendErrorCode | string;
  error?: string;
  secretSource: 'none' | 'literal' | 'env';
  secretConfigured: boolean;
  secretPresent: boolean;
  apiKeyEnv?: string;
  modelCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateConnectionInput = {
  name?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  baseUrl?: string;
};

export type PatchConnectionInput = CreateConnectionInput & { clearSecret?: boolean };

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

export type Operation = {
  operation: string;
  subject: string;
};

export type Alert = {
  id: string;
  requestID: string;
  metadata: unknown;
  message: string;
  timestamp: string;
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

export type WorkspaceRoot = {
  path: string;
  default: boolean;
  name?: string;
  managed?: boolean;
};

export type WorkspaceRootsResponse = {
  roots: WorkspaceRoot[];
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
