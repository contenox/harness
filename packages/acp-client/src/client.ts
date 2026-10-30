
import type { ErrorResponse } from '@agentclientprotocol/sdk';
import type { AcpCapabilityProvider } from './clientFactory';
import type { Transport } from './transport';
import {
  ACP_PROTOCOL_VERSION,
  audioPartFromBlock,
  imagePartFromBlock,
  JSON_RPC_ERROR_CODES,
  TERMINAL_OUTPUT_UPDATE_KIND,
  terminalOutputFromUpdate,
  type AudioPart,
  type AvailableCommand,
  type ClientCapabilities,
  type ContentBlock,
  type ImagePart,
  type Implementation,
  type InitializeResponse,
  type ListSessionsResponse,
  type LoadSessionResponse,
  type McpServer,
  type NewSessionResponse,
  type PlanEntry,
  type PromptResponse,
  type RequestPermissionRequest,
  type ResumeSessionResponse,
  type SessionConfigOption,
  type SessionConfigOptionValue,
  type SessionId,
  type SessionNotification,
  notificationSeq,
  type SessionUpdate,
  type SetSessionConfigOptionResponse,
  type TerminalOutputPayload,
  type ToolCallContent,
  type ToolCallLocation,
  type ToolCallStatus,
  type ToolKind,
  type UsageCost,
  type WorkspaceListing,
  type MissionRow,
  type OperatorItemRow,
  type ReportRow,
} from './types';
import type { AssetAction, AssetActionRunParams, AssetActionResult } from './types';







type JsonRpcId = number | string | null;

interface JsonRpcRequestFrame {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcNotificationFrame {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

interface JsonRpcResponseFrame {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: ErrorResponse;
}

export class AcpError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(errorObject: ErrorResponse) {
    super(errorObject.message);
    this.name = 'AcpError';
    this.code = errorObject.code;
    this.data = errorObject.data;
  }
}

export interface ToolCallEvent {
  updateKind: 'tool_call' | 'tool_call_update';
  toolCallId: string;
  title?: string;
  kind?: ToolKind;
  status?: ToolCallStatus;
  content?: ToolCallContent[];
  locations?: ToolCallLocation[];
  rawInput?: unknown;
  rawOutput?: unknown;
  /** Provider or agent annotations, passed through untouched. */
  meta?: Record<string, unknown>;
}

export interface UsageEvent {
  used: number;
  size: number;
  cost?: UsageCost;
}

export interface SessionInfoEvent {
  title?: string;
  updatedAt?: string;
}

export interface SessionEventHandlers {
  onMessageChunk?: (
    text: string,
    messageId?: string,
    image?: ImagePart,
    meta?: Record<string, unknown>,
    audio?: AudioPart,
  ) => void;
  onThoughtChunk?: (text: string, messageId?: string) => void;
  onUserMessageChunk?: (
    text: string,
    messageId?: string,
    image?: ImagePart,
    audio?: AudioPart,
  ) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  onEventSeq?: (seq: number) => void;
  onPlan?: (entries: PlanEntry[]) => void;
  onUsage?: (usage: UsageEvent) => void;
  onAvailableCommands?: (commands: AvailableCommand[]) => void;
  onConfigOptions?: (configOptions: SessionConfigOption[]) => void;
  onSessionInfo?: (info: SessionInfoEvent) => void;
  onTerminalOutput?: (payload: TerminalOutputPayload) => void;
  onPermissionRequest?: (request: RequestPermissionRequest) => Promise<string>;
}

export type PromptHandlers = SessionEventHandlers;

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

const UNSUPPORTED_CLIENT_METHODS = new Set([
  'fs/read_text_file',
  'fs/write_text_file',
  'terminal/create',
  'terminal/output',
  'terminal/wait_for_exit',
  'terminal/kill',
  'terminal/release',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}




function normalizeListedPath(path: string | undefined): string {
  if (path === undefined || path === '') return '';
  const cleaned = path.replace(/^\.\/+/, '').replace(/^\/+|\/+$/g, '');
  return cleaned === '.' ? '' : cleaned;
}



function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}


function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export interface AcpClientOptions {
  capabilities?: AcpCapabilityProvider;
}

const WORKSPACE_CONFIG_CHANGED = '_contenox/workspaceConfigOptionsChanged';

function configOptionsOf(value: unknown): SessionConfigOption[] | null {
  if (!isRecord(value) || !Array.isArray(value.configOptions)) return null;
  return value.configOptions as SessionConfigOption[];
}

export class AcpClient {
  private readonly transport: Transport;
  private nextId = 1;
  private readonly pending = new Map<number, PendingCall>();
  private readonly activePrompts = new Map<SessionId, SessionEventHandlers>();

