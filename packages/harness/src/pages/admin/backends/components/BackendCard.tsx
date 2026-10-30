import { Badge, Label, ResourceCard } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConnectionRepair } from '../../../../components/providers/ConnectionRepair';
import { connectionFromBackend } from '../../../../lib/chatRecovery';
import { Backend } from '../../../../lib/types';
import { ModelStatusDisplay } from './ModelStatusDisplay';

type BackendCardProps = {
  backend: Backend;
  onEdit: (backend: Backend) => void;
  onDelete: (id: string) => Promise<void>;
};

function uniqueObservedModels(models: Backend['pulledModels']): Backend['pulledModels'] {
  const seen = new Set<string>();
  return models.filter(model => {
    const key = model.model.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function backendTypeLabel(backend: Backend): string {
  if (backend.type !== 'modeld') return backend.type;
  const isLocal = backend.baseUrl === 'local' || backend.baseUrl === '';
  return isLocal ? 'modeld (local)' : 'modeld (remote)';
}

export function BackendCard({ backend, onEdit, onDelete }: BackendCardProps) {
  const { t } = useTranslation();
  const [deletingBackendId, setDeletingBackendId] = useState<string | null>(null);
  const observedModels = uniqueObservedModels(backend.pulledModels ?? []);

  const handleDelete = async (id: string) => {
    setDeletingBackendId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingBackendId(null);
    }
  };

  return (
    <ResourceCard
      title={backend.name}
      subtitle={backend.baseUrl}
      status={backend.error ? 'error' : 'default'}
      actions={{
        edit: () => onEdit(backend),
        delete: () => handleDelete(backend.id),
      }}
      isLoading={deletingBackendId === backend.id}
      actionLabels={{
        edit: t('common.edit'),
        delete: t('common.delete'),
        deleting: t('common.deleting'),
      }}>
      <div className="flex items-center gap-2">
        <Badge variant={backend.error ? 'error' : 'default'} size="sm">
          {backendTypeLabel(backend)}
        </Badge>
      </div>

      {(backend.error || backend.errorCode) && (
        <ConnectionRepair connection={connectionFromBackend(backend)} />
      )}

      {observedModels.length > 0 && (
        <div>
          <Label className="block text-sm font-medium">
            {t('backends.observed_models_title')} ({observedModels.length})
          </Label>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {observedModels.map(model => (
              <ModelStatusDisplay key={model.model} modelName={model.model} />
            ))}
          </div>
        </div>
      )}

    </ResourceCard>
  );
}
