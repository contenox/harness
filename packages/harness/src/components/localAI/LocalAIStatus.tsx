import { Button, H2, InlineNotice, P, SettingsGroup, SettingsRow, Spinner } from '@contenox/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Cpu, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { localAI } from '../../lib/localAI';

const states = {
  running: 'localAI.running',
  'not-running': 'localAI.stopped',
  'not-installed': 'localAI.missing',
  stale: 'localAI.stale',
  unreachable: 'localAI.unreachable',
} as const;
export function LocalAIStatus({ showInventoryLink = true }: { showInventoryLink?: boolean }) {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ['local-ai', 'status'],
    queryFn: localAI.status,
    refetchInterval: 5000,
  });
  const unload = useMutation({ mutationFn: localAI.unload, onSuccess: () => void q.refetch() });
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <H2>{t('localAI.status')}</H2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void q.refetch()}
          disabled={q.isFetching}>
          <RefreshCw size={14} />
          {t('localAI.refresh')}
        </Button>
      </header>
      {q.isLoading && <Spinner />}
      {(unload.error || q.error || q.data?.error) && (
        <InlineNotice variant="error" role="alert">
          {unload.error?.message || q.error?.message || q.data?.error}
        </InlineNotice>
      )}
      {q.data && (
        <SettingsGroup>
          <SettingsRow
            icon={<Cpu />}
            title={t('localAI.engine')}
            trailing={t(states[q.data.state])}
          />
          {q.data.workers?.map(worker => (
            <SettingsRow
              key={worker.instance || worker.spec.model}
              title={worker.spec.model}
              description={[worker.spec.backend, ...(worker.devices ?? [])]
                .filter(Boolean)
                .join(' · ')}
              trailing={worker.state}>
              {worker.error && <InlineNotice variant="error">{worker.error}</InlineNotice>}
              <Button
                disabled={worker.references > 0 || unload.isPending}
                size="sm"
                variant="outline"
                onClick={() => unload.mutate(worker.instance)}>
                {t('localAI.unload')}
              </Button>
            </SettingsRow>
          ))}
          {!q.data.workers?.length && (
            <div className="px-4 py-3">
              <P variant="muted">
                {t(q.data.state === 'running' ? 'localAI.idle' : 'localAI.noWorker')}
              </P>
            </div>
          )}
        </SettingsGroup>
      )}
      {showInventoryLink && (
        <Link to="/local-models" className="text-link text-sm hover:underline">
          {t('localAI.inventory')}
        </Link>
      )}
    </section>
  );
}
