import type {
  InjectionArgIn,
  McpServer,
  McpServerInput,
  RemoteToolsEntry,
  RemoteToolsInput,
  SessionMcpServerInput,
} from './connectorTypes';
import { parseEnv } from './externalAgentForm';

export type ConnectorFormKind = 'command' | 'remote' | 'openapi';
export type ConnectorAuth = 'none' | 'bearer' | 'oauth' | 'basic' | 'apiKey' | 'client_credentials';

export type ConnectorFormValues = {
  kind: ConnectorFormKind;
  name: string;
  workspace: string;
  command: string;
  args: string;
  env: string;
  url: string;
  transport: 'http' | 'sse';
  headers: string;
  auth: ConnectorAuth;
  token: string;
  username: string;
  credential: string;
  tokenEnv: string;
  oauthClientId: string;
  specUrl: string;
  timeoutMs: string;
  inject: string;
  connectTimeout: string;
  oauthSecretEnv: string;
  oauthTokenUrl: string;
  propName: string;
  propValue: string;
  propIn: InjectionArgIn;
  login: boolean;
  loginMethod: string;
  loginUrl: string;
  loginBody: string;
  extractCookie: string;
  extractJsonPath: string;
  injectHeader: string;
  injectFormat: string;
  insecureSkipVerify: boolean;
};

export type ConnectorFormErrors = Partial<
  Record<
    | 'name'
    | 'command'
    | 'env'
    | 'url'
    | 'headers'
    | 'token'
    | 'username'
    | 'credential'
    | 'oauthTokenUrl'
    | 'oauthClientId'
    | 'oauthSecretEnv'
    | 'specUrl'
    | 'timeoutMs'
    | 'inject'
    | 'connectTimeout'
    | 'propName'
    | 'loginUrl'
    | 'extract',
    string
  >
>;

export const CONNECTOR_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export const emptyConnectorForm: ConnectorFormValues = {
  kind: 'command',
  name: '',
  workspace: '',
  command: '',
  args: '',
  env: '',
  url: '',
  transport: 'http',
  headers: '',
  auth: 'none',
  token: '',
  username: '',
  credential: '',
  tokenEnv: '',
  oauthClientId: '',
  specUrl: '',
  timeoutMs: '10000',
  inject: '',
  connectTimeout: '30',
  oauthSecretEnv: '',
  oauthTokenUrl: '',
  propName: '',
  propValue: '',
  propIn: 'body',
  login: false,
  loginMethod: 'POST',
  loginUrl: '',
  loginBody: '',
  extractCookie: '',
  extractJsonPath: '',
  injectHeader: '',
  injectFormat: '',
  insecureSkipVerify: false,
};

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
}

export function parseHeaders(text: string): { headers: Record<string, string>; bad: string[] } {
  const headers: Record<string, string> = {};
  const bad: string[] = [];
  for (const line of lines(text)) {
    const colon = line.indexOf(':');
    const name = colon > 0 ? line.slice(0, colon).trim() : '';
    const value = colon > 0 ? line.slice(colon + 1).trim() : '';
    if (!name || !value || /\s/.test(name)) {
      bad.push(line);
      continue;
    }
    headers[name] = value;
  }
  return { headers, bad };
}

const envText = (env?: Record<string, string>) =>
  Object.entries(env ?? {})
    .map(([k, v]) => k + '=' + v)
    .join('\n');

const headerText = (headers?: Record<string, string>) =>
  Object.entries(headers ?? {})
    .map(([k, v]) => k + ': ' + v)
    .join('\n');

const isHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

function remoteHeaders(values: ConnectorFormValues) {
  const headers = parseHeaders(values.headers).headers;
  if (values.auth === 'apiKey') headers['X-API-Key'] = values.credential;
  if (values.auth === 'basic') {
    const bytes = new TextEncoder().encode(values.username + ':' + values.credential);
    headers.Authorization =
      'Basic ' + btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
  }
  return headers;
}

function storedHeaderAuth(input: Record<string, string> = {}) {
  const headers = { ...input };
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'x-api-key') {
      delete headers[key];
      return { auth: 'apiKey' as const, credential: value, headers: headerText(headers) };
    }
    if (key.toLowerCase() === 'authorization' && /^Basic /i.test(value)) {
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(
          Uint8Array.from(atob(value.slice(6)), c => c.charCodeAt(0)),
        );
        const split = text.indexOf(':');
        if (split < 0) continue;
        delete headers[key];
        return {
          auth: 'basic' as const,
          username: text.slice(0, split),
          credential: text.slice(split + 1),
          headers: headerText(headers),
        };
      } catch {
        /* Keep opaque legacy header values editable verbatim. */
      }
    }
  }
  return {};
}

