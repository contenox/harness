
import type {
  PermissionOptionKind as SdkPermissionOptionKind,
  PlanEntryPriority as SdkPlanEntryPriority,
  PlanEntryStatus as SdkPlanEntryStatus,
  StopReason as SdkStopReason,
  ToolCallStatus as SdkToolCallStatus,
} from '@agentclientprotocol/sdk';


export const ACP_PROTOCOL_VERSION = 1;





export interface Implementation {
  name: string;
  title?: string;
  version?: string;
}

export interface FileSystemCapabilities {
  readTextFile?: boolean;
  writeTextFile?: boolean;
}

export interface AuthCapabilities {
  terminal?: boolean;
}

export interface SessionConfigOptionsCapabilities {
  boolean?: Record<string, never>;
}

export interface ClientSessionCapabilities {
  configOptions?: SessionConfigOptionsCapabilities;
}

export interface ClientCapabilities {
  fs?: FileSystemCapabilities;
  terminal?: boolean;
  session?: ClientSessionCapabilities;
  auth?: AuthCapabilities;
}

export interface PromptCapabilities {
  image?: boolean;
  audio?: boolean;
  embeddedContext?: boolean;
}

export interface McpCapabilities {
  http?: boolean;
  sse?: boolean;
}

export interface SessionCapabilities {
  list?: Record<string, never>;
  resume?: Record<string, never>;
  close?: Record<string, never>;
  delete?: Record<string, never>;
}

export interface AgentCapabilities {
  loadSession?: boolean;
  promptCapabilities?: PromptCapabilities;
  mcpCapabilities?: McpCapabilities;
  sessionCapabilities?: SessionCapabilities;
}

export type AuthMethodType = 'terminal' | 'env_var' | '';

export interface AuthEnvVar {
  name: string;
  label?: string;
  secret?: boolean;
  optional?: boolean;
}

export interface AuthMethod {
  id: string;
  name: string;
  description?: string;
  type?: AuthMethodType;
  args?: string[];
  env?: Record<string, string>;
  vars?: AuthEnvVar[];
  link?: string;
}

export interface InitializeResponse {
  protocolVersion: number;
  agentCapabilities?: AgentCapabilities;
  agentInfo?: Implementation;
  authMethods?: AuthMethod[];
  _meta?: Record<string, unknown>;
}


export const WORKSPACE_CONFIG_OPTIONS_META_KEY = 'contenox.workspaceConfigOptions';

export function workspaceConfigOptionsFromInit(init: InitializeResponse): SessionConfigOption[] {
  const raw = init._meta?.[WORKSPACE_CONFIG_OPTIONS_META_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is SessionConfigOption =>
      typeof o === 'object' && o !== null && typeof (o as SessionConfigOption).id === 'string',
  );
}


export const AGENT_META_KEY = 'contenox.agent';

export function externalAgentFromMeta(
  meta: Record<string, unknown> | undefined | null,
): string | null {
  const raw = meta?.[AGENT_META_KEY];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}


export const MISSION_META_KEY = 'contenox.mission';

export function missionFromMeta(meta: Record<string, unknown> | undefined | null): string | null {
  const raw = meta?.[MISSION_META_KEY];
  if (typeof raw !== 'object' || raw === null) return null;
  const id = (raw as { missionId?: unknown }).missionId;
  return typeof id === 'string' && id.trim() !== '' ? id.trim() : null;
}


export const MISSION_ASK_META_KEY = 'contenox.missionAsk';

export interface MissionAsk {
  askId: string;
  missionId: string;
  agentName?: string;
  intent?: string;
  summary: string;
  detail?: string;
}

export function missionAskFromMeta(
  meta: Record<string, unknown> | undefined | null,
): MissionAsk | null {
  const raw = meta?.[MISSION_ASK_META_KEY];
  if (typeof raw !== 'object' || raw === null) return null;
  const ask = raw as Partial<MissionAsk>;
  if (typeof ask.askId !== 'string' || ask.askId.trim() === '') return null;
  if (typeof ask.summary !== 'string' || ask.summary.trim() === '') return null;
  return {
    askId: ask.askId.trim(),
    missionId: typeof ask.missionId === 'string' ? ask.missionId : '',
    agentName: typeof ask.agentName === 'string' ? ask.agentName : undefined,
    intent: typeof ask.intent === 'string' ? ask.intent : undefined,
    summary: ask.summary,
    detail: typeof ask.detail === 'string' ? ask.detail : undefined,
  };
}

