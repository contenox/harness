import {
  Container,
  EmptyState,
  InlineNotice,
  P,
  Page,
  SettingsGroup,
  SettingsRow,
  Spinner,
} from '@contenox/ui';
import { Plug, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ConnectorForm, type WorkspaceChoice } from '../../../components/connectors/ConnectorForm';
import { folderBasename } from '../../../components/workspace/folderTree';
import { useConnectors, useSaveConnector } from '../../../hooks/useConnectors';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import type { Connector } from '../../../lib/connectorTypes';
import { projectName } from '../../../lib/workspaceRoots';
import { ConnectorRow } from './components/ConnectorRow';

function samePath(a: string, b: string) {
  return a.replace(/[\\/]+$/, '').toLowerCase() === b.replace(/[\\/]+$/, '').toLowerCase();
}

export default function ConnectorsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const connectors = useConnectors();
  const roots = useWorkspaceRoots();
  const save = useSaveConnector();
  const [adding, setAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const open = searchParams.get('connector');

  const setOpen = (name: string, expanded: boolean) =>
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (expanded) next.set('connector', name);
        else if (next.get('connector') === name) next.delete('connector');
        return next;
      },
      { replace: true },
    );

  const all = connectors.data ?? [];
  const workspaces: WorkspaceChoice[] = roots.roots.map(r => ({
    path: r.path,
    name: projectName(r),
  }));
  const everywhere = all.filter(c => c.scope === 'everywhere' && c.kind !== 'builtin');
  const scoped = all.filter(c => c.scope === 'workspace');
  const fromAgents = all.filter(c => c.scope === 'agent');
  const builtin = all.filter(c => c.kind === 'builtin');
  const folders = Array.from(new Set(scoped.map(c => c.workspace ?? ''))).filter(Boolean);
  const nameOf = (path: string) =>
    workspaces.find(w => samePath(w.path, path))?.name ?? folderBasename(path);
  const takenNames = all.map(c => c.name);

  const row = (c: Connector) => (
    <ConnectorRow
      key={c.name}
      connector={c}
      workspaces={workspaces}
      expanded={open === c.name}
      onExpandedChange={x => setOpen(c.name, x)}
    />
  );

  return (
    <Page bodyScroll="auto" className="h-full">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <P variant="muted" className="px-1 text-[13px]">
            {t('connectors.intro')}
          </P>
          {connectors.isLoading && (
            <div className="flex justify-center py-6" role="status">
              <Spinner />
            </div>
          )}
          {connectors.error && (
            <InlineNotice variant="error" role="alert">
              {t('connectors.load_error', { message: connectors.error.message })}
            </InlineNotice>
          )}
          {!connectors.isLoading && !connectors.error && (
            <>
              {everywhere.length === 0 && scoped.length === 0 && !adding && (
                <EmptyState
                  icon={<Plug />}
                  title={t('connectors.empty_title')}
                  description={t('connectors.empty_description')}
                />
              )}
              <SettingsGroup title={t('connectors.group_everywhere')}>
                {everywhere.map(row)}
                <SettingsRow
                  icon={<Plus />}
                  title={t('connectors.new.title')}
                  description={t('connectors.new.description')}
                  expanded={adding}
                  onExpandedChange={setAdding}>
                  <ConnectorForm
                    key={formKey}
                    takenNames={takenNames}
                    workspaces={workspaces}
                    pending={save.isPending}
                    error={save.error?.message}
                    onSave={values =>
                      save.mutate(
                        { values },
                        {
                          onSuccess: created => {
                            setAdding(false);
                            setFormKey(k => k + 1);
                            setOpen(created.name, true);
                          },
                        },
                      )
                    }
                    onCancel={() => setAdding(false)}
                  />
                </SettingsRow>
              </SettingsGroup>
              {folders.map(folder => (
                <SettingsGroup
                  key={folder}
                  title={t('connectors.group_workspace', { name: nameOf(folder) })}>
                  {scoped.filter(c => c.workspace === folder).map(row)}
                </SettingsGroup>
              ))}
              {fromAgents.length > 0 && (
                <SettingsGroup title={t('connectors.group_agents')}>
                  {fromAgents.map(row)}
                </SettingsGroup>
              )}
              {builtin.length > 0 && (
                <SettingsGroup title={t('connectors.group_builtin')}>
                  {builtin.map(row)}
                </SettingsGroup>
              )}
            </>
          )}
        </div>
      </Container>
    </Page>
  );
}
