import { Button, Collapsible, diffLinesFromTexts, DiffView, P, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { PermissionOption, RequestPermissionRequest } from '../../../lib/acp';
import { orderedPermissionOptions } from '../lib/permissionKeymap';

function optionVariant(kind: PermissionOption['kind']): 'primary' | 'danger' | 'outline' {
  if (kind === 'allow_once' || kind === 'allow_always') return 'primary';
  if (kind === 'reject_once' || kind === 'reject_always') return 'danger';
  return 'outline';
}

export interface PermissionCardProps {
  permission: RequestPermissionRequest;
  onRespond: (optionId: string) => void;
}

export function PermissionCard({ permission, onRespond }: PermissionCardProps) {
  const { t } = useTranslation();
  const { toolCall } = permission;
  const options = orderedPermissionOptions(permission.options);
  const diffs = (toolCall.content ?? []).filter(c => c.type === 'diff');

  return (
    <div
      role="group"
      aria-label={t('acp_chat.permission_card_title')}
      className="border-warning bg-warning/10 ring-warning/20 -mx-2 my-4 rounded-xl border-2 p-6 shadow-lg ring-2 sm:-mx-4">
      <Span variant="status" className="text-text-warning text-base font-semibold">
        {t('acp_chat.permission_card_title')}
      </Span>

      <div className="mt-2 min-w-0">
        <Span variant="status" className="text-text-muted">
          {toolCall.kind ?? t('acp_chat.permission_default_kind')}
        </Span>
        <P className="text-text mt-1 text-sm font-medium">{toolCall.title ?? toolCall.toolCallId}</P>
      </div>

      <div className="mt-3 space-y-3">
        {toolCall.locations && toolCall.locations.length > 0 && (
          <ul className="text-text-muted space-y-0.5 text-xs">
            {toolCall.locations.map((loc, i) => (
              <li key={i} className="break-all">
                {loc.path}
                {loc.line ? `:${loc.line}` : ''}
              </li>
            ))}
          </ul>
        )}

        {diffs.map((d, i) => (
          <DiffView
            key={i}
            filePath={d.path ?? ''}
            lines={diffLinesFromTexts(d.oldText ?? '', d.newText ?? '')}
          />
        ))}

        {toolCall.rawInput != null && (
          <Collapsible title={t('acp_chat.permission_raw_input_label')}>
            <pre className="bg-sidebar text-text mt-2 max-h-40 overflow-auto rounded p-2 text-xs whitespace-pre-wrap">
              {JSON.stringify(toolCall.rawInput, null, 2)}
            </pre>
          </Collapsible>
        )}
      </div>

      <div className="border-warning/30 mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
        {options.map(option => (
          <Button
            key={option.optionId}
            type="button"
            variant={optionVariant(option.kind)}
            size="lg"
            className="w-full font-semibold sm:w-auto sm:min-w-[120px]"
            onClick={() => onRespond(option.optionId)}>
            {option.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