export function agentMeta(name: string): Record<string, unknown> {
  return { [AGENT_META_KEY]: name };
}

export interface AuthenticateResponse {
  _meta?: unknown;
}





export type ContentBlockKind = 'text' | 'image' | 'audio' | 'resource' | 'resource_link';

export interface EmbeddedResource {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface Annotations {
  audience?: string[];
  priority?: number;
}

export interface ContentBlock {
  type: ContentBlockKind | string;
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  name?: string;
  title?: string;
  description?: string;
  size?: number;
  resource?: EmbeddedResource;
  annotations?: Annotations;
}

export function textContent(text: string): ContentBlock {
  return { type: 'text', text };
}

export function imageContent(data: string, mimeType: string): ContentBlock {
  return { type: 'image', data, mimeType };
}

export function audioContent(data: string, mimeType: string): ContentBlock {
  return { type: 'audio', data, mimeType };
}

export interface ImagePart {
  data: string;
  mimeType: string;
}

export function imagePartFromBlock(block: ContentBlock): ImagePart | null {
  if (block.type !== 'image') return null;
  if (typeof block.data !== 'string' || block.data === '') return null;
  if (typeof block.mimeType !== 'string' || block.mimeType === '') return null;
  return { data: block.data, mimeType: block.mimeType };
}

export interface AudioPart {
  data: string;
  mimeType: string;
}

export function audioPartFromBlock(block: ContentBlock): AudioPart | null {
  if (block.type !== 'audio') return null;
  if (typeof block.data !== 'string' || block.data === '') return null;
  if (typeof block.mimeType !== 'string' || block.mimeType === '') return null;
  return { data: block.data, mimeType: block.mimeType };
}





export type ToolKind =
  'read' | 'edit' | 'delete' | 'move' | 'search' | 'execute' | 'think' | 'fetch' | 'other';

export type ToolCallStatus = SdkToolCallStatus;

export interface ToolCallLocation {
  path: string;
  line?: number;
}

export type ToolCallContentKind = 'content' | 'diff' | 'terminal';

export interface ToolCallContent {
  type: ToolCallContentKind;
  content?: ContentBlock;
  path?: string;
  oldText?: string;
  newText?: string;
  terminalId?: string;
}





export type PlanEntryPriority = SdkPlanEntryPriority;
export type PlanEntryStatus = SdkPlanEntryStatus;

export interface PlanEntry {
  content: string;
  priority: PlanEntryPriority;
  status: PlanEntryStatus;
}

export interface AvailableCommandInput {
  hint?: string;
}

export interface AvailableCommand {
  name: string;
  description: string;
  input?: AvailableCommandInput;
}





export type SessionId = string;

export interface EnvVariable {
  name: string;
  value: string;
}

export interface HttpHeader {
  name: string;
  value: string;
}

export type McpServerKind = '' | 'http' | 'sse';

export interface McpServer {
  type?: McpServerKind;
  name: string;
  command?: string;
  args?: string[];
  env?: EnvVariable[];
  url?: string;
  headers?: HttpHeader[];
}

export interface SessionMode {
  id: string;
  name: string;
  description?: string;
}

export interface SessionModeState {
  currentModeId: string;
  availableModes: SessionMode[];
}

export interface SessionConfigValue {
  value: string;
  name: string;
  description?: string;
}

export interface SessionConfigGroup {
  group: string;
  name: string;
  options: SessionConfigValue[];
}

export type SessionConfigOptionValues = SessionConfigValue[] | SessionConfigGroup[];

export interface SessionConfigOption {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type: string;
  currentValue: string;
  options: SessionConfigOptionValues;
}

export interface NewSessionResponse {
  sessionId: SessionId;
  modes?: SessionModeState;
  configOptions?: SessionConfigOption[];
  _meta?: Record<string, unknown>;
}

export interface LoadSessionResponse {
  modes?: SessionModeState;
  configOptions?: SessionConfigOption[];
}

export interface ResumeSessionResponse {
  modes?: SessionModeState;
  configOptions?: SessionConfigOption[];
}

export type SessionConfigOptionValue = string | boolean;

export interface SetSessionConfigOptionResponse {
  configOptions: SessionConfigOption[];
}

export interface SessionInfo {
  sessionId: SessionId;
  cwd?: string;
  title?: string;
  updatedAt?: string;
  _meta?: Record<string, unknown>;
}

export interface ListSessionsResponse {
  sessions: SessionInfo[];
  nextCursor?: string;
}





export type StopReason = SdkStopReason;











export interface PromptResponse {
  stopReason: StopReason;
  _meta?: Record<string, unknown>;
}

export interface UsageCost {
  amount: number;
  currency: string;
}





export type SessionUpdateKind =
  | 'user_message_chunk'
  | 'agent_message_chunk'
  | 'agent_thought_chunk'
  | 'tool_call'
  | 'tool_call_update'
  | 'plan'
  | 'available_commands_update'
  | 'current_mode_update'
  | 'config_option_update'
  | 'usage_update'
  | 'session_info_update'
  | typeof TERMINAL_OUTPUT_UPDATE_KIND;


export const TERMINAL_OUTPUT_UPDATE_KIND = '_contenox.terminalOutput';


export const TERMINAL_OUTPUT_META_KEY = 'contenox.terminalOutput';

export interface TerminalOutputPayload {
  sessionId: string;
  offset: number;
  chunk: string;
  reset?: boolean;
}

export function terminalOutputFromUpdate(update: {
  _meta?: Record<string, unknown>;
}): TerminalOutputPayload | null {
  const raw = update._meta?.[TERMINAL_OUTPUT_META_KEY];
  if (raw === null || typeof raw !== 'object') return null;
  const p = raw as Partial<TerminalOutputPayload>;
  if (typeof p.chunk !== 'string') return null;
  return {
    sessionId: typeof p.sessionId === 'string' ? p.sessionId : '',
    offset: typeof p.offset === 'number' ? p.offset : 0,
    chunk: p.chunk,
    reset: p.reset === true,
  };
}

interface ToolCallFields {
  toolCallId: string;
  title?: string;
  kind?: ToolKind;
  status?: ToolCallStatus;
  content?: ToolCallContent[];
  locations?: ToolCallLocation[];
  rawInput?: unknown;
  rawOutput?: unknown;
}

export type SessionUpdate =
  | { sessionUpdate: 'user_message_chunk'; content: ContentBlock; messageId?: string }
  | {
      sessionUpdate: 'agent_message_chunk';
      content: ContentBlock;
      messageId?: string;
      _meta?: Record<string, unknown>;
    }
  | { sessionUpdate: 'agent_thought_chunk'; content: ContentBlock; messageId?: string }
  | ({ sessionUpdate: 'tool_call' } & ToolCallFields)
  | ({ sessionUpdate: 'tool_call_update' } & ToolCallFields)
  | { sessionUpdate: 'plan'; entries: PlanEntry[] }
  | { sessionUpdate: 'available_commands_update'; availableCommands: AvailableCommand[] }
  | { sessionUpdate: 'current_mode_update'; currentModeId: string }
  | { sessionUpdate: 'config_option_update'; configOptions: SessionConfigOption[] }
  | { sessionUpdate: 'usage_update'; used: number; size: number; cost?: UsageCost }
  | { sessionUpdate: 'session_info_update'; title?: string; updatedAt?: string }
  | { sessionUpdate: typeof TERMINAL_OUTPUT_UPDATE_KIND; _meta?: Record<string, unknown> };

export interface SessionNotification {
  sessionId: SessionId;
  update: SessionUpdate;
  _meta?: Record<string, unknown>;
}


export const EVENT_SEQ_META_KEY = 'contenox.seq';

export function notificationSeq(n: SessionNotification): number {
  const seq = n._meta?.[EVENT_SEQ_META_KEY];
  return typeof seq === 'number' && seq > 0 ? seq : 0;
}





export type PermissionOptionKind = SdkPermissionOptionKind;

export interface PermissionOption {
  optionId: string;
  name: string;
  kind: PermissionOptionKind;
}

export interface PermissionToolCall {
  toolCallId: string;
  title?: string;
  kind?: ToolKind;
  status?: ToolCallStatus;
  content?: ToolCallContent[];
  locations?: ToolCallLocation[];
  rawInput?: unknown;
  rawOutput?: unknown;
  _meta?: Record<string, unknown>;
}

export interface RequestPermissionRequest {
  sessionId: SessionId;
  toolCall: PermissionToolCall;
  options: PermissionOption[];
  _meta?: Record<string, unknown>;
}

export type RequestPermissionOutcome =
  { outcome: 'cancelled' } | { outcome: 'selected'; optionId: string };

export interface RequestPermissionResponse {
  outcome: RequestPermissionOutcome;
}







export interface ReadTextFileRequest {
  sessionId: SessionId;
  path: string;
  line?: number;
  limit?: number;
}

export interface ReadTextFileResponse {
  content: string;
}

export interface WriteTextFileRequest {
  sessionId: SessionId;
  path: string;
  content: string;
}

export interface CreateTerminalRequest {
  sessionId: SessionId;
  command: string;
  args?: string[];
  env?: EnvVariable[];
  cwd?: string;
  outputByteLimit?: number;
}

export interface TerminalExitStatus {
  exitCode?: number;
  signal?: string;
}

export interface TerminalOutputRequest {
  sessionId: SessionId;
  terminalId: string;
}

export interface WaitForTerminalExitRequest {
  sessionId: SessionId;
  terminalId: string;
}

export interface KillTerminalRequest {
  sessionId: SessionId;
  terminalId: string;
}

export interface ReleaseTerminalRequest {
  sessionId: SessionId;
  terminalId: string;
}





export const JSON_RPC_ERROR_CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  authRequired: -32000,
  resourceNotFound: -32002,
} as const;

