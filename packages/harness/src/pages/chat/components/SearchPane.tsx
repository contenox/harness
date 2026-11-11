import {
  Button,
  Checkbox,
  DiffView,
  IconButton,
  InlineNotice,
  Input,
  PaneFrame,
  Span,
} from '@contenox/ui';
import { CaseSensitive, Regex, WholeWord } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import { isDirty } from '../../../lib/editorBuffers';
import {
  applyReplace,
  hunkLines,
  previewReplace,
  retryPreview,
  splitGlobs,
  type ReplaceApplied,
  type ReplacePreview,
} from '../../../lib/workspaceReplace';
import { PaneNotice } from './PaneNotice';

export interface SearchPaneProps {
  root: string | null;
  files: UseWorkspaceFilesResult;
  onOpenFile: (path: string) => void;
  onClose: () => void;
  paneTabs?: ReactNode;
}

export function SearchPane({ root, files, onOpenFile, onClose, paneTabs }: SearchPaneProps) {
  const { t } = useTranslation();
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [include, setInclude] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReplacePreview | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ReplaceApplied | null>(null);

  const dirtyPaths = new Set(
    Object.values(files.editor.buffers)
      .filter(isDirty)
      .map(b => b.path),
  );

  const runPreview = async () => {
    if (!root || pattern === '' || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const response = await previewReplace(root, {
      pattern,
      replacement,
      regex,
      caseSensitive,
      wholeWord,
      include: splitGlobs(include),
    });
    setBusy(false);
    if (!response.ok) {
      setPreview(null);
      setError(response.message);
      return;
    }
    setPreview(response.value);
    setChosen(new Set(response.value.files.map(f => f.path).filter(p => !dirtyPaths.has(p))));
  };

  const runApply = async () => {
    if (!root || !preview || chosen.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    const response = await applyReplace(root, preview.id, [...chosen]);
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setResult(response.value);
    const remaining = retryPreview(preview, response.value);
    setPreview(remaining);
    if (remaining) setChosen(new Set(remaining.files.map(f => f.path)));
  };

  const toggle = (path: string) =>
    setChosen(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const chosenMatches = preview
    ? preview.files.filter(f => chosen.has(f.path)).reduce((n, f) => n + f.matches, 0)
    : 0;

  return (
    <PaneFrame
      flush
      title={paneTabs ? undefined : t('panes.search')}
      tabs={paneTabs}
      onClose={onClose}
      closeLabel={t('panes.close')}
      bodyClassName="flex flex-col overflow-hidden">
      {!root ? (
        <PaneNotice>{t('panes.no_project')}</PaneNotice>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <form
            className="border-line flex shrink-0 flex-col gap-2 border-b p-3"
            onSubmit={e => {
              e.preventDefault();
              void runPreview();
            }}>
            <div className="flex items-center gap-1">
              <Input
                aria-label={t('replace.find')}
                placeholder={t('replace.find')}
                value={pattern}
                onChange={e => {
                  setPattern(e.target.value);
                  setPreview(null);
                }}
                className="font-mono text-xs"
              />
              <IconButton
                size="sm"
                label={t('replace.case_sensitive')}
                active={caseSensitive}
                onClick={() => {
                  setCaseSensitive(v => !v);
                  setPreview(null);
                }}>
                <CaseSensitive className="size-4" />
              </IconButton>
              <IconButton
                size="sm"
                label={t('replace.whole_word')}
                active={wholeWord}
                onClick={() => {
                  setWholeWord(v => !v);
                  setPreview(null);
                }}>
                <WholeWord className="size-4" />
              </IconButton>
              <IconButton
                size="sm"
                label={t('replace.regex')}
                active={regex}
                onClick={() => {
                  setRegex(v => !v);
                  setPreview(null);
                }}>
                <Regex className="size-4" />
              </IconButton>
            </div>
            <Input
              aria-label={t('replace.replace_with')}
              placeholder={t('replace.replace_with')}
              value={replacement}
              onChange={e => {
                setReplacement(e.target.value);
                setPreview(null);
              }}
              className="font-mono text-xs"
            />
            <Input
              aria-label={t('replace.include')}
              placeholder={t('replace.include')}
              value={include}
              onChange={e => {
                setInclude(e.target.value);
                setPreview(null);
              }}
              className="font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={pattern === ''}
                isLoading={busy && !preview}>
                {t('replace.preview')}
              </Button>
              {preview && (
                <Button
                  type="button"
                  size="sm"
                  disabled={chosen.size === 0}
                  isLoading={busy}
                  onClick={() => void runApply()}>
                  {t('replace.apply', { count: chosenMatches })}
                </Button>
              )}
            </div>
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {error && <InlineNotice variant="error">{error}</InlineNotice>}
            {result && (
              <InlineNotice
                variant={
                  result.failed.length > 0
                    ? 'error'
                    : result.conflicts.length > 0
                      ? 'warning'
                      : 'success'
                }
                title={t('replace.applied', { count: result.applied.length })}>
                {result.conflicts.length > 0 && (
                  <span className="block">
                    {t('replace.conflicts', {
                      files: result.conflicts.map(c => c.path).join(', '),
                    })}
                  </span>
                )}
                {result.failed.map(f => (
                  <span key={f.path} className="block">
                    {t('replace.failed', { path: f.path, message: f.message })}
                  </span>
                ))}
                {result.retry && <span className="block">{t('replace.retry_hint')}</span>}
              </InlineNotice>
            )}
            {preview && (
              <div className="flex flex-col gap-3">
                <Span variant="muted" className="text-xs">
                  {preview.files.length === 0
                    ? t('replace.no_matches')
                    : t('replace.summary', {
                        matches: preview.totalMatches,
                        files: preview.files.length,
                      })}
                  {preview.truncated ? ` ${t('replace.truncated')}` : ''}
                </Span>
                {preview.files.map(file => (
                  <div key={file.path} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        aria-label={t('replace.include_file', { path: file.path })}
                        checked={chosen.has(file.path)}
                        onChange={() => toggle(file.path)}
                      />
                      <button
                        type="button"
                        className="text-text min-w-0 flex-1 truncate text-left font-mono text-xs hover:underline"
                        onClick={() => onOpenFile(file.path)}>
                        {file.path}
                      </button>
                      <Span variant="muted" className="shrink-0 text-[11px]">
                        {t('replace.matches', { count: file.matches })}
                      </Span>
                    </div>
                    {dirtyPaths.has(file.path) && (
                      <InlineNotice variant="warning">{t('replace.unsaved_file')}</InlineNotice>
                    )}
                    <DiffView filePath={file.path} lines={hunkLines(file)} />
                    {file.hunksTruncated && (
                      <Span variant="muted" className="text-[11px]">
                        {t('replace.more_hunks')}
                      </Span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PaneFrame>
  );
}