  private readonly subscriptions = new Map<SessionId, SessionEventHandlers>();
  private readonly capabilityProvider?: AcpCapabilityProvider;
  private readonly workspaceConfigListeners = new Set<(options: SessionConfigOption[]) => void>();
  private closed = false;

  constructor(transport: Transport, opts: AcpClientOptions = {}) {
    this.transport = transport;
    this.capabilityProvider = opts.capabilities;
    this.transport.onMessage(text => this.handleMessage(text));
    this.transport.onClose(err => this.handleClose(err));
  }





  private handleClose(err?: Error): void {
    this.closed = true;
    const failure = err ?? new Error('acp: transport closed');
    for (const call of this.pending.values()) {
      call.reject(failure);
    }
    this.pending.clear();
    this.activePrompts.clear();
    this.subscriptions.clear();
    this.workspaceConfigListeners.clear();
    this.capabilityProvider?.dispose?.();
  }

  private handleMessage(text: string): void {
    let msg: unknown;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (!isRecord(msg)) return;

    const hasMethod = typeof msg.method === 'string';
    const hasId = Object.prototype.hasOwnProperty.call(msg, 'id') && msg.id !== undefined;

    if (hasMethod && hasId) {
      void this.handleIncomingRequest(msg as unknown as JsonRpcRequestFrame);
    } else if (hasMethod) {
      this.handleNotification(msg as unknown as JsonRpcNotificationFrame);
    } else if (hasId) {
      this.handleResponse(msg as unknown as JsonRpcResponseFrame);
    }
  }

  private handleResponse(resp: JsonRpcResponseFrame): void {
    if (typeof resp.id !== 'number') return;
    const call = this.pending.get(resp.id);
    if (!call) return;
    this.pending.delete(resp.id);
    if (resp.error) {
      call.reject(new AcpError(resp.error));
    } else {
      call.resolve(resp.result);
    }
  }

