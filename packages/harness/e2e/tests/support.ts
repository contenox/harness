import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pidOnPort, stopPort } from '../proc.mjs';

export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: run the suite through e2e/run.sh`);
  return value;
}

export const runtimeUrl = () => env('HARNESS_RUNTIME_URL');
export const runtimePort = () => Number(env('HARNESS_RUNTIME_PORT'));
export const workDir = () => env('HARNESS_WORK');
export const mockPort = () => Number(process.env.HARNESS_MOCK_PORT ?? runtimePort() + 100);
export const mockUrl = () => `http://127.0.0.1:${mockPort()}/v1`;
export const MOCK_BACKEND = 'mockvllm';
export const SCRIPTED_MODEL = 'scripted-ui';

let dialogStamp = Date.now();

export function setDialog(turns: unknown[]): void {
  const file = env('HARNESS_DIALOG');
  fs.writeFileSync(file, JSON.stringify({ model: SCRIPTED_MODEL, turns }, null, 2));
  dialogStamp += 5_000;
  const when = new Date(dialogStamp);
  fs.utimesSync(file, when, when);
}

export const answer = (text: string, thinking?: string) => [
  { text: 'general' },
  thinking === undefined ? { text } : { text, thinking },
];

export const writeFileDialog = (file: string, content: string) => [
  { text: 'general' },
  {
    text: 'Writing the file.',
    tool_calls: [{ name: 'local_fs.write_file', arguments: { path: file, content } }],
  },
  { text: 'The file was written.' },
];

export const shellDialog = (command: string, args: string[]) => [
  { text: 'general' },
  {
    text: 'Running the command.',
    tool_calls: [{ name: 'local_shell.local_shell', arguments: { command, args } }],
  },
  { text: 'The command finished.' },
];

export function seen(page: Page, text: string | RegExp): Locator {
  return page.getByText(text).locator('visible=true').first();
}

export function composer(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Message the agent…' });
}

export async function newChat(page: Page): Promise<void> {
  await page.goto('/#/chat', { waitUntil: 'networkidle' });
  await composer(page).waitFor({ state: 'visible', timeout: 15_000 });
}

export async function send(page: Page, text: string): Promise<void> {
  await composer(page).fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
}

export async function startLiveChat(page: Page, prompt = 'hello'): Promise<string> {
  setDialog(answer('Hello from the scripted backend.'));
  await newChat(page);
  await send(page, prompt);
  await expect(seen(page, 'Hello from the scripted backend.')).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/#\/chat\/acp-/);
  return page.url();
}

export async function expectPermissionCard(page: Page, detail: string): Promise<void> {
  await expect(seen(page, 'Permission required')).toBeVisible({ timeout: 30_000 });
  await expect(seen(page, detail)).toBeVisible();
}

export async function pickPolicy(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: /^HITL Policy/ }).click();
  await page.getByRole('option', { name, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `HITL Policy: ${name}`, exact: true }),
  ).toBeVisible();
}

export async function waitForFile(file: string): Promise<string> {
  await expect.poll(() => fs.existsSync(file), { timeout: 30_000 }).toBe(true);
  return fs.readFileSync(file, 'utf8');
}

type Json = ReturnType<typeof JSON.parse>;

export async function api(request: APIRequestContext, method: string, url: string, data?: unknown) {
  const response = await request.fetch(`${runtimeUrl()}${url}`, {
    method,
    data,
    headers: data === undefined ? undefined : { 'content-type': 'application/json' },
  });
  const text = await response.text();
  let body: Json = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return { status: response.status(), body };
}

export async function restoreDefaults(request: APIRequestContext): Promise<void> {
  await api(request, 'PUT', '/api/cli-config', {
    'default-model': SCRIPTED_MODEL,
    'default-provider': 'scripted-test',
    'default-think': '',
    locale: '',
  });
}

export async function connection(request: APIRequestContext, name: string) {
  const { body } = await api(request, 'GET', '/api/providers/connections');
  return (
    body as Array<{
      id: string;
      name: string;
      health?: string;
      modelCount?: number;
      providerType?: string;
      [key: string]: unknown;
    }>
  ).find(item => item.name === name);
}

