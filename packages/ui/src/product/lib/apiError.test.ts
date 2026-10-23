import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  decodeErrorResponse,
  describeBody,
  errorMessage,
  isRetryable,
  isRetryableStatus,
  isUnauthorized,
  statusMessage,
} from './apiError';


const NGINX_503 =
  '<html>\r\n<head><title>503 Service Temporarily Unavailable</title></head>\r\n<body>\r\n' +
  '<center><h1>503 Service Temporarily Unavailable</h1></center>\r\n<hr><center>nginx</center>\r\n' +
  '</body>\r\n</html>\r\n';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(status: number, body: string, contentType = 'text/html'): Response {
  return new Response(body, { status, headers: { 'Content-Type': contentType } });
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('statusMessage', () => {
  it('maps the gateway class to copy that says it is our fault', () => {
    for (const status of [502, 503, 504]) {
      expect(statusMessage(status)).toBe(
        "Can't reach contenox right now. This is on our side — try again in a moment.",
      );
    }
  });

  it('maps 429 to rate-limit copy', () => {
    expect(statusMessage(429)).toBe('Too many attempts. Wait a moment and try again.');
  });

  it('maps 500 and other server statuses to generic server copy', () => {
    expect(statusMessage(500)).toBe('Something went wrong on our side. Try again in a moment.');
    expect(statusMessage(507)).toBe('Something went wrong on our side. Try again in a moment.');
  });

  it('maps status 0 and 408 to connectivity copy', () => {
    const offline = "Can't reach contenox. Check your connection and try again.";
    expect(statusMessage(0)).toBe(offline);
    expect(statusMessage(408)).toBe(offline);
  });

  it('falls through to the generic message for any other status', () => {
    for (const status of [400, 401, 403, 404, 409, 418, 422, 451]) {
      expect(statusMessage(status)).toBe('Something went wrong. Try again.');
    }
  });
});

describe('isRetryableStatus', () => {
  it('offers a retry only where a second attempt could succeed', () => {
    for (const status of [0, 408, 429, 500, 502, 503, 504]) {
      expect(isRetryableStatus(status)).toBe(true);
    }
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(isRetryableStatus(status)).toBe(false);
    }
  });
});

describe('decodeErrorResponse', () => {
  it('never lets an HTML error page reach the message', async () => {
    const error = await decodeErrorResponse(textResponse(503, NGINX_503));
    expect(error.message).toBe(
      "Can't reach contenox right now. This is on our side — try again in a moment.",
    );
    expect(error.message).not.toContain('<');
    expect(error.message).not.toContain('nginx');
    expect(error.message).not.toContain('503 Service Temporarily Unavailable');
    expect(error.source).toBe('upstream');
    expect(error.status).toBe(503);
  });

  it('describes an unexplained body for developers rather than keeping it', async () => {
    const error = await decodeErrorResponse(textResponse(503, NGINX_503));
    expect(error.detail).toEqual({ kind: 'html', length: NGINX_503.length });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0]?.[1]).toEqual({ kind: 'html', length: NGINX_503.length });
  });

  it('writes no part of an unexplained body to the console', async () => {
    const echoed = '<html><body>email=ada@example.com&password=hunter2</body></html>';
    await decodeErrorResponse(textResponse(502, echoed));
    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).not.toContain('ada@example.com');
    expect(logged).not.toContain('hunter2');
  });

  it('writes no part of an unexplained body to detail either', async () => {
    const echoed = JSON.stringify({ echo: { email: 'ada@example.com', password: 'hunter2' } });
    const error = await decodeErrorResponse(textResponse(502, echoed, 'application/json'));
    const kept = JSON.stringify(error.detail);
    expect(kept).not.toContain('ada@example.com');
    expect(kept).not.toContain('hunter2');
  });

  it('shows the relay envelope message as-is', async () => {
    const error = await decodeErrorResponse(
      jsonResponse(403, {
        error: {
          message: 'that account is entitled to 1 connected instances and has 1',
          type: 'entitlement',
          code: 'instance_limit',
        },
      }),
    );
    expect(error.message).toBe('that account is entitled to 1 connected instances and has 1');
    expect(error.source).toBe('relay');
    expect(error.type).toBe('entitlement');
    expect(error.code).toBe('instance_limit');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('carries param through so a field error can attach', async () => {
    const error = await decodeErrorResponse(
      jsonResponse(400, { error: { message: 'that address is already registered', param: 'email' } }),
    );
    expect(error.param).toBe('email');
    expect(error.message).toBe('that address is already registered');
  });

  it('rejects a bare {message} body — that shape is not the relay envelope', async () => {
    const error = await decodeErrorResponse(jsonResponse(500, { message: 'upstream connect error' }));
    expect(error.message).toBe('Something went wrong on our side. Try again in a moment.');
    expect(error.source).toBe('upstream');

    expect(error.detail).toMatchObject({ kind: 'json', keys: ['message'] });
  });

  it('ignores a JSON content-type on a body that is not JSON', async () => {
    const error = await decodeErrorResponse(textResponse(502, NGINX_503, 'application/json'));
    expect(error.message).toBe(
      "Can't reach contenox right now. This is on our side — try again in a moment.",
    );
    expect(error.detail).toEqual({ kind: 'html', length: NGINX_503.length });
  });

  it('handles a truncated JSON body without leaking it', async () => {
    const truncated = '{"error":{"message":"the relay was mid-sen';
    const error = await decodeErrorResponse(textResponse(502, truncated, 'application/json'));
    expect(error.message).toBe(
      "Can't reach contenox right now. This is on our side — try again in a moment.",
    );
    expect(error.message).not.toContain('mid-sen');
  });

  it('handles an envelope with a non-string or empty message', async () => {
    const numeric = await decodeErrorResponse(jsonResponse(400, { error: { message: 42 } }));
    expect(numeric.message).toBe('Something went wrong. Try again.');
    const empty = await decodeErrorResponse(jsonResponse(400, { error: { message: '' } }));
    expect(empty.message).toBe('Something went wrong. Try again.');
  });

  it('handles an empty body', async () => {
    const error = await decodeErrorResponse(new Response(null, { status: 504 }));
    expect(error.message).toBe(
      "Can't reach contenox right now. This is on our side — try again in a moment.",
    );
    expect(error.detail).toEqual({ kind: 'empty', length: 0 });
  });

  it('reports the size of an unexplained body without retaining any of it', async () => {
    const huge = 'x'.repeat(5_000);
    const error = await decodeErrorResponse(textResponse(500, huge));
    expect(error.detail).toEqual({ kind: 'text', length: 5_000 });
  });

  it('does not use statusText as a message', async () => {
    const error = await decodeErrorResponse(
      new Response('nope', { status: 503, statusText: 'Service Temporarily Unavailable' }),
    );
    expect(error.message).not.toContain('Service Temporarily Unavailable');
  });
});

