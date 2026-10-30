import { Button, ChatThreadSkeleton, EmptyState } from '@contenox/ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavbarSlot } from '../../components/NavbarSlot';
import { useAcpWorkspace } from '../../hooks/useAcpWorkspace';
import { useSetupStatus } from '../../hooks/useSetupStatus';
import { classifySetupIssueCode } from '../../lib/acpFailureKind';
import { getBlockingSetupIssue, getSetupIssueFixPath } from '../../lib/setupHealth';
import type { SetupIssue } from '../../lib/types';
import { SlashCommandRegistryProvider } from '../../lib/slashCommands';
import { ChatTopBarControls } from './components/ChatTopBarControls';
import { WorkspaceTabs } from './components/WorkspaceTabs';

export default function AcpChatPage() {
  return (
    <SlashCommandRegistryProvider>
      <AcpChatWorkspace />
    </SlashCommandRegistryProvider>
  );
}

function SetupRequiredState({
  issue,
  fallbackMessage,
  onRetryBackend,
}: {
  issue: SetupIssue | null;
  fallbackMessage: string | null;
  onRetryBackend: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fixPath = issue ? getSetupIssueFixPath(issue) : '/settings';
  const kind = classifySetupIssueCode(issue?.code);

  const title =
    kind === 'backend_unreachable'
      ? t('acp_recovery.backend_unreachable_title')
      : kind === 'model_unavailable'
        ? t('acp_recovery.model_unavailable_title')
        : t('acp_chat.setup_required_title');
  const actionLabel =
    kind === 'model_unavailable' ? t('acp_recovery.model_unavailable_action') : t('acp_chat.setup_required_action');

  const description =
    kind === 'backend_unreachable'
      ? t('acp_recovery.backend_unreachable_description')
      : kind === 'model_unavailable'
        ? t('acp_recovery.model_unavailable_description')
        : t('acp_chat.setup_required_generic');
  const detail = issue?.message ?? fallbackMessage ?? null;

  return (
    <div className="m-auto max-w-md p-6">
      <EmptyState
        variant="warning"
        title={title}
        description={description}
      />
      {detail && (
        <p className="text-text-muted mt-2 text-center text-xs break-words">
          {detail}
        </p>
      )}
      <div className="mt-4 flex justify-center gap-2">
        {kind === 'backend_unreachable' && (
          <Button type="button" variant="secondary" onClick={onRetryBackend}>
            {t('acp_recovery.backend_unreachable_retry')}
          </Button>
        )}
        <Button type="button" variant="primary" onClick={() => navigate(fixPath)}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function DisconnectedState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="m-auto max-w-md p-6">
      <EmptyState variant="error" title={t('acp_chat.disconnected_title')} description={t('acp_chat.disconnected_description')} />
      <div className="mt-4 flex justify-center">
        <Button type="button" variant="primary" onClick={onRetry}>
          {t('acp_chat.disconnected_retry')}
        </Button>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="m-auto max-w-md p-6">
      <EmptyState variant="error" title={t('acp_chat.error_title')} description={message ?? t('acp_chat.error_generic')} />
      <div className="mt-4 flex justify-center">
        <Button type="button" variant="primary" onClick={onRetry}>
          {t('acp_chat.disconnected_retry')}
        </Button>
      </div>
    </div>
  );
}

function NotFoundState({ onNewSession }: { onNewSession: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="m-auto max-w-md p-6">
      <EmptyState title={t('acp_chat.not_found_title')} description={t('acp_chat.not_found_description')} />
      <div className="mt-4 flex justify-center">
        <Button type="button" variant="primary" onClick={onNewSession}>
          {t('acp_chat.not_found_action')}
        </Button>
      </div>
    </div>
  );
}

function AcpChatWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams<{ sessionId?: string }>();
  const { workspace, session, openSessionIds, reconnect } = useAcpWorkspace();

  useNavbarSlot(<ChatTopBarControls />);

  const { data: setupStatus, refetch: refetchSetupStatus } = useSetupStatus(true);
  const blockingSetupIssue = getBlockingSetupIssue(setupStatus);

  const handleRetryBackend = useCallback(() => {
    void refetchSetupStatus();
    void reconnect();
  }, [refetchSetupStatus, reconnect]);

  const notFound =
    paramSessionId != null &&
    openSessionIds.length === 0 &&
    workspace.sessionLoadState === 'not_found' &&
    !openSessionIds.includes(paramSessionId);

  const handleNewSession = useCallback(() => navigate('/chat'), [navigate]);

  if (blockingSetupIssue || workspace.status === 'setup_required') {
    return (
      <SetupRequiredState
        issue={blockingSetupIssue}
        fallbackMessage={workspace.error}
        onRetryBackend={handleRetryBackend}
      />
    );
  }
  if (notFound) {
    return <NotFoundState onNewSession={handleNewSession} />;
  }
  if (workspace.status === 'disconnected') {
    return <DisconnectedState onRetry={reconnect} />;
  }
  if (workspace.status === 'error') {
    return <ErrorState message={workspace.error} onRetry={reconnect} />;
  }
  if (workspace.status === 'connecting' && session.items.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col" role="status" aria-label={t('acp_chat.connecting_label')}>
        <ChatThreadSkeleton className="flex-1" />
      </div>
    );
  }

  return (
    <div className="bg-app flex h-full min-h-0 flex-col">
      <WorkspaceTabs />
    </div>
  );
}
