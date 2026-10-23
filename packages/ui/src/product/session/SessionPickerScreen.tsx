import type { SessionInfo } from '@contenox/acp-client';
import { Button, Card, EmptyState, InlineNotice, P, Page, Small } from '@contenox/ui';
import { ChevronRight, MessageSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ScreenError } from '../saas/ScreenState';
import { ScreenHeader } from '../shell/ScreenHeader';
import { ScreenBody } from '@contenox/ui';
import { relativeTime } from '../lib/relativeTime';
import { SessionAgentBadge } from './components/SessionAgentBadge';

export function SessionPickerScreen({
  instanceId,
  sessions,
  blocked,
  canCreate,
  createError,
  sessionLoadError,
  connectionState,
  agentSelector,
  onCreate,
}: {
  instanceId: string;
  sessions: SessionInfo[];
  blocked: boolean;
  canCreate: boolean;
  createError: string | null;
  sessionLoadError: unknown;
  connectionState: ReactNode;
  agentSelector: ReactNode;
  onCreate: () => void;
}) {
  return (
    <Page
      header={
        <ScreenHeader
          title="Sessions"
          actions={
            <>
              <Link
                to={`/session/${encodeURIComponent(instanceId)}/missions`}
                className="text-primary-600 dark:text-dark-primary-500 py-1 text-sm">
                Missions
              </Link>
              <Link
                to={`/session/${encodeURIComponent(instanceId)}/inbox`}
                className="text-primary-600 dark:text-dark-primary-500 py-1 text-sm">
                Inbox
              </Link>
              <Button variant="outline" size="sm" disabled={!canCreate} onClick={onCreate}>
                New
              </Button>
            </>
          }
        />
      }>
      <ScreenBody width="band">
        {connectionState}
        {!blocked && agentSelector}
        {createError !== null && (
          <InlineNotice variant="error" role="alert">
            {createError}
          </InlineNotice>
        )}
        {!blocked && sessions.length === 0 && (
          <EmptyState
            icon={<MessageSquare aria-hidden />}
            title="Nothing running here"
            description="Start a session on this machine, or open a new one from here."
          />
        )}
        {!blocked &&
          sessions.map(session => (
            <SessionRow key={session.sessionId} instanceId={instanceId} session={session} />
          ))}
        {sessionLoadError != null && <ScreenError error={sessionLoadError} />}
      </ScreenBody>
    </Page>
  );
}

export function SessionRow({ instanceId, session }: { instanceId: string; session: SessionInfo }) {
  return (
    <Link
      to={`/session/${encodeURIComponent(instanceId)}/${encodeURIComponent(session.sessionId)}`}
      className="block">
      <Card variant="filled">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <P className="truncate font-medium">{session.title ?? session.cwd ?? 'Untitled'}</P>
            <div className="flex flex-wrap items-center gap-2">
              {session.updatedAt && <Small>{relativeTime(session.updatedAt, 'just now')}</Small>}
              <SessionAgentBadge meta={session._meta} />
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
        </div>
      </Card>
    </Link>
  );
}
