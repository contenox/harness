import { Badge } from '../../components/Badge';
import type { Instance } from '../lib/api/types';
import { hostState, hostStateLabel, type HostState } from '../lib/hostState';


const BADGE_VARIANTS: Record<HostState, 'success' | 'default' | 'outline'> = {
  connected: 'success',
  offline: 'default',
  revoked: 'outline',
};

export function HostStateBadge({ host }: { host: Instance }) {
  const state = hostState(host);
  return (
    <Badge variant={BADGE_VARIANTS[state]} className="shrink-0 whitespace-nowrap">
      {hostStateLabel(state)}
    </Badge>
  );
}
