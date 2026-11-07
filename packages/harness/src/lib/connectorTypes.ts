export type ConnectorKind = 'builtin' | 'mcp' | 'openapi';
export type ConnectorScope = 'everywhere' | 'workspace' | 'session' | 'agent';
export type ConnectorStatus = 'ready' | 'needs_sign_in' | 'unavailable';
export type McpTransport = 'stdio' | 'sse' | 'http';
export type McpAuthType = '' | 'bearer' | 'oauth';

export type ConnectorTool = {
  name: string;
  description?: string;
};

export type Connector = {
  name: string;
  label: string;
  kind: ConnectorKind;
  id?: string;
  transport?: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  authType?: McpAuthType;
  scope: ConnectorScope;
  workspace?: string;
  status: ConnectorStatus;
  problem?: string;
  tools: ConnectorTool[];
  enabled?: boolean;
  hidden?: Record<string, string[]>;
  hiddenBySettings?: string[];
  hiddenInChat?: string[];
};

export type McpServer = {
  id: string;
  name: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  authType?: McpAuthType;
  authToken?: string;
  authEnvKey?: string;
  oauthClientId?: string;
  oauthClientSecretEnv?: string;
  connectTimeoutSeconds: number;
  injectParams?: Record<string, string>;
  workspace?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type McpServerInput = Omit<McpServer, 'id' | 'createdAt' | 'updatedAt'>;

export type RemoteToolsEntry = {
  id: string;
  name: string;
  endpointUrl: string;
  specUrl?: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  properties?: InjectionArg;
  injectParams?: Record<string, string>;
  authFlow?: AuthFlow | null;
  insecureSkipVerify?: boolean;
  workspace?: string;
};

export type InjectionArgIn = 'path' | 'query' | 'body' | 'header';

export type InjectionArg = {
  name: string;
  value: unknown;
  in: InjectionArgIn | '';
};

export type AuthFlow = {
  type: string;
  loginMethod: string;
  loginUrl: string;
  loginBody: string;
  extractCookie?: string;
  extractJsonPath?: string;
  injectHeader?: string;
  injectFormat?: string;
};

export type HiddenTools = {
  everywhere: string[];
  workspaces: Record<string, string[]>;
};

export type RemoteToolsInput = Omit<RemoteToolsEntry, 'id'>;

export type SessionMcpServerInput = {
  type?: 'http' | 'sse';
  name: string;
  command?: string;
  args?: string[];
  env?: { name: string; value: string }[];
  url?: string;
  headers?: { name: string; value: string }[];
};
