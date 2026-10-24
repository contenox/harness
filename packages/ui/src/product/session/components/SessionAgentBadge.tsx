import { Badge } from '../../../components/Badge';
import { externalAgentFromMeta } from '@contenox/acp-client';

export function SessionAgentBadge({ meta }: { meta: Record<string, unknown> | undefined | null }) {
  const agent = externalAgentFromMeta(meta);
  if (agent === null) return null;
  return (







    <Badge variant="primary" size="sm" className="w-fit" aria-label={`Agent: ${agent}`}>
      {agent}
    </Badge>
  );
}
