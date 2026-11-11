import { Button, Chip, Input, Span } from '@contenox/ui';
import { X } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
};

export function ListEditor({ label, values, placeholder, onChange }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (value === '') return;
    if (!values.includes(value)) onChange([...values, value]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-text-muted text-xs font-medium">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1">
        {values.length === 0 && (
          <Span variant="muted" className="text-xs">
            {t('permissions.list_empty')}
          </Span>
        )}
        {values.map(value => (
          <Chip
            key={value}
            variant="outline"
            icon={<X />}
            label={<span className="font-mono text-xs">{value}</span>}
            aria-label={t('permissions.list_remove', { value })}
            onClick={() => onChange(values.filter(v => v !== value))}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          value={draft}
          placeholder={placeholder}
          className="h-8 max-w-xs font-mono text-xs"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={draft.trim() === ''}>
          {t('permissions.list_add')}
        </Button>
      </div>
    </div>
  );
}
