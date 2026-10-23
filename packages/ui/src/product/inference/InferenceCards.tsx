import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ButtonGroup } from '../../components/ButtonGroup';
import { InlineNotice } from '../../components/InlineNotice';
import { P, Small, Span } from '../../components/Typography';
import { ProgressBar } from '../../components/ProgressBar';
import { ResourceCard } from '../../components/ResourceCard';
import { Select } from '../../components/Select';
import type { InferenceBackend, InferenceModel, InferencePool, ModelTransferStatus } from './types';

export function transferPercentage(status: ModelTransferStatus): number | null {
  if (status.total === undefined || status.total <= 0 || status.completed === undefined)
    return null;
  return Math.max(0, Math.min(100, Math.round((status.completed / status.total) * 100)));
}

export function ModelDeploymentStatus({
  name,
  transfer,
  available,
}: {
  name: string;
  transfer?: ModelTransferStatus;
  available: boolean;
}) {
  const percentage = transfer ? transferPercentage(transfer) : null;
  return (
    <div className="space-y-1.5 rounded-lg border border-surface-200 p-3 dark:border-dark-surface-600">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Span className="font-mono text-sm font-medium">{name}</Span>
        <Badge variant={transfer ? 'primary' : available ? 'success' : 'outline'}>
          {transfer?.status ?? (available ? 'Available' : 'Not available')}
        </Badge>
      </div>
      {percentage !== null && <ProgressBar value={percentage} palette="primary" />}
    </div>
  );
}

export interface InferenceBackendCardProps {
  backend: InferenceBackend;
  pools?: InferencePool[];
  assignablePools?: InferencePool[];
  transfers?: Record<string, ModelTransferStatus>;
  busy?: boolean;
  onEdit?: (backend: InferenceBackend) => void;
  onDelete?: (backend: InferenceBackend) => void;
  onAssignPool?: (poolID: string) => void;
  onRemovePool?: (poolID: string) => void;
}

export function InferenceBackendCard({
  backend,
  pools = [],
  assignablePools = [],
  transfers = {},
  busy = false,
  onEdit,
  onDelete,
  onAssignPool,
  onRemovePool,
}: InferenceBackendCardProps) {
  return (
    <ResourceCard
      title={backend.name}
      subtitle={`${backend.kind} · ${backend.endpoint}`}
      status={backend.error ? 'error' : 'success'}
      actions={{
        edit: onEdit ? () => onEdit(backend) : undefined,
        delete: onDelete ? () => onDelete(backend) : undefined,
      }}
      isLoading={busy}>
      {backend.error && <InlineNotice variant="error">{backend.error}</InlineNotice>}
      <div className="space-y-2">
        {backend.models.map(name => (
          <ModelDeploymentStatus
            key={name}
            name={name}
            transfer={transfers[name]}
            available={backend.availableModels?.includes(name) ?? false}
          />
        ))}
      </div>
      {(pools.length > 0 || assignablePools.length > 0) && (
        <div className="space-y-3 border-t border-surface-200 pt-4 dark:border-dark-surface-600">
          <Small>Routing pools</Small>
          {pools.map(pool => (
            <div key={pool.id} className="flex items-center justify-between gap-2">
              <P>{pool.name}</P>
              {onRemovePool && (
                <Button variant="ghost" size="sm" onClick={() => onRemovePool(pool.id)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          {onAssignPool && assignablePools.length > 0 && (
            <Select
              value=""
              placeholder="Assign to pool"
              disabled={busy}
              options={assignablePools.map(pool => ({ value: pool.id, label: pool.name }))}
              onChange={event => event.target.value && onAssignPool(event.target.value)}
            />
          )}
        </div>
      )}
    </ResourceCard>
  );
}

export function InferencePoolCard({
  pool,
  busy,
  onEdit,
  onDelete,
}: {
  pool: InferencePool;
  busy?: boolean;
  onEdit?: (pool: InferencePool) => void;
  onDelete?: (pool: InferencePool) => void;
}) {
  return (
    <ResourceCard
      title={pool.name}
      subtitle={pool.purpose}
      isLoading={busy}
      actions={{
        edit: onEdit ? () => onEdit(pool) : undefined,
        delete: onDelete ? () => onDelete(pool) : undefined,
      }}>
      {null}
    </ResourceCard>
  );
}

export function InferenceModelCard({
  model,
  pools = [],
  busy,
  onDelete,
  onRemovePool,
}: {
  model: InferenceModel;
  pools?: InferencePool[];
  busy?: boolean;
  onDelete?: (model: InferenceModel) => void;
  onRemovePool?: (poolID: string) => void;
}) {
  return (
    <ResourceCard
      title={model.name}
      subtitle={model.createdAt}
      isLoading={busy}
      actions={{
        delete: onDelete ? () => onDelete(model) : undefined,
      }}>
      <ButtonGroup className="flex-wrap">
        {pools.map(pool => (
          <Button key={pool.id} size="sm" variant="outline" onClick={() => onRemovePool?.(pool.id)}>
            {pool.name}
          </Button>
        ))}
      </ButtonGroup>
    </ResourceCard>
  );
}