describe('describeBody', () => {
  it('classifies by the bytes, not by a content-type a proxy may have lied about', () => {
    expect(describeBody(NGINX_503, undefined).kind).toBe('html');
    expect(describeBody('  \n <!doctype html>', undefined).kind).toBe('html');
    expect(describeBody('rate limit exceeded\n', undefined).kind).toBe('text');
    expect(describeBody('', undefined).kind).toBe('empty');
    expect(describeBody('[1,2]', [1, 2]).kind).toBe('json');
  });

  it('names an object body’s top-level keys and nothing under them', () => {
    const described = describeBody('{}', { message: 'x', trace: { email: 'ada@example.com' } });
    expect(described.keys).toEqual(['message', 'trace']);
    expect(JSON.stringify(described)).not.toContain('ada@example.com');
  });

  it('bounds how many key names, and how long each, survive', () => {
    const wide = Object.fromEntries(Array.from({ length: 40 }, (_, n) => [`k${n}`, n]));
    expect(describeBody('{}', wide).keys).toHaveLength(12);
    const long = { ['w'.repeat(300)]: 1 };
    expect(describeBody('{}', long).keys?.[0]).toHaveLength(40);
  });

  it('reports the received length even when it keeps none of the body', () => {
    expect(describeBody('x'.repeat(5_000), undefined).length).toBe(5_000);
  });
});

describe('errorMessage', () => {
  it('passes an ApiError message through', () => {
    expect(errorMessage(new ApiError('no such host', 404, { source: 'relay' }))).toBe(
      'no such host',
    );
  });

  it('passes a plain Error through — those are this codebase’s own', () => {
    expect(errorMessage(new Error('socket closed'))).toBe('socket closed');
  });

  it('never stringifies an arbitrary thrown value', () => {
    expect(errorMessage(NGINX_503)).toBe('Something went wrong. Try again.');
    expect(errorMessage({ body: NGINX_503 })).toBe('Something went wrong. Try again.');
    expect(errorMessage(undefined)).toBe('Something went wrong. Try again.');
  });
});

describe('ApiError', () => {
  it('reports retryability from its status', () => {
    expect(new ApiError('x', 503, { source: 'upstream' }).retryable).toBe(true);
    expect(new ApiError('x', 401, { source: 'relay' }).retryable).toBe(false);
    expect(isRetryable(new ApiError('x', 0, { source: 'transport' }))).toBe(true);
    expect(isRetryable(new Error('x'))).toBe(false);
  });

  it('identifies the missing-session refusal', () => {
    expect(isUnauthorized(new ApiError('x', 401, { source: 'relay' }))).toBe(true);
    expect(isUnauthorized(new ApiError('x', 403, { source: 'relay' }))).toBe(false);
    expect(isUnauthorized(new Error('x'))).toBe(false);
  });
});
