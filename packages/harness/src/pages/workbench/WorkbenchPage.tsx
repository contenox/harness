import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChatComposer } from '@contenox/ui/chat';
import { PermissionRequest, SessionConfigBar, Transcript } from '@contenox/ui/session-ui';
import {
  SessionWorkspaceLayout,
  useSessionWorkspace,
  type SessionWorkspaceSource,
} from '@contenox/ui/session-workspace';
import type { SessionConfigOptionValue } from '@contenox/acp-client';
import { useAcpWorkspace } from '../../hooks/useAcpWorkspace';
import { useWorkspaceFiles } from '../../hooks/useWorkspaceFiles';
import { apiFetch } from '../../lib/fetch';

interface FilesListEntry {
  path: string;
  name: string;
  isDirectory: boolean;
}

interface FileContentResponse {
  path: string;
  content?: string;
  contentBase64?: string;
  encoding: string;
}

function contentUrl(path: string, root: string): string {
  const params = new URLSearchParams({ path, root });
  return `/api/files/content?${params.toString()}`;
}

/**
 * The workbench: the library's session layout (file tree, open files, preview,
 * activity) around a live ACP conversation.
 *
 * The layout and its workspace hook come from `@contenox/ui/session-workspace`;
 * this page only supplies the workspace source (the harness serves files over
 * the HTTP `/files` API, not ACP's fs extension) and the chat column.
 */
export default function WorkbenchPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const {
    workspace,
    session,
    openSession,
    sendPrompt,
    respondPermission,
    setConfigOption,
  } = useAcpWorkspace();
  const [draft, setDraft] = useState('');

  // A deep link can arrive before the session is subscribed; open it once.
  useEffect(() => {
    if (!sessionId) return;
    if (sessionId === session?.sessionId) return;
    void openSession(sessionId);
  }, [openSession, session?.sessionId, sessionId]);

  const sessionInfo = sessionId
    ? workspace.sessions.find(info => info.sessionId === sessionId)
    : undefined;
  const root = sessionInfo?.cwd ?? null;
  const files = useWorkspaceFiles(root);

  const source: SessionWorkspaceSource = {
    files,
    listWorkspace: async dir => {
      const target = dir ?? '';
      if (!root) return { path: target, entries: [] };
      const params = new URLSearchParams({ path: target === '' ? '.' : target, root });
      const entries = await apiFetch<FilesListEntry[]>(`/api/files?${params.toString()}`);
      return {
        path: target,
        entries: entries.map(entry => ({
          path: entry.path,
          name: entry.name,
          isDir: entry.isDirectory,
        })),
      };
    },
    readFile: async path => {
      if (!root) return { content: '', isDir: false };
      const response = await apiFetch<FileContentResponse>(contentUrl(path, root));
      return {
        content:
          response.encoding === 'base64'
            ? (response.contentBase64 ?? '')
            : (response.content ?? ''),
        isDir: false,
      };
    },
    readFileRaw: async path => {
      if (!root) return { content: '', isDir: false };
      const response = await apiFetch<FileContentResponse>(contentUrl(path, root));
      if (response.encoding === 'base64') {
        return { content: response.contentBase64 ?? '', isDir: false };
      }
      // The content endpoint returns text as UTF-8; preview viewers (markdown,
      // images, PDF) decode base64, so a text file is encoded here.
      const bytes = new TextEncoder().encode(response.content ?? '');
      let binary = '';
      bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
      });
      return { content: btoa(binary), isDir: false };
    },
    writeFile: async (path, content) => {
      if (!root) return;
      await apiFetch<unknown>('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });
    },
  };

  const workspaceState = useSessionWorkspace(source, draft, setDraft);

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const mentions = workspaceState.mentionsIn(draft);
    sendPrompt(draft, mentions, []);
    setDraft('');
    workspaceState.afterSend();
    workspaceState.canvas.activate('');
  }, [draft, sendPrompt, workspaceState]);

  if (!sessionId) {
    return (
      <div className="text-text-muted dark:text-dark-text-muted m-auto max-w-md p-6 text-center text-sm">
        Open a session from <Link className="underline" to="/chat">Chat</Link> and its workbench
        shows the workspace beside it.
      </div>
    );
  }

  if (!session || session.sessionId !== sessionId) {
    return (
      <div className="text-text-muted dark:text-dark-text-muted m-auto p-6 text-sm">
        Opening the session…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <Link
          className="text-text-muted dark:text-dark-text-muted text-sm hover:underline"
          to={`/chat/${sessionId}`}
        >
          ← Chat
        </Link>
        <span className="text-text dark:text-dark-text truncate text-sm font-medium">
          {sessionInfo?.title ?? 'Session workbench'}
        </span>
      </header>
      <SessionWorkspaceLayout
        workspace={workspaceState}
        session={session}
        chat={
          <div className="flex min-h-0 flex-1 flex-col">
            <SessionConfigBar
              options={session.configOptions}
              onSet={(configId: string, value: SessionConfigOptionValue) =>
                setConfigOption(configId, value)
              }
              disabled={session.isPrompting}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <Transcript session={session} />
            </div>
            {session.pendingPermission && (
              <PermissionRequest
                request={session.pendingPermission}
                onRespond={respondPermission}
              />
            )}
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSubmit={event => {
                event.preventDefault();
                submit();
              }}
              placeholder="Message the agent…"
              isPending={session.isPrompting}
              variant="workbench"
            />
          </div>
        }
      />
    </div>
  );
}
