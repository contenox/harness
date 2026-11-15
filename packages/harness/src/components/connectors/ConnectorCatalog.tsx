import { Dialog, ExternalLink } from '@contenox/ui';
import {
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  GitPullRequest,
  NotebookPen,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveConnector } from '../../hooks/useConnectors';
import { emptyConnectorForm } from '../../lib/connectorForm';
import type { Connector } from '../../lib/connectorTypes';
import { ConnectorForm, type WorkspaceChoice } from './ConnectorForm';

const catalog = [
  {
    id: 'linear',
    name: 'Linear',
    url: 'https://mcp.linear.app/mcp',
    auth: 'oauth',
    docs: 'https://linear.app/docs/mcp',
    icon: CircleDot,
    color: 'text-accent',
  },
  {
    id: 'notion',
    name: 'Notion',
    url: 'https://mcp.notion.com/mcp',
    auth: 'oauth',
    docs: 'https://developers.notion.com/guides/mcp/get-started-with-mcp',
    icon: NotebookPen,
    color: 'text-text',
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://api.githubcopilot.com/mcp/',
    auth: 'bearer',
    docs: 'https://github.com/github/github-mcp-server',
    icon: GitPullRequest,
    color: 'text-text',
  },
  {
    id: 'microsoft-learn',
    name: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/api/mcp',
    auth: 'none',
    docs: 'https://learn.microsoft.com/en-us/training/support/mcp',
    icon: BookOpen,
    color: 'text-link',
  },
] as const;

type Entry = (typeof catalog)[number];

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
            <p className="text-text-muted">{t(`connectors.catalog.auth_${selected.auth}`)}</p>
            <div className="text-text-muted font-mono text-xs break-all">{selected.url}</div>
            <ExternalLink href={selected.docs}>
              {t('connectors.catalog.guide', { name: selected.name })}
            </ExternalLink>
          </div>
          <ConnectorForm
            key={selected.id}
            preset
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
