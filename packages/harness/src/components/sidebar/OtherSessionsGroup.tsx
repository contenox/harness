import { useTranslation } from 'react-i18next';
import { OTHER_GROUP_KEY } from './collapsedGroups';
import { ProjectGroup } from './ProjectGroup';
import { SessionList, type SessionListProps } from './SessionList';

type Props = SessionListProps & {
  open: boolean;
  onToggle: (key: string) => void;
};

/** Sessions that belong to no registered project. */
export function OtherSessionsGroup({ open, onToggle, ...list }: Props) {
  const { t } = useTranslation();
  return (
    <ProjectGroup title={t('acp_sidebar.other_sessions')} open={open} onToggle={() => onToggle(OTHER_GROUP_KEY)}>
      <SessionList {...list} />
    </ProjectGroup>
  );
}
