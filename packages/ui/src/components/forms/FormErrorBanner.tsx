import { Button } from '../Button';
import { InlineNotice } from '../InlineNotice';

export function FormErrorBanner({
  message,
  onRetry,
  pending,
}: {
  message?: string;
  onRetry?: () => void;
  pending?: boolean;
}) {
  if (message === undefined) return null;
  return (
    <InlineNotice variant="error" role="alert">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1">{message}</span>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onRetry}
            disabled={pending}>
            Try again
          </Button>
        )}
      </div>
    </InlineNotice>
  );
}