export interface WorkspaceEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export interface WorkspaceListing {
  path: string;
  entries: WorkspaceEntry[];
  truncated?: boolean;
}

export interface PlanEntryView {
  id: string;
  content: string;
  status: string;
  priority: string;
}

export interface MissionPlanView {
  entries: PlanEntryView[];
  revision: number;
  explanation?: string;
}

export interface PlanSummary {
  revision: number;
  explanation?: string;
  added: number;
  removed: number;
  pending: number;
  inProgress: number;
  completed: number;
  at: string;
}

export interface MissionRow {
  id: string;
  intent: string;
  agentName: string;
  hitlPolicyName: string;
  sessionId?: string;
  instanceId?: string;
  parentSessionId?: string;
  status: string;
  statusReason?: string;
  plan: MissionPlanView;
  planRevisions?: PlanSummary[];
  lastHeartbeat?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HandoverView {
  outcome?: string;
  artifacts?: string[];
  handoverForNext?: string;
  caveats?: string;
}

export interface ReportRow {
  id: string;
  missionId: string;
  kind: string;
  summary: string;
  detail?: string;
  refs?: string[];
  handover?: HandoverView;
  createdAt: string;
}

export interface OperatorItemRow {
  id: string;
  missionId: string;
  agentName?: string;
  intent?: string;
  parentSessionId?: string;
  reason: string;
  report: ReportRow;
  createdAt: string;
  acked?: boolean;
  ackedAt?: string;
}

export interface AssetActionParam {
  name: string;
  kind: 'text' | 'select' | 'boolean';
  values?: string[];
}

export interface AssetAction {
  id: string;
  label: string;
  kinds: string[];
  readOnly: boolean;
  hint?: string;
  params?: AssetActionParam[];
}

export interface AssetActionRunParams {
  [name: string]: string | boolean;
}

export interface AssetActionResult {
  ok: boolean;
  notice: string;
  artifact?: { path: string; kind: string };
}
