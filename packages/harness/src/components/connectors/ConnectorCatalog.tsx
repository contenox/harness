import { Dialog, ExternalLink, InlineNotice } from '@contenox/ui';
import { Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveConnector } from '../../hooks/useConnectors';
import { emptyConnectorForm } from '../../lib/connectorForm';
import type { Connector } from '../../lib/connectorTypes';
import { ConnectorForm, type WorkspaceChoice } from './ConnectorForm';

import { BrowserCatalog } from './BrowserCatalog';
import { catalog, type Entry } from './catalog';

export function ConnectorCatalog({
  connectors,
  workspaces,
  onOpen,
}: {
  connectors: Connector[];
  workspaces: WorkspaceChoice[];
  onOpen: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Entry | null>(null);
  const save = useSaveConnector();
  const names = connectors.map(connector => connector.name);
  const close = () => {
    if (!save.isPending) setSelected(null);
  };
  return (
    <section aria-label={t('connectors.catalog.title')}>
      <h3 className="text-text-subtle px-1 pb-2 text-[11px] font-medium tracking-wider uppercase">
        {t('connectors.catalog.title')}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {typeof window !== 'undefined' && window.contenoxDesktop?.browser && (
          <BrowserCatalog connectors={connectors} workspaces={workspaces} />
        )}
        {catalog.map(entry => {
          const configured = connectors.find(
            c => c.kind === 'mcp' && c.url?.replace(/\/$/, '') === entry.url.replace(/\/$/, ''),
          );
          return (
            <button
              key={entry.id}
              type="button"
              className="border-line bg-raised hover:bg-hover focus-visible:outline-accent flex items-start gap-3 rounded-xl border p-3.5 text-left"
              onClick={() => {
                if (configured) onOpen(configured.name);
                else {
                  save.reset();
                  setSelected(entry);
                }
              }}>
              <entry.icon aria-hidden className={'mt-0.5 size-5 shrink-0 ' + entry.color} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{entry.name}</span>
                <span className="text-text-muted mt-1 block text-xs">
                  {t(`connectors.catalog.${entry.id}`)}
                </span>
              </span>
              {configured ? (
                <Check
                  aria-label={t('connectors.catalog.added')}
                  className="text-text-muted size-4"
                />
              ) : (
                <ChevronRight aria-hidden className="text-text-subtle size-4" />
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <Dialog
          open
          title={t('connectors.catalog.setup', { name: selected.name })}
          onClose={close}
          closeLabel={t('common.close')}>
          <div className="mb-4 space-y-1">
            <InlineNotice variant="info">
              {selected.id === 'asana'
                ? t('connectors.catalog.asana_setup', {
                    callback: window.location.origin + '/api/mcp/oauth/callback',
                  })
                : t(`connectors.catalog.auth_${selected.auth}`, { name: selected.name })}
            </InlineNotice>
            <div className="text-text-muted font-mono text-xs break-all">{selected.url}</div>
            <ExternalLink href={selected.docs}>
              {t('connectors.catalog.guide', { name: selected.name })}
            </ExternalLink>
          </div>
          <ConnectorForm
            key={selected.id}
            preset
            registeredClient={selected.id === 'asana'}
            initial={{
              ...emptyConnectorForm,
              kind: 'remote',
              name: selected.id,
              url: selected.url,
              auth: selected.auth,
            }}
            takenNames={names}
            workspaces={workspaces}
            pending={save.isPending}
            error={save.error?.message}
            onCancel={close}
            onSave={values =>
              save.mutate(
                { values },
                {
                  onSuccess: created => {
                    setSelected(null);
                    onOpen(created.name);
                  },
                },
              )
            }
          />
        </Dialog>
      )}
    </section>
  );
}
