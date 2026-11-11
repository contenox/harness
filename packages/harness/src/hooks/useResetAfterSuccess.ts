import { useEffect } from 'react';

export function useResetAfterSuccess(isSuccess: boolean, reset: () => void, afterMs = 3000) {
  useEffect(() => {
    if (!isSuccess) return;
    const timer = window.setTimeout(reset, afterMs);
    return () => window.clearTimeout(timer);
  }, [isSuccess, reset, afterMs]);
}