  private call<T>(method: string, params?: unknown): Promise<T> {
    if (this.closed) {
      return Promise.reject(new Error('acp: client is closed'));
    }
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      const frame: JsonRpcRequestFrame = { jsonrpc: '2.0', id, method, params };
      try {
        this.transport.send(JSON.stringify(frame));
      } catch (err) {
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private notify(method: string, params?: unknown): void {
    const frame: JsonRpcNotificationFrame = { jsonrpc: '2.0', method, params };
    this.transport.send(JSON.stringify(frame));
  }

  private respondResult(id: JsonRpcId, result: unknown): void {
    const frame: JsonRpcResponseFrame = { jsonrpc: '2.0', id, result };
    this.transport.send(JSON.stringify(frame));
  }

  private respondError(id: JsonRpcId, code: number, message: string): void {
    const frame: JsonRpcResponseFrame = { jsonrpc: '2.0', id, error: { code, message } };
    this.transport.send(JSON.stringify(frame));
  }





  private async handleIncomingRequest(req: JsonRpcRequestFrame): Promise<void> {
    if (req.method === 'session/request_permission') {
      await this.handlePermissionRequest(req);
      return;
    }
    if (UNSUPPORTED_CLIENT_METHODS.has(req.method)) {
      if (this.capabilityProvider) {
        try {
          const result = await this.capabilityProvider.handleRequest(req.method, req.params);
          this.respondResult(req.id, result);
          return;
        } catch {
        }
      }




      this.respondError(
        req.id,
        JSON_RPC_ERROR_CODES.methodNotFound,
        `not supported by this client: ${req.method}`,
      );
      return;
    }
    this.respondError(
      req.id,
      JSON_RPC_ERROR_CODES.methodNotFound,
      `method not found: ${req.method}`,
    );
  }

  private async handlePermissionRequest(req: JsonRpcRequestFrame): Promise<void> {
    const params = req.params as RequestPermissionRequest;
    const handlers = params && this.handlersFor(params.sessionId);
    if (!handlers?.onPermissionRequest) {
      this.respondError(
        req.id,
        JSON_RPC_ERROR_CODES.internalError,
        `no permission handler registered for session ${params?.sessionId ?? '<unknown>'}`,
      );
      return;
    }
    try {
      const optionId = await handlers.onPermissionRequest(params);
      this.respondResult(req.id, { outcome: { outcome: 'selected', optionId } });
    } catch {



      this.respondResult(req.id, { outcome: { outcome: 'cancelled' } });
    }
  }





  private handleNotification(n: JsonRpcNotificationFrame): void {
    if (n.method === WORKSPACE_CONFIG_CHANGED) {
      const options = configOptionsOf(n.params);
      if (options) for (const listener of this.workspaceConfigListeners) listener(options);
      return;
    }
    if (n.method !== 'session/update') return;
    const params = n.params as SessionNotification;
    if (!params) return;
    const handlers = this.handlersFor(params.sessionId);
    if (!handlers) return;
    const seq = notificationSeq(params);
    if (seq > 0) handlers.onEventSeq?.(seq);
    this.routeSessionUpdate(params.update, handlers);
  }


  private handlersFor(sessionId: SessionId): SessionEventHandlers | undefined {
    return this.subscriptions.get(sessionId) ?? this.activePrompts.get(sessionId);
  }


  private routeSessionUpdate(update: SessionUpdate, handlers: SessionEventHandlers): void {
    switch (update.sessionUpdate) {
      case 'user_message_chunk':
        handlers.onUserMessageChunk?.(
          update.content.text ?? '',
          update.messageId,
          imagePartFromBlock(update.content) ?? undefined,
          audioPartFromBlock(update.content) ?? undefined,
        );
        return;
      case 'agent_message_chunk':



        handlers.onMessageChunk?.(
          update.content.text ?? '',
          update.messageId,
          imagePartFromBlock(update.content) ?? undefined,
          update._meta as Record<string, unknown> | undefined,
          audioPartFromBlock(update.content) ?? undefined,
        );
        return;
      case 'agent_thought_chunk':
        handlers.onThoughtChunk?.(update.content.text ?? '', update.messageId);
        return;
      case 'tool_call':
      case 'tool_call_update':
        handlers.onToolCall?.({
          updateKind: update.sessionUpdate,
          toolCallId: update.toolCallId,
          title: update.title,
          kind: update.kind,
          status: update.status,
          content: update.content,
          locations: update.locations,
          rawInput: update.rawInput,
          rawOutput: update.rawOutput,
          meta: (update as { _meta?: unknown })._meta as Record<string, unknown> | undefined,
        });
        return;
      case 'plan':
        handlers.onPlan?.(update.entries);
        return;
      case 'usage_update':
        handlers.onUsage?.({ used: update.used, size: update.size, cost: update.cost });
        return;
      case 'available_commands_update':
        handlers.onAvailableCommands?.(update.availableCommands);
        return;
      case 'config_option_update':
        handlers.onConfigOptions?.(update.configOptions);
        return;
      case 'session_info_update':
        handlers.onSessionInfo?.({ title: update.title, updatedAt: update.updatedAt });
        return;
      case TERMINAL_OUTPUT_UPDATE_KIND: {
        const payload = terminalOutputFromUpdate(update);
        if (payload) handlers.onTerminalOutput?.(payload);
        return;
      }
      case 'current_mode_update':
        return;
    }
  }





  async initialize(
    clientCapabilities: ClientCapabilities = {},
    clientInfo?: Implementation,
  ): Promise<InitializeResponse> {
    const providerCapabilities = this.capabilityProvider?.capabilities() ?? {};
    return this.call<InitializeResponse>('initialize', {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: { ...providerCapabilities, ...clientCapabilities },
      clientInfo,
    });
  }

  async newSession(
    cwd: string,
    mcpServers: McpServer[] = [],
    meta?: Record<string, unknown>,
  ): Promise<NewSessionResponse> {
    return this.call<NewSessionResponse>('session/new', {
      cwd,
      mcpServers,
      ...(meta ? { _meta: meta } : {}),
    });
  }

  async loadSession(
    sessionId: SessionId,
    cwd: string,
    mcpServers: McpServer[] = [],
    sinceSeq?: number,
  ): Promise<LoadSessionResponse> {
    return this.call<LoadSessionResponse>('session/load', {
      sessionId,
      cwd,
      mcpServers,
      ...(sinceSeq ? { sinceSeq } : {}),
    });
  }

  async resumeSession(
    sessionId: SessionId,
    cwd: string,
    mcpServers?: McpServer[],
    sinceSeq?: number,
  ): Promise<ResumeSessionResponse> {
    return this.call<ResumeSessionResponse>('session/resume', {
      sessionId,
      cwd,
      mcpServers,
      ...(sinceSeq ? { sinceSeq } : {}),
    });
  }

  async deleteSession(sessionId: SessionId): Promise<void> {
    await this.call<Record<string, never>>('session/delete', { sessionId });
  }

  async closeSession(sessionId: SessionId): Promise<void> {
    await this.call<Record<string, never>>('session/close', { sessionId });
  }

  async listSessions(cursor?: string): Promise<ListSessionsResponse> {
    return this.call<ListSessionsResponse>('session/list', cursor ? { cursor } : {});
  }

  async setConfigOption(
    sessionId: SessionId,
    configId: string,
    value: SessionConfigOptionValue,
  ): Promise<SetSessionConfigOptionResponse> {
    const isBool = typeof value === 'boolean';
    return this.call<SetSessionConfigOptionResponse>('session/set_config_option', {
      sessionId,
      configId,
      type: isBool ? 'boolean' : undefined,
      value,
    });
  }

  async runTerminal(
    sessionId: SessionId,
    command: string,
  ): Promise<{ offset: number; output?: string }> {
    return this.call<{ offset: number; output?: string }>('_contenox/terminal/run', {
      sessionId,
      command,
    });
  }

  /** Current workspace-level config options (Contenox extension; other agents reject it). */
  async workspaceConfigOptions(): Promise<SessionConfigOption[] | null> {
    const result = await this.call<unknown>('_contenox/workspaceConfigOptions', {});
    return configOptionsOf(result);
  }

  /** Called with the new workspace config options whenever the agent reports a change. */
  onWorkspaceConfigOptionsChanged(listener: (options: SessionConfigOption[]) => void): () => void {
    this.workspaceConfigListeners.add(listener);
    return () => this.workspaceConfigListeners.delete(listener);
  }

  async listWorkspace(path?: string): Promise<WorkspaceListing> {



    const result = await this.call<{ entries: Array<{ name: string; isDir: boolean }> }>(
      '_contenox/fs/read_dir',
      { path: path ?? '' },
    );
    const root = normalizeListedPath(path);
    return {
      path: path ?? '',
      entries: result.entries.map(e => ({
        name: e.name,
        isDir: e.isDir,
        path: root === '' ? e.name : `${root}/${e.name}`,
      })),
    };
  }

  async readFile(path: string): Promise<{ content: string; isDir: boolean }> {
    const result = await this.call<{ content: string; isDir: boolean }>('_contenox/fs/read_file', {
      path,
    });
    if (result.isDir) return { content: '', isDir: true };
    return { content: decodeBase64Utf8(result.content), isDir: false };
  }

  async readFileRaw(path: string): Promise<{ content: string; isDir: boolean }> {
    return this.call<{ content: string; isDir: boolean }>('_contenox/fs/read_file', { path });
  }
  async assetActions(): Promise<AssetAction[]> {
    return this.call<AssetAction[]>('_contenox/asset/actions', {});
  }

  async runAssetAction(
    action: string,
    path: string,
    params?: AssetActionRunParams,
  ): Promise<AssetActionResult> {
    return this.call<AssetActionResult>('_contenox/asset/run', { action, path, ...params });
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.call<{ ok: boolean }>('_contenox/fs/write_file', {
      path,
      content: encodeBase64Utf8(content),
      create: false,
      overwrite: true,
    });
  }

  async listMissions(opts?: { limit?: number; createdAtCursor?: string }): Promise<MissionRow[]> {
    return this.call<MissionRow[]>('_contenox/missions/list', opts ?? {});
  }

  async getMission(missionId: string): Promise<MissionRow> {
    return this.call<MissionRow>('_contenox/missions/get', { missionId });
  }

  async listMissionReports(missionId: string, opts?: { limit?: number }): Promise<ReportRow[]> {
    return this.call<ReportRow[]>('_contenox/missions/reports', { missionId, ...opts });
  }

  async listInbox(opts?: { limit?: number }): Promise<OperatorItemRow[]> {
    return this.call<OperatorItemRow[]>('_contenox/inbox/list', opts ?? {});
  }

  async prompt(
    sessionId: SessionId,
    blocks: ContentBlock[],
    handlers: SessionEventHandlers = {},
  ): Promise<PromptResponse> {
    this.activePrompts.set(sessionId, handlers);
    try {
      return await this.call<PromptResponse>('session/prompt', {
        sessionId,
        prompt: blocks,
      });
    } finally {
      this.activePrompts.delete(sessionId);
    }
  }

  subscribe(sessionId: SessionId, handlers: SessionEventHandlers): () => void {
    this.subscriptions.set(sessionId, handlers);
    return () => {
      if (this.subscriptions.get(sessionId) === handlers) {
        this.subscriptions.delete(sessionId);
      }
    };
  }

  cancel(sessionId: SessionId): void {
    this.notify('session/cancel', { sessionId });
  }

  close(): void {
    this.transport.close();
  }
}
