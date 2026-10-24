
export type ApiErrorSource = 'relay' | 'upstream' | 'transport';


const COPY = {
  offline: "Can't reach contenox. Check your connection and try again.",
  upstream: "Can't reach contenox right now. This is on our side — try again in a moment.",
  rateLimited: 'Too many attempts. Wait a moment and try again.',
  server: 'Something went wrong on our side. Try again in a moment.',
  generic: 'Something went wrong. Try again.',
} as const;

export function statusMessage(status: number): string {
  if (status === 0 || status === 408) return COPY.offline;
  if (status === 429) return COPY.rateLimited;
  if (status === 502 || status === 503 || status === 504) return COPY.upstream;
  if (status >= 500) return COPY.server;
  return COPY.generic;
}

export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export interface ApiErrorInit {
  readonly source: ApiErrorSource;
  readonly code?: string;
  readonly type?: string;
  readonly param?: string;
  readonly detail?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly source: ApiErrorSource;
  readonly code?: string;
  readonly type?: string;
  readonly param?: string;
  readonly detail?: unknown;

  constructor(message: string, status: number, init: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.source = init.source;
    this.code = init.code;
    this.type = init.type;
    this.param = init.param;
    this.detail = init.detail;
  }


  get retryable(): boolean {
    return isRetryableStatus(this.status);
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return COPY.generic;
}

export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && error.retryable;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}


const KEY_LIMIT = 12;


const KEY_LENGTH_LIMIT = 40;

export interface UnexplainedBody {
  readonly kind: 'empty' | 'json' | 'html' | 'text';
  readonly length: number;
  readonly keys?: readonly string[];
}

export function describeBody(text: string, body: unknown): UnexplainedBody {
  const length = text.length;
  if (body === undefined) {
    if (length === 0) return { kind: 'empty', length };
    return { kind: /^\s*</.test(text) ? 'html' : 'text', length };
  }
  if (isRecord(body) && !Array.isArray(body)) {
    return {
      kind: 'json',
      length,
      keys: Object.keys(body)
        .slice(0, KEY_LIMIT)
        .map(key => key.slice(0, KEY_LENGTH_LIMIT)),
    };
  }
  return { kind: 'json', length };
}


function reportUnexplained(status: number, url: string, described: UnexplainedBody): void {
  const where = url || '(no url)';
  console.error(`[api] ${status} ${where} was not the relay's error envelope`, described);
}

export async function decodeErrorResponse(response: Response): Promise<ApiError> {
  const { status, url } = response;
  let text: string;
  try {
    text = await response.text();
  } catch (cause) {


    console.error(`[api] ${status} ${url || '(no url)'} could not be read`, cause);
    return new ApiError(statusMessage(status), status, { source: 'upstream', detail: cause });
  }

  let body: unknown;
  if (response.headers.get('Content-Type')?.includes('json') === true) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }

  const envelope = isRecord(body) ? body.error : undefined;
  if (isRecord(envelope)) {
    const message = asString(envelope.message);
    if (message !== undefined && message !== '') {
      return new ApiError(message, status, {
        source: 'relay',
        type: asString(envelope.type),
        code: asString(envelope.code),
        param: asString(envelope.param),
        detail: body,
      });
    }
  }

  const described = describeBody(text, body);
  reportUnexplained(status, url, described);
  return new ApiError(statusMessage(status), status, { source: 'upstream', detail: described });
}
