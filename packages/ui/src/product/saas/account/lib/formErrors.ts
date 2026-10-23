
import { ApiError, errorMessage, isRetryable } from '../../../lib/apiError';

export interface FormErrors {
  /**
   * Form-level copy.
   */
  readonly message?: string;
  /**
   * True when submitting the same input again could plausibly succeed.
   */
  readonly retryable: boolean;
  /**
   * Per-input copy, keyed by the relay's `param`.
   */
  readonly fields: Readonly<Record<string, string>>;
}

const NO_ERRORS: FormErrors = { retryable: false, fields: {} };

/**
 * Routes a failed submission to the input that caused it, or to the banner.
 */
export function partitionFormError(error: unknown, fields: readonly string[]): FormErrors {
  if (error === null || error === undefined) return NO_ERRORS;

  const retryable = isRetryable(error);
  if (
    error instanceof ApiError &&
    error.source === 'relay' &&
    error.param !== undefined &&
    fields.includes(error.param)
  ) {
    return { retryable, fields: { [error.param]: error.message } };
  }

  return { message: errorMessage(error), retryable, fields: {} };
}
