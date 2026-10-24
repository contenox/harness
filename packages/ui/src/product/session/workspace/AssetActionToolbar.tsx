import { useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import { copyTextToClipboard } from '../../../components/chat/clipboard';
import type { AssetAction, AssetActionResult } from '@contenox/acp-client';
import type { PreviewKind } from '../../../components/editors/previewKind';

export interface AssetActionToolbarProps {
  kind: PreviewKind;
  path: string;
  listActions?: () => Promise<AssetAction[]>;
  runAction?: (action: string, path: string) => Promise<AssetActionResult>;
  onArtifact?: (path: string) => void;
}

export function AssetActionToolbar({
  kind,
  path,
  listActions,
  runAction,
  onArtifact,
}: AssetActionToolbarProps) {
  const [actions, setActions] = useState<AssetAction[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setActions([]);
    if (!listActions) return;
    void listActions().then(all => {
      if (!alive) return;
      setActions(all.filter(action => action.kinds.includes(kind)));
    });
    return () => {
      alive = false;
    };
  }, [listActions, kind]);

  const copyPath = () => {



    void copyTextToClipboard(path).then(ok =>
      setNotice(ok ? 'Path copied.' : 'Could not copy the path.'),
    );
  };

  const run = (action: AssetAction) => {
    if (!runAction) return;
    setBusyId(action.id);
    setNotice(null);
    void runAction(action.id, path)
      .then(result => {
        setNotice(result.notice);
        if (result.artifact && onArtifact) onArtifact(result.artifact.path);
      })
      .catch((err: unknown) => setNotice(err instanceof Error ? err.message : 'The action failed.'))
      .finally(() => setBusyId(null));
  };

  const machineActions = actions;

  return (
    <div
      className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-1.5"
      aria-label={`Actions for ${path}`}>
      <Button variant="outline" size="sm" onClick={copyPath}>
        Copy path
      </Button>
      {machineActions.map(action => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => run(action)}
          disabled={busyId !== null}
          isLoading={busyId === action.id}>
          {action.label}
        </Button>
      ))}
      {notice && (
        <span className="text-text-muted dark:text-dark-text-muted ml-auto text-xs" role="status">
          {notice}
        </span>
      )}
    </div>
  );
}
