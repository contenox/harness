import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionRepair } from '../../../components/providers/ConnectionRepair';
import { useConnections } from '../../../hooks/useConnections';
import { useSetupStatus } from '../../../hooks/useSetupStatus';
import type { AcpFailureKind } from '../../../lib/acpFailureKind';
import {
  connectionForModelChoice,
  fallbackCodeFor,
  isRecoverableFailure,
  pickAffectedConnection,
} from '../../../lib/chatRecovery';

export type ChatFailureRecoveryProps = {
  kind: AcpFailureKind;
  /** Setup issue code when the failure comes from the setup status instead of a turn. */
  issueCode?: string;
  /** Raw failure text: shown under technical details and used to spot the affected connection. */
  message?: string | null;
  /** Where "Modell wählen" leads; the default model lives in the settings. */
  chooseModelPath?: string;
  /** The connection was re-checked or fixed: the chat may reconnect / the user may resend. */
  onResolved?: () => void;
  /** Shown when the failure is not connection related or no connection can be identified. */
  fallback: ReactNode;
};

/** The connection-level recovery card for a failed turn or blocked setup, with a plain fallback. */
export function ChatFailureRecovery(props: ChatFailureRecoveryProps) {
  if (!isRecoverableFailure(props.kind) && !props.issueCode) return <>{props.fallback}</>;
  return <AffectedConnectionRecovery {...props} />;
}

function AffectedConnectionRecovery({
  kind,
  issueCode,
  message,
  chooseModelPath = '/settings',
  onResolved,
  fallback,
}: ChatFailureRecoveryProps) {
  const navigate = useNavigate();
  const { data: connections } = useConnections();
  const { data: status } = useSetupStatus(true);
  const fallbackCode = fallbackCodeFor(kind, issueCode);
  const connection = useMemo(() => {
    const list = connections ?? [];
    const picked = pickAffectedConnection(list, status, message);
    if (picked) return picked;
    return fallbackCode === 'model_unavailable' ? connectionForModelChoice(list) : undefined;
  }, [connections, status, message, fallbackCode]);

  if (!connection || !fallbackCode) return <>{fallback}</>;
  return (
    <ConnectionRepair
      connection={connection}
      force
      fallbackCode={fallbackCode}
      details={message ?? undefined}
      onChooseModel={() => navigate(chooseModelPath)}
      onResolved={onResolved}
      className="my-1"
    />
  );
}
