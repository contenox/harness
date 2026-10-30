import { useEffect, useState } from 'react';
import { api } from './api';
import { apiFetch, ApiError, type ApiFetchOptions } from './fetch';
import type { WorkspaceRoot } from './types';
import { projectForCwd } from './workspaceRoots';

/**
 * Per-project runtime routing. In the desktop app every project folder has its own runtime
 * reachable under `/rt/<key>/(api|acp|ui)`; the default runtime serves global traffic on
 * unprefixed paths. Without the Electron bridge (web build, dev mode) every prefix is '' so
 * everything keeps hitting the one same-origin runtime.
 */

type Bridge = NonNullable<Window['contenoxDesktop']>;

function bridge(): Bridge | null {
  if (typeof window === 'undefined') return null;
  const b = window.contenoxDesktop;
  return b && typeof b.ensureProjectRuntime === 'function' ? b : null;
}

export function hasProjectBridge(): boolean {
  return bridge() !== null;
}

export function normalizeProjectPath(path: string): string {
  const trimmed = path.trim();
  const stripped = trimmed.replace(/[\\/]+$/, '');
  return stripped === '' ? trimmed : stripped;
}

function normalizePrefix(prefix: string): string {
  const p = prefix.trim().replace(/\/+$/, '');
  if (p === '') return '';
  return p.startsWith('/') ? p : `/${p}`;
}

const prefixCache = new Map<string, Promise<string>>();

/**
 * Starts (or reuses) the runtime of a project folder and returns its URL prefix. Returns ''
 * (same origin) when there is no bridge, or when the runtime cannot be ensured (dev mode).
 * Failures are not cached, so the next call tries again.
 */
export function ensureProjectPrefix(path: string, opts?: { force?: boolean }): Promise<string> {
  const b = bridge();
  const key = normalizeProjectPath(path);
  if (!b || key === '') return Promise.resolve('');
  if (opts?.force) prefixCache.delete(key);
  const cached = prefixCache.get(key);
  if (cached) return cached;
  const pending = b
    .ensureProjectRuntime(key)
    .then(res => {
      if (res.ok) return normalizePrefix(res.prefix);
      prefixCache.delete(key);
      return '';
    })
    .catch(() => {
      prefixCache.delete(key);
      return '';
    });
  prefixCache.set(key, pending);
  return pending;
}

export function invalidateProjectPrefix(path: string): void {
  prefixCache.delete(normalizeProjectPath(path));
}

/** Test hook. */
export function resetProjectRuntimeCaches(): void {
  prefixCache.clear();
  rootsCache = null;
}

export function withPrefix(prefix: string, url: string): string {
  return prefix === '' ? url : `${prefix}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function acpWsUrl(prefix: string, loc?: { protocol: string; host: string }): string {
  const l = loc ?? window.location;
  const protocol = l.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${l.host}${prefix}/acp`;
}

/** True for the supervisor's "this project's runtime was idle-stopped" response. */
export function isRuntimeNotRunning(status: number, body: unknown): boolean {
  if (status !== 503) return false;
  if (typeof body === 'string') return body.includes('runtime_not_running');
  if (typeof body === 'object' && body !== null) {
    return (body as { error?: unknown }).error === 'runtime_not_running';
  }
  return false;
}

function apiErrorIsNotRunning(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 503) return false;
  const raw = (err.details as { raw?: unknown } | undefined)?.raw;
  return isRuntimeNotRunning(503, raw ?? err.message);
}

const ROOTS_TTL_MS = 10_000;
let rootsCache: { at: number; roots: WorkspaceRoot[] } | null = null;

export function invalidateKnownRoots(): void {
  rootsCache = null;
}

async function loadRoots(): Promise<WorkspaceRoot[]> {
  if (rootsCache && Date.now() - rootsCache.at < ROOTS_TTL_MS) return rootsCache.roots;
  try {
    const resp = await api.getWorkspaceRoots();
    rootsCache = { at: Date.now(), roots: resp.roots ?? [] };
  } catch {
    rootsCache = { at: Date.now(), roots: rootsCache?.roots ?? [] };
  }
  return rootsCache.roots;
}

/**
 * The project (workspace root) path that owns `cwd`, or '' when there is no bridge, no project
 * contains it, or the owner is the default root (such traffic stays on the default runtime).
 */
export async function projectPathForCwd(cwd: string | null | undefined): Promise<string> {
  if (!cwd || !hasProjectBridge()) return '';
  const roots = await loadRoots();
  const project = projectForCwd(cwd, roots);
  // The default root is served by the default runtime (unprefixed); never start a second one for it.
  if (!project || project.default) return '';
  return project.path;
}

export async function prefixForCwd(
  cwd: string | null | undefined,
  opts?: { force?: boolean },
): Promise<string> {
  const project = await projectPathForCwd(cwd);
  return project === '' ? '' : ensureProjectPrefix(project, opts);
}

/** apiFetch routed to the runtime owning `cwd`; re-ensures the runtime once on 503 runtime_not_running. */
export async function cwdApiFetch<T>(
  cwd: string | null | undefined,
  url: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const prefix = await prefixForCwd(cwd);
  if (prefix === '') return apiFetch<T>(url, options);
  try {
    return await apiFetch<T>(withPrefix(prefix, url), options);
  } catch (err) {
    if (!apiErrorIsNotRunning(err)) throw err;
    const fresh = await prefixForCwd(cwd, { force: true });
    return apiFetch<T>(withPrefix(fresh, url), options);
  }
}

/** Raw fetch (for streaming endpoints) routed to the runtime owning `cwd`, with the same 503 retry. */
export async function cwdRawFetch(
  cwd: string | null | undefined,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const prefix = await prefixForCwd(cwd);
  if (prefix === '') return fetch(url, init);
  const res = await fetch(withPrefix(prefix, url), init);
  if (res.status !== 503) return res;
  let body: unknown = null;
  try {
    body = await res.clone().json();
  } catch {
    body = null;
  }
  if (!isRuntimeNotRunning(503, body)) return res;
  const fresh = await prefixForCwd(cwd, { force: true });
  return fetch(withPrefix(fresh, url), init);
}

/** URL prefix for the runtime owning `cwd`: '' while unresolved or on the default runtime, null while resolving. */
export function useCwdPrefix(cwd: string | null | undefined): string | null {
  const direct = !cwd || !hasProjectBridge();
  const [state, setState] = useState<{ cwd: string | null | undefined; prefix: string } | null>(
    null,
  );
  useEffect(() => {
    if (direct) return;
    let cancelled = false;
    void prefixForCwd(cwd).then(prefix => {
      if (!cancelled) setState({ cwd, prefix });
    });
    return () => {
      cancelled = true;
    };
  }, [cwd, direct]);
  if (direct) return '';
  return state && state.cwd === cwd ? state.prefix : null;
}
