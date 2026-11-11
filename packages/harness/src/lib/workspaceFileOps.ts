import { ROOT_DIR } from '../pages/chat/lib/workspaceTree';
import { cwdRawFetch } from './projectRuntime';
import { parentDir } from './workspaceEvents';

export type FileOpResult = { ok: true } | { ok: false; status: number; message: string };

async function call(
  root: string,
  method: string,
  endpoint: string,
  query: Record<string, string>,
  body?: unknown,
): Promise<FileOpResult> {
  const params = new URLSearchParams({ ...query, root });
  let response: Response;
  try {
    response = await cwdRawFetch(root, `${endpoint}?${params.toString()}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? err.message : String(err) };
  }
  if (response.ok) return { ok: true };
  let message = `${method} failed (${response.status})`;
  try {
    const parsed = (await response.json()) as { error?: { message?: unknown } };
    if (typeof parsed.error?.message === 'string') message = parsed.error.message;
  } catch {
    message = `${method} failed (${response.status})`;
  }
  return { ok: false, status: response.status, message };
}

export function joinPath(dir: string, name: string): string {
  const clean = name.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  return dir ? `${dir}/${clean}` : clean;
}

export function validName(name: string): boolean {
  const clean = name.trim().replace(/\\/g, '/');
  if (clean === '' || clean.startsWith('/')) return false;
  return clean.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

export const createFile = (root: string, path: string) =>
  call(root, 'POST', '/api/files', {}, { path, content: '' });

export const createFolder = (root: string, path: string) =>
  call(root, 'POST', '/api/folders', {}, { path });

export const movePath = (root: string, path: string, newPath: string) =>
  call(root, 'PUT', '/api/files/move', {}, { path, newPath });

export const deletePath = (root: string, path: string, isDirectory: boolean) =>
  call(root, 'DELETE', isDirectory ? '/api/folders' : '/api/files', { path });

export function foldersDownTo(dir: string, target: string): string[] {
  const out: string[] = [];
  for (let current = parentDir(target); current !== ROOT_DIR; current = parentDir(current)) {
    out.unshift(current);
    if (current === dir) break;
  }
  return out;
}
