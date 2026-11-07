import { useCallback, useState } from 'react';
import { loadDismissedErrors, saveDismissedErrors } from '../lib/dismissedErrors';

const PERSISTED_PREFIX = 'failure-';

type Stored = { sessionId: string | null; ids: ReadonlySet<string> };

export function useDismissedErrors(sessionId: string | null) {
  const [stored, setStored] = useState<Stored>(() => ({
    sessionId,
    ids: loadDismissedErrors(sessionId),
  }));
  let current = stored;
  if (stored.sessionId !== sessionId) {
    current = { sessionId, ids: loadDismissedErrors(sessionId) };
    setStored(current);
  }
  const dismiss = useCallback(
    (id: string) => {
      setStored(prev => {
        const ids = new Set([...prev.ids, id]);
        if (id.startsWith(PERSISTED_PREFIX)) {
          const persisted = new Set([...loadDismissedErrors(sessionId), id]);
          saveDismissedErrors(sessionId, persisted);
        }
        return { sessionId, ids };
      });
    },
    [sessionId],
  );
  return { dismissedErrors: current.ids, dismissError: dismiss };
}
