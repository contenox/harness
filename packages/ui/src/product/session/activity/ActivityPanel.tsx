import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AcpSessionState } from '../state/acpSessionState';
import { DiffView, diffLinesFromTexts } from '../../../components/DiffView';
import {
  activityTools,
  changedFiles,
  redact,
  type FileAction,
  type ActivityTool,
} from './activity';



const STATUS_DOT: Record<ActivityTool['status'], string> = {
  pending: 'bg-surface-400 dark:bg-dark-surface-500',
  running: 'bg-primary-500 animate-pulse',
  success: 'bg-success-500',
  error: 'bg-error-500',
};

const STATUS_WORD: Record<ActivityTool['status'], string> = {
  pending: 'Waiting',
  running: 'Running',
  success: 'Done',
  error: 'Failed',
};

const ACTION_TONE: Record<FileAction, string> = {
  created: 'text-success-700 dark:text-dark-success-700',
  modified: 'text-primary-700 dark:text-dark-primary-500',
  deleted: 'text-error-700 dark:text-dark-error-700',
  moved: 'text-text-muted dark:text-dark-text-muted',
};

export function ActivityPanel({ session }: { session: AcpSessionState }) {
  const tools = useMemo(() => activityTools(session), [session]);
  const files = useMemo(() => changedFiles(session), [session]);
  const [open, setOpen] = useState<string | null>(null);
  const pending = session.pendingPermission !== null;

  const filesNewest = [...files].sort((a, b) => {
    const at = (id: string) => tools.findIndex(t => t.toolCallId === id);
    return at(b.tools[b.tools.length - 1].toolCallId) - at(a.tools[a.tools.length - 1].toolCallId);
  });

  if (tools.length === 0 && files.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6">
        <p className="text-text-muted dark:text-dark-text-muted max-w-64 text-center text-sm">
          Nothing to report yet. Every tool call the agent makes and every file it changes will
          appear here, as it happens.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 sm:p-4"
      aria-label="Agent activity">
      <p className="sr-only" role="status">
        {tools.length} tool {tools.length === 1 ? 'call' : 'calls'}, {files.length} changed{' '}
        {files.length === 1 ? 'file' : 'files'}
        {pending ? ', one approval waiting' : ''}
      </p>

      {filesNewest.length > 0 && (
        <section aria-label="Changed files" className="flex flex-col gap-1.5">
          <h2 className="text-text-muted dark:text-dark-text-muted text-xs font-medium tracking-wide uppercase">
            Changed files
          </h2>
          {filesNewest.map(file => {
            const key = `file:${file.path}`;
            const expanded = open === key;
            return (
              <div
                key={file.path}
                className="border-surface-200 dark:border-dark-surface-600 rounded-lg border">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : key)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left">
                  <ChevronDown
                    className={`text-text-muted dark:text-dark-text-muted h-4 w-4 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
                    aria-hidden
                  />
                  <span className={`w-14 shrink-0 text-xs font-medium ${ACTION_TONE[file.action]}`}>
                    {file.action === 'created'
                      ? 'Created'
                      : file.action === 'deleted'
                        ? 'Deleted'
                        : file.action === 'moved'
                          ? 'Moved'
                          : 'Modified'}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{file.path}</span>
                  <span className="text-text-muted dark:text-dark-text-muted shrink-0 text-xs">
                    {file.tools.length}×
                  </span>
                </button>
                {expanded && (
                  <div className="flex flex-col gap-3 border-t border-surface-200 p-3 dark:border-dark-surface-600">
                    {file.diffs.length === 0 ? (
                      <p className="text-text-muted dark:text-dark-text-muted text-xs">
                        Changed without a diff being reported.
                      </p>
                    ) : (
                      file.diffs.map((diff, index) => {
                        if (diff.oldText === undefined && diff.newText === undefined) return null;
                        return (
                          <DiffView
                            key={`${diff.toolCallId}-${index}`}
                            filePath={file.path}
                            lines={diffLinesFromTexts(diff.oldText ?? '', diff.newText ?? '')}
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section aria-label="Tool calls" className="flex flex-col gap-1.5">
        <h2 className="text-text-muted dark:text-dark-text-muted text-xs font-medium tracking-wide uppercase">
          Tool calls
        </h2>
        {pending && (
          <p className="bg-warning-50 dark:bg-dark-warning-50 text-warning-800 dark:text-dark-warning-800 rounded-lg border border-warning-300 px-3 py-2 text-sm dark:border-dark-warning-400">
            Waiting on you — an approval is open for the next call.
          </p>
        )}
        {[...tools].reverse().map(tool => {
          const key = `tool:${tool.toolCallId}`;
          const expanded = open === key;
          return (
            <div
              key={tool.toolCallId}
              className="border-surface-200 dark:border-dark-surface-600 rounded-lg border">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left">
                <ChevronDown
                  className={`text-text-muted dark:text-dark-text-muted h-4 w-4 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
                  aria-hidden
                />
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[tool.status]}`}
                  aria-label={STATUS_WORD[tool.status]}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{tool.title}</span>
                {tool.locations.length > 0 && (
                  <span className="text-text-muted dark:text-dark-text-muted hidden max-w-48 truncate font-mono text-xs sm:block">
                    {tool.locations[0].path}
                    {tool.locations.length > 1 ? ` +${tool.locations.length - 1}` : ''}
                  </span>
                )}
              </button>
              {expanded && toolDetails(tool)}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function toolDetails(tool: ActivityTool) {
  return (
    <div className="flex flex-col gap-3 border-t border-surface-200 p-3 dark:border-dark-surface-600">
      {tool.locations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tool.locations.map(location => (
            <span
              key={`${location.path}:${location.line ?? ''}`}
              className="text-text-muted dark:text-dark-text-muted bg-surface-100 dark:bg-dark-surface-300 rounded px-1.5 py-0.5 font-mono text-xs">
              {location.path}
              {location.line !== undefined ? `:${location.line}` : ''}
            </span>
          ))}
        </div>
      )}

      {tool.diffs.map((diff, index) => {
        if (diff.oldText === undefined && diff.newText === undefined) return null;
        return (
          <DiffView
            key={index}
            filePath={diff.path ?? tool.title}
            lines={diffLinesFromTexts(diff.oldText ?? '', diff.newText ?? '')}
          />
        );
      })}

      {tool.hasRaw && <RawBlock tool={tool} />}
    </div>
  );
}

function RawBlock({ tool }: { tool: ActivityTool }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setShow(value => !value)}
        aria-expanded={show}
        className="text-text-muted dark:text-dark-text-muted self-start text-xs underline-offset-2 hover:underline">
        {show ? 'Hide raw input/output' : 'Show raw input/output'}
      </button>
      {show && (
        <pre className="text-text-muted dark:text-dark-text-muted bg-surface-100 dark:bg-dark-surface-300 overflow-x-auto rounded-lg p-2 font-mono text-xs whitespace-pre-wrap">
          {tool.input !== undefined && <span>{renderRaw(tool.input)}</span>}
          {tool.output !== undefined && <span>{`\n→ ${renderRaw(tool.output)}`}</span>}
        </pre>
      )}
    </div>
  );
}


const RAW_MAX_CHARS = 8000;

function renderRaw(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(redact(value), null, 2);
  if (text.length <= RAW_MAX_CHARS) return text;
  return `${text.slice(0, RAW_MAX_CHARS)}\n… truncated (${text.length} characters)`;
}
