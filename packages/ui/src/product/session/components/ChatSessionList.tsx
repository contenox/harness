import { MessageSquare } from 'lucide-react';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { ListCard } from '../../../components/ListCard';
import { LoadingState } from '../../../components/LoadingState';
import { Small } from '../../../components/Typography';

export interface ChatSessionSummary {
  id: string;
  model: string;
  startedAt: string;
  lastMessage?: string;
}

export function ChatSessionList({
  sessions,
  loading,
  error,
  onResume,
}: {
  sessions: ChatSessionSummary[];
  loading?: boolean;
  error?: string;
  onResume: (session: ChatSessionSummary) => void;
}) {
  if (loading) return <LoadingState message="Loading conversations" />;
  if (error)
    return <EmptyState title="Conversations unavailable" description={error} variant="error" />;
  if (sessions.length === 0)
    return (
      <EmptyState
        title="No conversations"
        description="Start a conversation and it will appear here."
        icon={<MessageSquare />}
      />
    );
  return (
    <div className="space-y-3">
      {sessions.map(session => (
        <ListCard
          key={session.id}
          title={session.model}
          meta={
            <>
              <Small>{new Date(session.startedAt).toLocaleString()}</Small>
              {session.lastMessage && (
                <Small className="block truncate">{session.lastMessage}</Small>
              )}
              <Small className="block font-mono">{session.id}</Small>
            </>
          }
          trailing={
            <Button size="sm" variant="outline" onClick={() => onResume(session)}>
              Resume
            </Button>
          }
        />
      ))}
    </div>
  );
}
