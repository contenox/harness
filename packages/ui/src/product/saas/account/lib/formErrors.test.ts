import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../lib/apiError';
import { partitionFormError } from './formErrors';

const FIELDS = ['email', 'password'] as const;

describe('partitionFormError', () => {
  it('is empty when nothing failed', () => {
    expect(partitionFormError(null, FIELDS)).toEqual({ retryable: false, fields: {} });
    expect(partitionFormError(undefined, FIELDS)).toEqual({ retryable: false, fields: {} });
  });

  it('attaches a relay param to the input it names, and not to the banner', () => {
    const error = new ApiError('that address is already registered', 400, {
      source: 'relay',
      param: 'email',
    });
    expect(partitionFormError(error, FIELDS)).toEqual({
      retryable: false,
      fields: { email: 'that address is already registered' },
    });
  });

  it('falls back to the banner for a param the form does not render', () => {
    const error = new ApiError('display name is required', 400, {
      source: 'relay',
      param: 'display_name',
    });
    const result = partitionFormError(error, FIELDS);
    expect(result.message).toBe('display name is required');
    expect(result.fields).toEqual({});
  });

  it('never attributes an upstream failure to an input', () => {
    const error = new ApiError("Can't reach contenox right now.", 503, {
      source: 'upstream',
      param: 'email',
      detail: '<html>503</html>',
    });
    const result = partitionFormError(error, FIELDS);
    expect(result.fields).toEqual({});
    expect(result.message).toBe("Can't reach contenox right now.");
    expect(result.retryable).toBe(true);
  });

  it('never puts a raw body in the banner', () => {
    const result = partitionFormError('<html><body>502 Bad Gateway</body></html>', FIELDS);
    expect(result.message).toBe('Something went wrong. Try again.');
  });

  it('marks a rejected credential as not retryable', () => {
    const error = new ApiError('invalid email or password', 401, { source: 'relay' });
    expect(partitionFormError(error, FIELDS).retryable).toBe(false);
  });
});
