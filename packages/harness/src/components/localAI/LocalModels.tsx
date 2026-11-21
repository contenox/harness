import {
  Button,
  Dialog,
  H1,
  H2,
  InlineNotice,
  Input,
  P,
  Panel,
  SettingsGroup,
  SettingsRow,
  Spinner,
} from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  Download,
  HardDrive,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRefreshSetupStatus } from '../../hooks/useRefreshSetupStatus';
import {
  isWorking,
  modelSize,
  useLocalAI,
  type LocalAction,
  type LocalModel,
  type MediaTarget,
  type ModelOperation,
} from '../../lib/localAI';
import { LocalAIStatus } from './LocalAIStatus';

import { MediaRoleControl } from './MediaRoleControl';
import { ModelImportDialog } from './ModelImportDialog';
import { ModelProgress } from './ModelProgress';

export function LocalModels({
  onboarding = false,
  onBack,
}: {
  onboarding?: boolean;
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation();
  const localAI = useLocalAI();
  const { models: modelKey, operation: operationKey } = localAI.keys;
  const cache = useQueryClient();
  const { mutate: refreshSetup } = useRefreshSetupStatus();
  const [importOpen, setImportOpen] = useState(false);
  const [inventory, setInventory] = useState(!onboarding);
  const [filter, setFilter] = useState('');
  const [removing, setRemoving] = useState<LocalModel>();
  const [token, setToken] = useState('');
  const handled = useRef('');
  const activity = useRef<HTMLDivElement>(null);
  const models = useQuery({ queryKey: modelKey, queryFn: localAI.models });
  const hardware = useQuery({
    queryKey: localAI.keys.hardware,
    queryFn: localAI.hardware,
    enabled: false,
    retry: false,
  });
  const progress = useQuery({
    queryKey: operationKey,
    queryFn: localAI.progress,
    refetchInterval: q => (isWorking(q.state.data?.phase) ? 800 : 5000),
  });
  const op = progress.data;
  const busy = isWorking(op?.phase);
  const start = useMutation({
    mutationFn: (input: {
      model: string;
      action: LocalAction;
      token?: string;
      tokenOrigin?: string;
      target?: MediaTarget;
    }) => localAI.start(input.model, input.action, input.token, input.tokenOrigin, input.target),
    onSuccess: next => {
      setToken('');
      cache.setQueryData(operationKey, next);
      requestAnimationFrame(() => activity.current?.scrollIntoView({ block: 'nearest' }));
    },
  });
  const cancel = useMutation({
    mutationFn: localAI.cancel,
    onSuccess: () => void progress.refetch(),
  });
  const remove = useMutation({
    mutationFn: localAI.remove,
    onSuccess: () => {
      setRemoving(undefined);
      void models.refetch();
      refreshSetup();
    },
  });
  const locked = busy || start.isPending || remove.isPending;
  const finished = op?.phase && !busy ? op : undefined;
  useEffect(() => {
    if (!finished || handled.current === finished.id) return;
    handled.current = finished.id;
    void cache.invalidateQueries({ queryKey: modelKey });
    if (finished.phase === 'done') refreshSetup();
  }, [finished, cache, refreshSetup, modelKey]);
  const installed = (models.data ?? []).filter(m => m.installed);
  const size = (bytes: number) => modelSize(bytes, i18n.language);
  const matches = (m: LocalModel) =>
    (m.label + ' ' + m.name).toLowerCase().includes(filter.trim().toLowerCase());
  const rec = models.data?.find(m => m.name === hardware.data?.recommendation);
  const error = start.error || cancel.error || models.error || progress.error || hardware.error;
  const row = (m: LocalModel) => (
    <SettingsRow
      key={m.name}
      icon={m.installed ? <HardDrive /> : <Download />}
      title={m.label}
      description={[
        m.lora && 'LoRA',
        m.engine === 'llama' ? 'llama.cpp' : m.engine === 'openvino' ? 'OpenVINO' : m.engine,
        size(m.bytes),
        m.label !== m.name ? m.name : '',
      ]
        .filter(Boolean)
        .join(' · ')}
      trailing={m.primary ? t('localAI.primary') : m.assigned ? t('localAI.assigned') : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        {m.mediaError && <InlineNotice variant="error">{m.mediaError}</InlineNotice>}
        {m.installed && m.pipeline && !m.mediaError && (
          <MediaRoleControl
            model={m}
            disabled={locked}
            onAssign={target => start.mutate({ model: m.name, action: 'use-media', target })}
          />
        )}
        {m.chat && !m.primary && (
          <Button
            size="sm"
            disabled={locked}
            onClick={() => start.mutate({ model: m.name, action: 'use' })}>
            {t(m.installed ? 'localAI.useChat' : 'localAI.downloadUse')}
          </Button>
        )}
        {!m.installed && (
          <Button
            size="sm"
            variant={m.chat ? 'outline' : 'primary'}
            disabled={locked}
            onClick={() => start.mutate({ model: m.name, action: 'download' })}>
            {t('localAI.download')}
          </Button>
        )}
        {inventory && m.installed && !m.assigned && (
          <Button
            size="sm"
            variant="danger"
            disabled={locked}
            onClick={() => {
              remove.reset();
              setRemoving(m);
            }}>
            <Trash2 size={14} />
            {t('localAI.remove')}
          </Button>
        )}
        {m.primary && (
          <span className="text-text-muted flex items-center gap-2 text-sm">
            <Check size={15} />
            {t('localAI.doneUse')}
          </span>
        )}
      </div>
    </SettingsRow>
  );
  const group = (title: string, items: LocalModel[], empty: string) => (
    <SettingsGroup title={title}>
      {items.length ? items.map(row) : <p className="text-text-muted px-4 py-4 text-sm">{empty}</p>}
    </SettingsGroup>
  );
  const opTitle = (value: ModelOperation) => {
    switch (value.phase) {
      case 'prepare':
        return t('localAI.prepare');
      case 'download':
        return t(value.action === 'import' ? 'localAI.importing' : 'localAI.downloading');
      case 'verify':
        if (value.action === 'use-media') return t('mediaGeneration.checkRole');
        return t('localAI.verify');
      case 'done':
        if (value.action === 'import') return t('localAI.imported');
        if (value.action === 'use-media') return t('mediaGeneration.roleActive');
        return t(value.action === 'use' ? 'localAI.doneUse' : 'localAI.doneDownload');
      case 'cancelled':
        return t('localAI.cancelled');
      default:
        return '';
    }
  };
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (inventory !== !onboarding ? setInventory(!onboarding) : onBack())}>
          <ArrowLeft size={15} />
          {t('localAI.back')}
        </Button>
      </div>
      <header className="space-y-1">
        <H1 variant="page">{t(inventory ? 'localAI.inventory' : 'localAI.setup')}</H1>
        <P variant="muted">
          {inventory
            ? t('localAI.storage', {
                count: installed.length,
                size: size(installed.reduce((sum, m) => sum + m.bytes, 0)),
              })
            : t('localAI.detectDesc')}
        </P>
      </header>
      {error && (
        <InlineNotice variant="error" role="alert">
          {error.message}
        </InlineNotice>
      )}
      {op?.id && (
        <Panel variant="surface">
          <div ref={activity} className="space-y-3" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">
                  {models.data?.find(m => m.name === op.model)?.label ?? op.model}
                </p>
                <p className="text-text-muted text-xs">{opTitle(op)}</p>
              </div>
              {busy && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(op.id)}>
                  {t('localAI.cancel')}
                </Button>
              )}
            </div>
            {busy && <ModelProgress operation={op} label={opTitle(op)} />}
            {op.phase === 'failed' &&
              (op.accessUrl ? (
                <div className="space-y-2">
                  <P variant="muted">{t('localAI.access')}</P>
                  <a
                    className="text-link text-sm underline"
                    href={op.accessUrl}
                    target="_blank"
                    rel="noreferrer">
                    {t('localAI.repository')}
                  </a>
                  <label className="block space-y-1 text-sm">
                    {t('localAI.token')}
                    <Input
                      type="password"
                      autoComplete="off"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <InlineNotice variant="error" role="alert">
                    {t(`localAI.failures.${op.failure ?? 'verify'}`)}
                  </InlineNotice>
                  <details className="text-text-muted text-xs">
                    <summary className="cursor-pointer">{t('localAI.details')}</summary>
                    <p className="mt-2 break-words">{op.error}</p>
                  </details>
                </div>
              ))}
            {(op.phase === 'failed' || op.phase === 'cancelled') && (
              <Button
                size="sm"
                disabled={locked || (!!op.accessUrl && !token.trim())}
                onClick={() =>
                  op.action === 'import'
                    ? setImportOpen(true)
                    : start.mutate({
                        model: op.model,
                        action: op.action,
                        token: token.trim() || undefined,
                        tokenOrigin: op.tokenOrigin,
                        target: op.target,
                      })
                }>
                {t('localAI.retry')}
              </Button>
            )}
          </div>
        </Panel>
      )}
      {(op?.failure === 'capacity' || op?.failure === 'busy') && (
        <LocalAIStatus showInventoryLink={false} />
      )}
      {!inventory && (
        <>
          <Panel variant="surface">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Cpu aria-hidden className="text-text-muted size-6" />
                <div>
                  <H2>{hardware.data?.device || t('localAI.deviceFallback')}</H2>
                  {hardware.data && (
                    <p className="text-text-muted text-sm">
                      {t('localAI.device')} · {size(hardware.data.memory)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant={hardware.data ? 'outline' : 'primary'}
                isLoading={hardware.isFetching}
                onClick={() => void hardware.refetch()}>
                {t(hardware.data ? 'localAI.detectAgain' : 'localAI.detect')}
              </Button>
            </div>
          </Panel>
          {hardware.data &&
            (rec ? (
              <Panel variant="surface">
                <div className="space-y-3">
                  <p className="text-text-muted text-xs font-medium">{t('localAI.recommended')}</p>
                  <H2>{rec.label}</H2>
                  <P variant="muted">{t('localAI.why')}</P>
                  <Button
                    disabled={locked}
                    onClick={() => start.mutate({ model: rec.name, action: 'use' })}>
                    {t(rec.installed ? 'localAI.useChat' : 'localAI.downloadUse')}
                    {!rec.installed && ' · ' + size(rec.bytes)}
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </Panel>
            ) : (
              <P variant="muted">{t('localAI.none')}</P>
            ))}
          {installed.length > 0 && group(t('localAI.installed'), installed, '')}
          <Button className="self-start" variant="text" onClick={() => setInventory(true)}>
            {t('localAI.browse')}
            <ArrowRight size={15} />
          </Button>
        </>
      )}
      {inventory && (
        <>
          <Button className="self-start" disabled={locked} onClick={() => setImportOpen(true)}>
            {t('localAI.importModel')}
          </Button>
          {importOpen && (
            <ModelImportDialog
              operation={op}
              names={(models.data ?? []).map(m => m.name)}
              onClose={() => setImportOpen(false)}
              onRegistered={() => void models.refetch()}
              onOperation={next => cache.setQueryData(operationKey, next)}
            />
          )}
          {!onboarding && (
            <Button className="self-start" variant="outline" onClick={() => setInventory(false)}>
              <Cpu size={15} />
              {t('localAI.check')}
            </Button>
          )}
          <div className="relative">
            <Search
              aria-hidden
              className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              className="pl-9"
              aria-label={t('localAI.search')}
              placeholder={t('localAI.search')}
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          {removing && (
            <Dialog
              open
              title={t('localAI.removeTitle')}
              closeLabel={t('localAI.cancel')}
              onClose={() => {
                if (!remove.isPending) setRemoving(undefined);
              }}>
              <div className="space-y-3">
                <p>{t('localAI.confirm', { model: removing.label, size: size(removing.bytes) })}</p>
                {remove.error && (
                  <InlineNotice variant="error" role="alert">
                    {remove.error.message}
                  </InlineNotice>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    solid
                    disabled={locked}
                    onClick={() => remove.mutate(removing.name)}>
                    {t('localAI.remove')}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={remove.isPending}
                    onClick={() => setRemoving(undefined)}>
                    {t('localAI.cancel')}
                  </Button>
                </div>
              </div>
            </Dialog>
          )}
          {models.isLoading ? (
            <Spinner />
          ) : (
            <>
              {group(
                t('localAI.installed'),
                installed.filter(matches),
                t(filter ? 'localAI.noResults' : 'localAI.empty'),
              )}
              {group(
                t('localAI.available'),
                (models.data ?? []).filter(m => !m.installed && matches(m)),
                t('localAI.noResults'),
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
