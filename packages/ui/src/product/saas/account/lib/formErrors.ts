
import { ApiError, errorMessage, isRetryable } from '../../../lib/apiError';

export interface FormErrors {
  readonly message?: string;
  readonly retryable: boolean;
  readonly fields: Readonly<Record<string, string>>;
}

const NO_ERRORS: FormErrors = { retryable: false, fields: {} };

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
