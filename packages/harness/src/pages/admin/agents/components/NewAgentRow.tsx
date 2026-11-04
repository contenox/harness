import { SettingsRow } from '@contenox/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentForm } from './AgentForm';

type Props = {
  takenNames: string[];
  onCreated: (name: string) => void;
};

export function NewAgentRow({ takenNames, onCreated }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <SettingsRow
      icon={<Plus />}
      title={t('external_agents.new.title')}
      description={t('external_agents.new.description')}
      expanded={expanded}
      onExpandedChange={setExpanded}>
      <AgentForm
        key={formKey}
        takenNames={takenNames}
        onSaved={agent => {
          setExpanded(false);
          setFormKey(k => k + 1);
          onCreated(agent.name);
        }}
        onCancel={() => setExpanded(false)}
      />
    </SettingsRow>
  );
}
