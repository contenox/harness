import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  H1,
  InlineNotice,
  LoadingState,
  P,
  Page,
  Section,
  Span,
} from '@contenox/ui';
import { useQueryClient } from '@tanstack/react-query';
import { FolderPlus, MessageSquarePlus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { startNewChat } from '../../../components/sidebar/newChatIntent';
import { AddProjectDialog } from '../../../components/workspace/AddProjectDialog';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';
import { useForgetWorkspaceRoot } from '../../../hooks/useWorkspaceRootMutations';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { ApiError } from '../../../lib/fetch';
import { workspaceRootKeys } from '../../../lib/queryKeys';
import { useStagedAgent } from '../../../lib/stagedAgent';
import { useStagedRoot } from '../../../lib/stagedRoot';
import type { WorkspaceRoot } from '../../../lib/types';
import { projectForCwd, projectName } from '../../../lib/workspaceRoots';

export default function ProjectsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { roots, isLoading, error } = useWorkspaceRoots();
  const { workspace, focusEmptyTab } = useAcpWorkspace();
  const { setStagedAgent } = useStagedAgent();
  const { setStagedRoot } = useStagedRoot();

  const forgetMutation = useForgetWorkspaceRoot();

  const [addOpen, setAddOpen] = useState(false);
  const desktop = typeof window !== 'undefined' ? window.contenoxDesktop : undefined;

  const handleOpenWorkspace = () => {
    void desktop?.openWorkspace();
  };

  const sessionCountForRoot = (root: WorkspaceRoot): number =>
    workspace.sessions.filter(s => projectForCwd(s.cwd, roots)?.path === root.path).length;

  const handleOpen = useCallback(
    (root: WorkspaceRoot) =>
      startNewChat(
        null,
        { setStagedAgent, setStagedRoot, focusEmptyTab, navigate, closeSidebar: () => {} },
        { cwd: root.path },
      ),
    [setStagedAgent, setStagedRoot, focusEmptyTab, navigate],
  );

  const handleForget = (root: WorkspaceRoot) => {
    const projectLabel = projectName(root);
    const count = sessionCountForRoot(root);
    const message =
      count > 0
        ? t('projects.forget_confirm_sessions', { name: projectLabel, count })
        : t('projects.forget_confirm', { name: projectLabel });
    if (!window.confirm(message)) return;
    forgetMutation.mutate(root.path);
  };

  if (isLoading) {
    return (
      <Page bodyScroll="auto">
        <LoadingState message={t('projects.loading')} />
      </Page>
    );
  }

  if (error) {
    return (
      <Page bodyScroll="auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 md:p-6">
          <ErrorState
            error={error}
            onRetry={() => queryClient.invalidateQueries({ queryKey: workspaceRootKeys.list() })}
            title={t('projects.load_error')}
          />
        </div>
      </Page>
    );
  }

  const forgetErrorMessage = forgetMutation.error
    ? forgetMutation.error instanceof ApiError
      ? forgetMutation.error.message
      : t('projects.forget_error_fallback')
    : null;

  return (
    <Page bodyScroll="auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 md:p-6">
        <div>
          <H1 variant="page">{t('projects.title')}</H1>
          <P variant="muted" className="mt-2">
            {t('projects.description')}
          </P>
        </div>

        {roots.length === 0 ? (
          <EmptyState
            title={t('projects.empty_title')}
            description={t('projects.empty_description')}
          />
        ) : (
          <Section>
            <ul className="space-y-2">
              {roots.map(root => {
                const forgetPending =
                  forgetMutation.isPending && forgetMutation.variables === root.path;
                return (
                  <li
                    key={root.path}
                    className="border-surface-200 dark:border-dark-surface-600 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{projectName(root)}</span>
                        {root.default && (
                          <Badge variant="secondary" size="sm">
                            {t('projects.default_badge')}
                          </Badge>
                        )}
                      </div>
                      <Span
                        variant="muted"
                        className="block truncate font-mono text-xs"
                        title={root.path}>
                        {root.path}
                      </Span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">

                      <Button
                        variant="outline"
                        palette="primary"
                        size="sm"
                        onClick={() => handleOpen(root)}>
                        <MessageSquarePlus className="h-4 w-4" aria-hidden />
                        {t('projects.open')}
                      </Button>

                      {root.managed && (
                        <Button
                          variant="outline"
                          palette="neutral"
                          size="sm"
                          isLoading={forgetPending}
                          disabled={forgetPending}
                          onClick={() => handleForget(root)}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                          {t('projects.forget')}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {forgetErrorMessage && (
              <InlineNotice variant="error" role="alert" className="mt-3">
                {forgetErrorMessage}
              </InlineNotice>
            )}
          </Section>
        )}

        <Section title={t('projects.add_title')} description={t('projects.add_description')}>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setAddOpen(true)}>
              <FolderPlus className="h-4 w-4" aria-hidden />
              {t('projects.browse_open')}
            </Button>
            {desktop && (
              <Button type="button" variant="outline" palette="neutral" onClick={handleOpenWorkspace}>
                <FolderPlus className="h-4 w-4" aria-hidden />
                {t('projects.open_workspace')}
              </Button>
            )}
          </div>
        </Section>
      </div>

      <AddProjectDialog open={addOpen} onClose={() => setAddOpen(false)} roots={roots} />
    </Page>
  );
}
