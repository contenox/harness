import { Button, InlineNotice } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { WorkspaceRoot } from '../../lib/types';
import {
  extractRefusedRoot,
  isWorkspaceRootRefusal,
  shortenRootPath,
} from '../../lib/workspaceRoots';

export interface WorkspaceBoundaryNoticeProps {
  message: string;
  roots: readonly WorkspaceRoot[];
  onRetry: () => void;
}

export function WorkspaceBoundaryNotice({ message, roots, onRetry }: WorkspaceBoundaryNoticeProps) {
  const { t } = useTranslation();
  const refused = isWorkspaceRootRefusal(message);

  if (!refused) {
    return (
      <InlineNotice variant="error" className="mb-2">
        <div className="flex flex-col gap-2">
          <p
            className="max-h-40 overflow-y-auto text-xs break-words [overflow-wrap:anywhere]"
            title={message}>
            {message}
          </p>
          <div>
            <Button type="button" variant="outline" size="xs" onClick={onRetry}>
              {t('workspace.refresh')}
            </Button>
          </div>
        </div>
      </InlineNotice>
    );
  }

  const offending = extractRefusedRoot(message);

  return (
    <InlineNotice variant="error" className="mb-2">
      <div className="flex flex-col gap-2">
        <div>
          <p className="font-medium">{t('roots.out_of_bounds_title')}</p>
          <p className="text-xs">
            {offending
              ? t('roots.out_of_bounds_body_path', { path: offending })
              : t('roots.out_of_bounds_body')}
          </p>
        </div>
        {roots.length > 0 && (
          <div>
            <p className="text-xs font-medium">{t('roots.out_of_bounds_allowed_label')}</p>
            <ul className="mt-1 space-y-0.5">
              {roots.map(r => (
                <li key={r.path} className="font-mono text-xs break-all" title={r.path}>
                  {shortenRootPath(r.path, 5)}
                  {r.default ? ` · ${t('roots.default_marker')}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <Button type="button" variant="outline" size="xs" onClick={onRetry}>
            {t('workspace.refresh')}
          </Button>
        </div>
      </div>
    </InlineNotice>
  );
}