export function formFromMcpServer(srv: McpServer): ConnectorFormValues {
  const auth: ConnectorAuth = srv.authType || 'none';
  return {
    ...emptyConnectorForm,
    kind: srv.transport === 'stdio' ? 'command' : 'remote',
    name: srv.name,
    workspace: srv.workspace ?? '',
    command: srv.command ?? '',
    args: (srv.args ?? []).join('\n'),
    env: envText(srv.env),
    url: srv.url ?? '',
    transport: srv.transport === 'sse' ? 'sse' : 'http',
    headers: headerText(srv.headers),
    auth,
    ...(auth === 'none' ? storedHeaderAuth(srv.headers) : {}),
    token: srv.authToken ?? '',
    tokenEnv: srv.authEnvKey ?? '',
    oauthClientId: srv.oauthClientId ?? '',
    oauthTokenUrl: srv.oauthTokenUrl ?? '',
    oauthSecretEnv: srv.oauthClientSecretEnv ?? '',
    inject: envText(srv.injectParams),
    connectTimeout: String(srv.connectTimeoutSeconds || 30),
  };
}

export function formFromRemoteTools(tools: RemoteToolsEntry): ConnectorFormValues {
  return {
    ...emptyConnectorForm,
    kind: 'openapi',
    name: tools.name,
    workspace: tools.workspace ?? '',
    url: tools.endpointUrl,
    specUrl: tools.specUrl ?? '',
    headers: headerText(tools.headers),
    timeoutMs: String(tools.timeoutMs || 10000),
    inject: envText(tools.injectParams),
    propName: tools.properties?.name ?? '',
    propValue: tools.properties?.value == null ? '' : String(tools.properties.value),
    propIn: tools.properties?.in || 'body',
    login: !!tools.authFlow,
    loginMethod: tools.authFlow?.loginMethod || 'POST',
    loginUrl: tools.authFlow?.loginUrl ?? '',
    loginBody: tools.authFlow?.loginBody ?? '',
    extractCookie: tools.authFlow?.extractCookie ?? '',
    extractJsonPath: tools.authFlow?.extractJsonPath ?? '',
    injectHeader: tools.authFlow?.injectHeader ?? '',
    injectFormat: tools.authFlow?.injectFormat ?? '',
    insecureSkipVerify: !!tools.insecureSkipVerify,
  };
}

export function validateConnectorForm(
  values: ConnectorFormValues,
  takenNames: string[],
  editing: boolean,
): ConnectorFormErrors {
  const errors: ConnectorFormErrors = {};
  const name = values.name.trim();
  if (!editing) {
    if (!CONNECTOR_NAME_PATTERN.test(name)) errors.name = 'connectors.form.name_invalid';
    else if (takenNames.includes(name)) errors.name = 'connectors.form.name_taken';
  }
  if (parseEnv(values.inject).bad.length > 0) errors.inject = 'connectors.form.inject_invalid';
  if (values.kind !== 'openapi') {
    const seconds = Number(values.connectTimeout);
    if (!Number.isInteger(seconds) || seconds <= 0)
      errors.connectTimeout = 'connectors.form.timeout_invalid';
  }
  if (values.kind === 'command') {
    if (!values.command.trim()) errors.command = 'connectors.form.command_required';
    if (parseEnv(values.env).bad.length > 0) errors.env = 'connectors.form.env_invalid';
    return errors;
  }
  if (!isHttpUrl(values.url.trim())) errors.url = 'connectors.form.url_invalid';
  if (parseHeaders(values.headers).bad.length > 0)
    errors.headers = 'connectors.form.headers_invalid';
  if (
    values.kind === 'remote' &&
    values.auth === 'bearer' &&
    !values.token.trim() &&
    !values.tokenEnv.trim()
  ) {
    errors.token = 'connectors.form.token_required';
  }
  if (values.kind === 'remote' && (values.auth === 'basic' || values.auth === 'apiKey')) {
    if (!values.credential.trim()) errors.credential = 'connectors.form.credential_required';
    if (values.auth === 'basic' && (!values.username.trim() || values.username.includes(':')))
      errors.username = 'connectors.form.username_required';
    const reserved = values.auth === 'basic' ? 'authorization' : 'x-api-key';
    if (
      Object.keys(parseHeaders(values.headers).headers).some(key => key.toLowerCase() === reserved)
    )
      errors.headers = 'connectors.form.duplicate_auth';
  }
  if (values.kind === 'remote' && values.auth === 'client_credentials') {
    if (!isHttpUrl(values.oauthTokenUrl) || !values.oauthTokenUrl.startsWith('https://'))
      errors.oauthTokenUrl = 'connectors.form.token_url_hint';
    if (!values.oauthClientId.trim()) errors.oauthClientId = 'connectors.form.client_id_required';
    if (!values.oauthSecretEnv.trim())
      errors.oauthSecretEnv = 'connectors.form.secret_env_required';
  }
  if (values.kind === 'openapi') {
    const spec = values.specUrl.trim();
    if (spec && !isHttpUrl(spec) && !spec.startsWith('file://'))
      errors.specUrl = 'connectors.form.spec_invalid';
    const ms = Number(values.timeoutMs);
    if (!Number.isInteger(ms) || ms <= 0) errors.timeoutMs = 'connectors.form.timeout_invalid';
    if (values.propValue.trim() && !values.propName.trim())
      errors.propName = 'connectors.form.prop_name_required';
    if (values.login) {
      if (!isHttpUrl(values.loginUrl.trim())) errors.loginUrl = 'connectors.form.url_invalid';
      if (!values.extractCookie.trim() && !values.extractJsonPath.trim())
        errors.extract = 'connectors.form.extract_required';
    }
  }
  return errors;
}

