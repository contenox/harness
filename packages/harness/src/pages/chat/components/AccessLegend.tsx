import { cn, Span } from '@contenox/ui';
import { Eye, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function LegendItem({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <Span className="inline-flex items-center gap-1">
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', dotClass)} />
      {label}
    </Span>
  );
}

export interface AccessLegendProps {
  error: boolean;
  evaluating: boolean;
}

/** Legend for the agent-view access markers on the file tree. */
export function AccessLegend({ error, evaluating }: AccessLegendProps) {
  const { t } = useTranslation();
  return (
    <div className="border-line text-text-muted flex shrink-0 flex-col gap-1 border-b px-3 py-1.5 text-[11px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Span className="inline-flex items-center gap-1">
          <Eye className="size-3 shrink-0" aria-hidden />
          {t('workspace.access_read')}
        </Span>
        <Span className="inline-flex items-center gap-1">
          <Pencil className="size-3 shrink-0" aria-hidden />
          {t('workspace.access_write')}
        </Span>
        {error ? (
          <Span className="text-text-error">{t('workspace.access_error')}</Span>
        ) : evaluating ? (
          <Span>{t('workspace.access_evaluating')}</Span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <LegendItem dotClass="ring-success/60 ring-1 ring-inset" label={t('workspace.legend_allowed')} />
        <LegendItem dotClass="bg-warning" label={t('workspace.legend_approval')} />
        <LegendItem dotClass="bg-error" label={t('workspace.legend_blocked')} />
        <LegendItem dotClass="bg-text-subtle opacity-50" label={t('workspace.legend_unreachable')} />
      </div>
    </div>
  );
}