export async function ensureMockBackend(request: APIRequestContext): Promise<void> {
  let current = await connection(request, MOCK_BACKEND);
  if (!current) {
    const created = await api(request, 'POST', '/api/backends', {
      name: MOCK_BACKEND,
      baseUrl: mockUrl(),
      type: 'vllm',
    });
    expect(created.status).toBe(201);
  }
  await expect
    .poll(
      async () => {
        current = await connection(request, MOCK_BACKEND);
        if (current && current.health !== 'available') {
          await api(request, 'POST', `/api/providers/connections/${current.id}/check`);
          current = await connection(request, MOCK_BACKEND);
        }
        return `${current?.health}:${current?.modelCount ?? 0}`;
      },
      { timeout: 90_000, intervals: [500, 1000, 2000] },
    )
    .toMatch(/^available:[1-9]/);
}

export async function removeBackend(request: APIRequestContext, name: string): Promise<void> {
  const { body } = await api(request, 'GET', '/api/backends');
  for (const backend of body as Array<{ id: string; name: string }>) {
    if (backend.name === name) await api(request, 'DELETE', `/api/backends/${backend.id}`);
  }
}

export async function listConnectors(request: APIRequestContext) {
  const { body } = await api(request, 'GET', '/api/connectors');
  return body as Array<{
    id: string;
    name: string;
    tools?: Array<{ name: string }>;
    [key: string]: unknown;
  }>;
}

export async function removeConnector(request: APIRequestContext, name: string): Promise<void> {
  const found = (await listConnectors(request)).find(item => item.name === name);
  if (!found) return;
  if (found.kind === 'mcp') await api(request, 'DELETE', `/api/mcp-servers/${found.id}`);
  else if (found.kind === 'openapi') await api(request, 'DELETE', `/api/tools/remote/${found.id}`);
}

export const echoServer = () => env('HARNESS_ECHO_SERVER');
export const pythonCommand = () => process.env.HARNESS_PYTHON ?? 'python';

export async function addEchoConnector(
  request: APIRequestContext,
  name: string,
  tool: string,
): Promise<void> {
  const created = await api(request, 'POST', '/api/mcp-servers', {
    name,
    transport: 'stdio',
    command: pythonCommand(),
    args: [echoServer()],
    env: { ECHO_TOOL_NAME: tool },
    connectTimeoutSeconds: 30,
  });
  expect(created.status).toBe(201);
  await expect
    .poll(
      async () => {
        const checked = await api(request, 'POST', `/api/connectors/${name}/check`);
        return checked.body?.status;
      },
      { timeout: 60_000, intervals: [1000] },
    )
    .toBe('ready');
}

export async function waitForHealth(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`${url} did not become healthy`);
}

export interface RuntimeProcess {
  home: string;
  work: string;
  logFile: string;
  child: ChildProcess;
}

export function startRuntime(opts: {
  home: string;
  work: string;
  port: number;
  logFile: string;
}): RuntimeProcess {
  fs.mkdirSync(opts.work, { recursive: true });
  fs.mkdirSync(path.join(opts.home, 'appdata'), { recursive: true });
  fs.mkdirSync(path.join(opts.home, 'localappdata'), { recursive: true });
  const out = fs.openSync(opts.logFile, 'a');
  const child = spawn(env('HARNESS_RUNTIME_BIN'), ['serve'], {
    cwd: opts.work,
    env: {
      ...process.env,
      HOME: opts.home,
      USERPROFILE: opts.home,
      APPDATA: path.join(opts.home, 'appdata'),
      LOCALAPPDATA: path.join(opts.home, 'localappdata'),
      PORT: String(opts.port),
    },
    stdio: ['ignore', out, out],
    windowsHide: true,
    detached: true,
  });
  child.unref();
  return { home: opts.home, work: opts.work, logFile: opts.logFile, child };
}

export function startUiServer(port: number, runtime: string): ChildProcess {
  const child = spawn(
    process.execPath,
    [env('HARNESS_UI_SERVER'), env('HARNESS_UI_DIR'), runtime, String(port)],
    { stdio: 'ignore', windowsHide: true, detached: true },
  );
  child.unref();
  return child;
}

export async function stopRuntimePort(port: number): Promise<void> {
  stopPort(port);
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline && pidOnPort(port) !== null) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

export function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
