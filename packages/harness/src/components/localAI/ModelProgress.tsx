import { useTranslation } from 'react-i18next';
import { modelSize, type ModelOperation } from '../../lib/localAI';

export function ModelProgress({ operation, label }: { operation?: ModelOperation; label: string }) {
  const { i18n } = useTranslation();
  const measured = operation?.phase === 'download' && operation.total > 0;
  return (
    <>
      <progress
        aria-label={label}
        className="block h-1.5 w-full accent-current"
        max={measured ? operation.total : 1}
        value={measured ? operation.current : undefined}
      />
      {measured && (
        <p className="text-text-muted text-xs tabular-nums">
          {modelSize(operation.current, i18n.language)} /{' '}
          {modelSize(operation.total, i18n.language)}
        </p>
      )}
    </>
  );
}
