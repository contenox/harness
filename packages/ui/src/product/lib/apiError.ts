/**
 * The client's error vocabulary: one class, one classification of where a failure was described, and the copy shown when nobody described it.
 */

/**
 * Where the failure was described.
 */
export type ApiErrorSource = 'relay' | 'upstream' | 'transport';


const COPY = {
  offline: "Can't reach contenox. Check your connection and try again.",
  upstream: "Can't reach contenox right now. This is on our side — try again in a moment.",
  rateLimited: 'Too many attempts. Wait a moment and try again.',
  server: 'Something went wrong on our side. Try again in a moment.',
  generic: 'Something went wrong. Try again.',
} as const;

/**
 * The sentence for a `status` the relay did not explain.
 */
export function statusMessage(status: number): string {
  if (status === 0 || status === 408) return COPY.offline;
  if (status === 429) return COPY.rateLimited;
  if (status === 502 || status === 503 || status === 504) return COPY.upstream;
  if (status >= 500) return COPY.server;
  return COPY.generic;
}

/**
 * Whether offering "try again" is honest.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * Everything [ApiError] carries beyond a message and a status.
 */
export interface ApiErrorInit {
  readonly source: ApiErrorSource;
  /**
   * The relay's machine-readable code, or `timeout`/`cancelled`/`network` for a status 0.
   */
  readonly code?: string;
  readonly type?: string;
  /**
   * The input the relay named.
   */
  readonly param?: string;
  /**
   * Developer-only, and never rendered.
   */
  readonly detail?: unknown;
}

/**
 * An HTTP failure with the relay's own classification attached.
 */
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

/**
 * True when the relay refused for want of a session — the gate's cue to show sign-in.
 */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/**
 * A sentence for anything that was thrown.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return COPY.generic;
}

/**
 * Whether a retry affordance should be offered for whatever was thrown.
 */
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

/**
 * What an unexplained body WAS, with none of what it said.
 */
export interface UnexplainedBody {
  /**
   * What the bytes were, as far as parsing got.
   */
  readonly kind: 'empty' | 'json' | 'html' | 'text';
  /**
   * Length of the body as received, before any of this.
   */
  readonly length: number;
  /**
   * Top-level property names, when `kind` is `json` and the value was an object.
   */
  readonly keys?: readonly string[];
}

/**
 * Describes a body the relay did not write, without retaining it.
 */
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

/**
 * Turns a failed response into an [ApiError].
 */
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
