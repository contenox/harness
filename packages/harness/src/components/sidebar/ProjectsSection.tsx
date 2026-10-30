import { IconButton, SidebarSection, Span, Spinner } from '@contenox/ui';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SessionInfo } from '../../lib/acp';
import type { WorkspaceRoot } from '../../lib/types';
import { projectName } from '../../lib/workspaceRoots';
import { OTHER_GROUP_KEY } from './collapsedGroups';
import { OtherSessionsGroup } from './OtherSessionsGroup';
import { ProjectActions } from './ProjectActions';
import { ProjectGroup } from './ProjectGroup';
import { SessionList } from './SessionList';
import type { SessionGroups } from './sessionGroups';

type Props = {
  groups: SessionGroups;
  loading: boolean;
  activeSessionId: string | undefined;
  pendingPermission: (sessionId: string) => boolean;
  isGroupOpen: (key: string) => boolean;
  onToggleGroup: (key: string) => void;
  onNavigate: () => void;
  onDeleteSession: (session: SessionInfo) => void;
  onNewProject: () => void;
  onNewSessionIn: (path: string) => void;
  onRenameProject: (root: WorkspaceRoot) => void;
  onRemoveProject: (root: WorkspaceRoot, sessionCount: number) => void;
  removeFailed: boolean;
};

export function ProjectsSection(props: Props) {
  const { t } = useTranslation();
  const { groups } = props;
  const empty = groups.projects.length === 0 && groups.other.length === 0;
  const list = {
    activeSessionId: props.activeSessionId,
    pendingPermission: props.pendingPermission,
    onNavigate: props.onNavigate,
    onDelete: props.onDeleteSession,
  };

  return (
    <SidebarSection
      title={t('acp_sidebar.projects')}
      className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
      action={
        <IconButton label={t('acp_sidebar.new_project')} size="xs" onClick={props.onNewProject}>
          <Plus className="size-3.5" aria-hidden />
        </IconButton>
      }>
      {props.loading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Spinner size="md" />
          <Span variant="muted">{t('acp_sidebar.loading')}</Span>
        </div>
      ) : empty ? (
        <Span variant="muted" className="block px-2">
          {t('acp_sidebar.empty_hint')}
        </Span>
      ) : (
        <>
          {groups.projects.map(({ root, sessions }) => {
            const name = projectName(root);
            return (
              <ProjectGroup
                key={root.path}
                title={name}
                open={props.isGroupOpen(root.path)}
                onToggle={() => props.onToggleGroup(root.path)}
                actions={
                  <ProjectActions
                    name={name}
                    onNewSession={() => props.onNewSessionIn(root.path)}
                    onRename={() => props.onRenameProject(root)}
                    onRemove={() => props.onRemoveProject(root, sessions.length)}
                  />
                }>
                <SessionList sessions={sessions} {...list} />
              </ProjectGroup>
            );
          })}
          {groups.other.length > 0 && (
            <OtherSessionsGroup
              sessions={groups.other}
              open={props.isGroupOpen(OTHER_GROUP_KEY)}
              onToggle={props.onToggleGroup}
              {...list}
            />
          )}
        </>
      )}
      {props.removeFailed && (
        <Span className="block px-2 text-xs text-text-error" role="alert">
          {t('acp_sidebar.remove_project_error')}
        </Span>
      )}
    </SidebarSection>
  );
}
