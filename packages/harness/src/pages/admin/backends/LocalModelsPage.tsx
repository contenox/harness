import { Container, InlineNotice, Page, Select, Spinner } from '@contenox/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LocalModels } from '../../../components/localAI/LocalModels';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { createLocalAI, LocalAIContext } from '../../../lib/localAI';
import { hasProjectBridge } from '../../../lib/projectRuntime';
import { projectName } from '../../../lib/workspaceRoots';

export default function LocalModelsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const projects = useWorkspaceRoots();
  const selected = hasProjectBridge() ? (params.get('workspace') ?? '') : '';
  const selectedRoot = projects.roots.find(root => root.path === selected);
  const workspace = selectedRoot?.default ? '' : selected;
  const client = useMemo(() => createLocalAI(workspace), [workspace]);
  const choices = projects.roots.filter(root => !root.default);
  return (
    <Page bodyScroll="auto" className="h-full">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        {hasProjectBridge() && (choices.length > 0 || selected) && (
          <label className="mx-auto mb-3 block max-w-2xl text-sm">
            {t('subscriptions.root')}
            <Select
              value={workspace}
              options={[
                { value: '', label: t('localAI.defaultInventory') },
                ...choices.map(root => ({ value: root.path, label: projectName(root) })),
                ...(selected && !selectedRoot ? [{ value: selected, label: selected }] : []),
              ]}
              onChange={event => {
                const next = new URLSearchParams(params);
                if (event.target.value) next.set('workspace', event.target.value);
                else next.delete('workspace');
                setParams(next, { replace: true });
              }}
            />
          </label>
        )}
        {selected && !selectedRoot ? (
          projects.isLoading ? (
            <Spinner />
          ) : (
            <InlineNotice variant="error">
              {projects.error?.message || t('localAI.missingWorkspace')}
            </InlineNotice>
          )
        ) : (
          <LocalAIContext.Provider value={client}>
            <LocalModels key={workspace} onBack={() => navigate('/backends?tab=providers')} />
          </LocalAIContext.Provider>
        )}
      </Container>
    </Page>
  );
}
