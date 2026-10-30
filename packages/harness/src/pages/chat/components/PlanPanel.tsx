import { Badge, Collapsible, Panel, Span } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanEntry, PlanEntryStatus } from '../../../lib/acp';

function statusVariant(status: PlanEntryStatus): 'success' | 'primary' | 'secondary' {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'primary';
  return 'secondary';
}

export function PlanPanel({ entries }: { entries: PlanEntry[] }) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const [open, setOpen] = useState(true);

  if (entries.length === 0) return null;

  const done = entries.filter(e => e.status === 'completed').length;

  return (
    <Panel variant="surface" className="mx-3 mt-3 sm:mx-4">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        title={
          <span className="flex items-center gap-2">
            <Span variant="status">{t('acp_chat.plan_title')}</Span>
            <Badge variant="secondary" size="sm">
              {done}/{entries.length}
            </Badge>
          </span>
        }
      >
        <ol className="mt-2 space-y-1.5 text-sm">
          {entries.map((entry, i) => (
            <li key={`${entry.content}-${i}`} className="flex items-start gap-2">
              <Badge size="sm" variant={statusVariant(entry.status)} className="mt-0.5 shrink-0">
                {tk(`acp_chat.plan_status_${entry.status}`)}
              </Badge>
              <span className="text-text">{entry.content}</span>
            </li>
          ))}
        </ol>
      </Collapsible>
    </Panel>
  );
}
