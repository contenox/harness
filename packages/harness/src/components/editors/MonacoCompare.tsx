import { languageForPath } from '../../lib/missionChanges';
import MonacoDiff from './MonacoDiff';

export interface MonacoCompareProps {
  path: string;
  original: string;
  modified: string;
}

export default function MonacoCompare({ path, original, modified }: MonacoCompareProps) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <MonacoDiff
        original={original}
        modified={modified}
        language={languageForPath(path)}
        options={{ renderSideBySide: true, originalEditable: false }}
      />
    </div>
  );
}
