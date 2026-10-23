import { Badge } from '../../../components/Badge';
import { externalAgentFromMeta } from '@contenox/acp-client';

/**
 * Which agent a session is running as — the attribution half of choosing one.
 */
export function SessionAgentBadge({ meta }: { meta: Record<string, unknown> | undefined | null }) {
  const agent = externalAgentFromMeta(meta);
  if (agent === null) return null;
  return (







    <Badge variant="primary" size="sm" className="w-fit" aria-label={`Agent: ${agent}`}>
      {agent}
    </Badge>
  );
}
