import { apiFetch, ApiError } from './fetch';
import { cwdApiFetch } from './projectRuntime';

export type ConfigScope = { workspace?: string };

export type EnvelopeItem = {
  section: string;
  name: string;
  scope: 'home' | 'workspace';
  workspace?: string;
  inLayer: boolean;
  layer: unknown;
  effective: unknown;
  revision: string;
};

export type EnvelopeSection = {
  section: string;
  scope: 'home' | 'workspace';
  workspace?: string;
  inLayer: boolean;
  items?: EnvelopeItem[];
  revision: string;
};

export type ConfigDocument = {
  scope: 'home' | 'workspace';
  workspace?: string;
  path: string;
  exists: boolean;
  revision: string;
};

export type LocalToolset = {
  name: string;
  description: string;
  type: string;
  tools?: { type: string; function: { name: string; description?: string } }[];
  source?: string;
  unavailableReason?: string;
};

export function scopeKey(scope: ConfigScope): string {
  return scope.workspace?.trim() ?? '';
}

function configUrl(path: string, scope: ConfigScope): string {
  const params = new URLSearchParams();
  const workspace = scopeKey(scope);
  if (workspace) {
    params.set('scope', 'workspace');
    params.set('workspace', workspace);
  } else {
    params.set('scope', 'home');
  }
  return `/api/agents-config${path}?${params.toString()}`;
}

function call<T>(scope: ConfigScope, url: string, init?: RequestInit): Promise<T> {
  const workspace = scopeKey(scope);
  return workspace ? cwdApiFetch<T>(workspace, url, init) : apiFetch<T>(url, init);
}

function itemPath(name: string): string {
  return `/envelopes/${encodeURIComponent(name)}`;
}

export function getConfigDocument(scope: ConfigScope): Promise<ConfigDocument> {
  return call<ConfigDocument>(scope, configUrl('', scope));
}

export function getEnvelopes(scope: ConfigScope): Promise<EnvelopeSection> {
  return call<EnvelopeSection>(scope, configUrl('/envelopes', scope));
}

export function createEnvelope(
  scope: ConfigScope,
  name: string,
  value: Record<string, unknown>,
  revision: string,
): Promise<EnvelopeItem> {
  return call<EnvelopeItem>(scope, configUrl('/envelopes', scope), {
    method: 'POST',
    body: JSON.stringify({ name, value, revision }),
  });
}

export function patchEnvelope(
  scope: ConfigScope,
  name: string,
  patch: Record<string, unknown>,
  revision: string,
): Promise<EnvelopeItem> {
  return call<EnvelopeItem>(scope, configUrl(itemPath(name), scope), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json', 'If-Match': `"${revision}"` },
    body: JSON.stringify(patch),
  });
}

export function deleteEnvelope(scope: ConfigScope, name: string, revision: string): Promise<unknown> {
  return call<unknown>(scope, configUrl(itemPath(name), scope), {
    method: 'DELETE',
    headers: { 'If-Match': `"${revision}"` },
  });
}

export function listLocalToolsets(scope: ConfigScope): Promise<LocalToolset[]> {
  return call<LocalToolset[]>(scope, '/api/tools/local');
}

export function isConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export async function saveEnvelope(
  scope: ConfigScope,
  name: string,
  patch: Record<string, unknown>,
  known: { inLayer: boolean; revision: string },
): Promise<EnvelopeItem> {
  const attempt = (inLayer: boolean, revision: string) =>
    inLayer ? patchEnvelope(scope, name, patch, revision) : createEnvelope(scope, name, patch, revision);
  try {
    return await attempt(known.inLayer, known.revision);
  } catch (err) {
    if (!isConflict(err)) throw err;
    const fresh = await getEnvelopes(scope);
    const item = fresh.items?.find(i => i.name === name);
    return attempt(item?.inLayer ?? false, fresh.revision);
  }
}

export function isEmptyTable(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(isEmptyTable);
}

export async function saveWorkspaceAware(
  scope: ConfigScope,
  name: string,
  patch: Record<string, unknown>,
  known: { inLayer: boolean; revision: string },
): Promise<EnvelopeItem> {
  const saved = await saveEnvelope(scope, name, patch, known);
  if (scopeKey(scope) && saved.inLayer && isEmptyTable(saved.layer)) {
    await removeEnvelope(scope, name, saved.revision);
  }
  return saved;
}

export async function removeEnvelope(scope: ConfigScope, name: string, revision: string): Promise<void> {
  try {
    await deleteEnvelope(scope, name, revision);
  } catch (err) {
    if (!isConflict(err)) throw err;
    const fresh = await getEnvelopes(scope);
    await deleteEnvelope(scope, name, fresh.revision);
  }
}

export type ToolsPolicyItem = {
  name: string;
  inLayer: boolean;
  layer: Record<string, string> | null;
  effective: Record<string, string> | null;
  revision: string;
};

function policyPath(name: string): string {
  return `/tools_policies/${encodeURIComponent(name)}`;
}

export async function getToolsPolicy(scope: ConfigScope, name: string): Promise<ToolsPolicyItem> {
  try {
    return await call<ToolsPolicyItem>(scope, configUrl(policyPath(name), scope));
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) throw err;
    const doc = await getConfigDocument(scope);
    return { name, inLayer: false, layer: null, effective: null, revision: doc.revision };
  }
}

export async function saveToolsPolicy(
  scope: ConfigScope,
  name: string,
  value: Record<string, string>,
  known: { inLayer: boolean; revision: string },
): Promise<void> {
  const empty = Object.keys(value).length === 0;
  if (empty) {
    if (known.inLayer) {
      await call<unknown>(scope, configUrl(policyPath(name), scope), {
        method: 'DELETE',
        headers: { 'If-Match': `"${known.revision}"` },
      });
    }
    return;
  }
  if (known.inLayer) {
    await call<unknown>(scope, configUrl(policyPath(name), scope), {
      method: 'PUT',
      body: JSON.stringify({ value, revision: known.revision }),
    });
    return;
  }
  await call<unknown>(scope, configUrl('/tools_policies', scope), {
    method: 'POST',
    body: JSON.stringify({ name, value, revision: known.revision }),
  });
}
