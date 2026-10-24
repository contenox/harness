import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { InlineNotice } from '../../components/InlineNotice';
import { Skeleton } from '../../components/Skeleton';
import { Spinner } from '../../components/Spinner';
import type { ReactNode } from 'react';
import { errorMessage, isRetryable } from '../lib/apiError';


export function ScreenLoading({ label }: { label?: string }) {
  return (
    <div
      className="flex min-h-40 flex-1 items-center justify-center p-6"
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}>
      <Spinner />
    </div>
  );
}

export function ListSkeleton({ label, rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}>
      {Array.from({ length: rows }, (_, index) => (
        <Card key={index} variant="filled" className="flex flex-col gap-2">
          <Skeleton className="w-2/5" />
          <Skeleton className="w-3/5" />
        </Card>
      ))}
    </div>
  );
}

export function ScreenError({
  error,
  onRetry,
  retrying,
  children,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  children?: ReactNode;
}) {
  const message = errorMessage(error);
  const canRetry = onRetry !== undefined && isRetryable(error);
  return (
    <InlineNotice variant="error" role="alert">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1">{message}</span>
        {canRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onRetry}
            disabled={retrying}>
            Try again
          </Button>
        )}
      </div>
      {children}
    </InlineNotice>
  );
}
