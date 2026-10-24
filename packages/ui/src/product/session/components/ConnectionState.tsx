import { Button } from '../../../components/Button';
import { InlineNotice } from '../../../components/InlineNotice';
import { ScreenLoading } from '../../saas/ScreenState';
import type { AcpWorkspaceState } from '../state/acpWorkspaceState';

export function isConnectionBlocked(status: AcpWorkspaceState['status']): boolean {
  switch (status) {
    case 'connecting':
    case 'setup_required':
    case 'disconnected':
    case 'error':
      return true;
    default:
      return false;
  }
}

export function ConnectionState({
  workspace,
  onReconnect,
}: {
  workspace: AcpWorkspaceState;
  onReconnect: () => void;
}) {
  if (!isConnectionBlocked(workspace.status)) return null;
  switch (workspace.status) {
    case 'connecting':
      return <ScreenLoading label="Reaching the machine" />;

    case 'setup_required':




      return (
        <InlineNotice variant="error" role="alert">
          {workspace.error ?? 'This machine refused the connection.'}
        </InlineNotice>
      );

    case 'disconnected':
    case 'error':
      return (
        <InlineNotice variant="error" role="alert">
          <div className="flex flex-col gap-3">
            <span>{workspace.error ?? 'The connection to this machine dropped.'}</span>
            <Button variant="outline" size="sm" onClick={onReconnect}>
              Try again
            </Button>
          </div>
        </InlineNotice>
      );

    default:
      return null;
  }
}
