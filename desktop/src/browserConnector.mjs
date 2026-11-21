import { fileURLToPath } from 'node:url';
import path from 'node:path';

const helper = fileURLToPath(new URL('./browser-mcp.cjs', import.meta.url));
export const installationId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function browserConnector(id, endpointFile) {
  if (!installationId.test(id)) throw new Error('Invalid Browser installation.');
  return {
    name: 'browser', transport: 'stdio', command: process.execPath,
    args: [helper, endpointFile, id], env: { ELECTRON_RUN_AS_NODE: '1' },
    connectTimeoutSeconds: 30,
  };
}

export function matchesBrowser(server, expected) {
  return server.name === expected.name && server.transport === 'stdio' &&
    server.command === expected.command && server.env?.ELECTRON_RUN_AS_NODE === '1' &&
    JSON.stringify(server.args) === JSON.stringify(expected.args);
}

// Preserve the installation ID, workspace scope and Browser profile on app upgrades.
export async function refreshBrowserCommand(origin, endpointFile) {
  const response = await fetch(origin + '/api/mcp-servers/by-name/browser', { signal: AbortSignal.timeout(4000) });
  if (response.status === 404) return;
  if (!response.ok) throw new Error('Could not read the Browser registration: ' + response.status);
  const saved = await response.json();
  const args = saved.args;
  if (saved.name !== 'browser' || saved.transport !== 'stdio' || args?.length !== 3 ||
      !installationId.test(args[2])) return;
  const legacy = saved.command === 'contenox-runtime' && args[0] === 'mcp' && args[1] === 'browser';
  const previousApp = typeof args[0] === 'string' && path.basename(args[0]) === 'browser-mcp.cjs' &&
    args[1] === endpointFile && saved.env?.ELECTRON_RUN_AS_NODE === '1';
  if (!legacy && !previousApp) return;
  const next = browserConnector(args[2], endpointFile);
  if (matchesBrowser(saved, next)) return;
  const updated = await fetch(origin + '/api/mcp-servers/' + encodeURIComponent(saved.id), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...saved, ...next }), signal: AbortSignal.timeout(8000),
  });
  if (!updated.ok) throw new Error('Could not update the Browser registration: ' + updated.status);
}