export function mcpInputFromForm(values: ConnectorFormValues): McpServerInput {
  const base = {
    name: values.name.trim(),
    workspace: values.workspace.trim() || undefined,
    connectTimeoutSeconds: Number(values.connectTimeout) || 30,
    injectParams: parseEnv(values.inject).env,
  };
  if (values.kind === 'command') {
    return {
      ...base,
      transport: 'stdio',
      command: values.command.trim(),
      args: lines(values.args),
      env: parseEnv(values.env).env,
    };
  }
  const { auth } = values;
  const oauth = auth === 'oauth' || auth === 'client_credentials';
  return {
    ...base,
    transport: values.transport,
    url: values.url.trim(),
    headers: remoteHeaders(values),
    authType: auth === 'bearer' || oauth ? auth : '',
    authToken: values.auth === 'bearer' ? values.token.trim() || undefined : undefined,
    authEnvKey: values.auth === 'bearer' ? values.tokenEnv.trim() || undefined : undefined,
    oauthTokenUrl: values.auth === 'client_credentials' ? values.oauthTokenUrl.trim() : undefined,
    oauthClientId: oauth ? values.oauthClientId.trim() || undefined : undefined,
    oauthClientSecretEnv: oauth ? values.oauthSecretEnv.trim() || undefined : undefined,
  };
}

export function remoteToolsInputFromForm(values: ConnectorFormValues): RemoteToolsInput {
  return {
    name: values.name.trim(),
    endpointUrl: values.url.trim(),
    specUrl: values.specUrl.trim() || undefined,
    timeoutMs: Number(values.timeoutMs),
    headers: parseHeaders(values.headers).headers,
    injectParams: parseEnv(values.inject).env,
    properties: values.propName.trim()
      ? { name: values.propName.trim(), value: values.propValue, in: values.propIn }
      : { name: '', value: null, in: '' },
    authFlow: values.login
      ? {
          type: 'http_handshake',
          loginMethod: values.loginMethod.trim() || 'POST',
          loginUrl: values.loginUrl.trim(),
          loginBody: values.loginBody,
          extractCookie: values.extractCookie.trim() || undefined,
          extractJsonPath: values.extractJsonPath.trim() || undefined,
          injectHeader: values.injectHeader.trim() || undefined,
          injectFormat: values.injectFormat.trim() || undefined,
        }
      : null,
    insecureSkipVerify: values.insecureSkipVerify,
    workspace: values.workspace.trim() || undefined,
  };
}

export function sessionServerFromForm(values: ConnectorFormValues): SessionMcpServerInput {
  if (values.kind === 'command') {
    return {
      name: values.name.trim(),
      command: values.command.trim(),
      args: lines(values.args),
      env: Object.entries(parseEnv(values.env).env).map(([name, value]) => ({ name, value })),
    };
  }
  const headers = remoteHeaders(values);
  if (values.auth === 'bearer' && values.token.trim())
    headers.Authorization = 'Bearer ' + values.token.trim();
  return {
    type: values.transport,
    name: values.name.trim(),
    url: values.url.trim(),
    headers: Object.entries(headers).map(([name, value]) => ({ name, value })),
  };
}
