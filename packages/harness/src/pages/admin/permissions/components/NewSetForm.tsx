import { Button, FormField, InlineNotice, Input, Select, SettingsRow } from '@contenox/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { displayName, slugFor } from '../../../../lib/permissions';

type Props = {
  names: string[];
  onCreate: (name: string, value: Record<string, unknown>) => Promise<unknown>;
};

export function NewSetForm({ names, onCreate }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parent, setParent] = useState(names.includes('default') ? 'default' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingTitle, setMissingTitle] = useState(false);
  const slug = slugFor(title, names);

  const submit = async () => {
    if (title.trim() === '') {
      setMissingTitle(true);
      return;
    }
    setBusy(true);
    setError(null);
    const value: Record<string, unknown> = {};
    if (parent) value.extends = parent;
    value.description = description.trim() || title.trim();
    try {
      await onCreate(slug, value);
      setTitle('');
      setDescription('');
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsRow
      icon={<Plus />}
      title={t('permissions.new_set')}
      description={t('permissions.new_set_description')}
      expanded={expanded}
      onExpandedChange={setExpanded}>
      <form
        className="flex flex-col gap-4"
        onSubmit={e => {
          e.preventDefault();
          void submit();
        }}>
        <FormField
          label={t('permissions.new_set_title_label')}
          description={
            title.trim() ? t('permissions.new_set_name_hint', { name: slug }) : undefined
          }
          error={missingTitle ? t('permissions.new_set_name_required') : undefined}>
          <Input
            value={title}
            placeholder={t('permissions.new_set_title_placeholder')}
            onChange={e => {
              setTitle(e.target.value);
              setMissingTitle(false);
            }}
          />
        </FormField>
        <FormField label={t('permissions.new_set_description_label')}>
          <Input
            value={description}
            placeholder={t('permissions.new_set_description_placeholder')}
            onChange={e => setDescription(e.target.value)}
          />
        </FormField>
        <FormField label={t('permissions.new_set_parent_label')}>
          <Select
            className="w-64"
            value={parent}
            options={[
              { value: '', label: t('permissions.new_set_parent_none') },
              ...names.map(n => ({ value: n, label: displayName(n) })),
            ]}
            onChange={e => setParent(e.target.value)}
          />
        </FormField>
        {error && (
          <InlineNotice variant="error" role="alert">
            {error}
          </InlineNotice>
        )}
        <div>
          <Button type="submit" variant="primary" size="sm" isLoading={busy} disabled={busy}>
            {busy ? t('permissions.creating') : t('permissions.create')}
          </Button>
        </div>
      </form>
    </SettingsRow>
  );
}
