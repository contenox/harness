import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { startMockOpenAI } from '../mock-openai.mjs';
import {
  MOCK_BACKEND,
  addEchoConnector,
  answer,
  api,
  composer,
  connection,
  echoServer,
  ensureMockBackend,
  expectPermissionCard,
  listConnectors,
  mockPort,
  mockUrl,
  newChat,
  pickPolicy,
  pythonCommand,
  removeBackend,
  removeConnector,
  restoreDefaults,
  seen,
  runtimePort,
  runtimeUrl,
  send,
  setDialog,
  shellDialog,
  startLiveChat,
  startRuntime,
  startUiServer,
  stopRuntimePort,
  tempDir,
  waitForFile,
  waitForHealth,
  workDir,
  writeFileDialog,
  env,
} from './support';

test.describe.configure({ timeout: 120_000 });

test.use({ locale: 'en-US', screenshot: 'only-on-failure' });

let mock: Awaited<ReturnType<typeof startMockOpenAI>>;

test.beforeAll(async () => {
  mock = await startMockOpenAI(mockPort());
});

test.afterAll(async () => {
  await new Promise<void>(resolve => mock.close(() => resolve()));
});

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('i18nextLng', 'en');
    } catch {}
  });
});

test.afterEach(async ({ request }) => {
  mock.setFailChat(false);
  await restoreDefaults(request);
});

async function openConnectorsPanel(page: Page) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Connectors' }).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByText('Connectors in this chat')).toBeVisible({ timeout: 15_000 });
  return panel;
}

async function closeConnectorsPanel(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

async function openAddConnector(page: Page) {
  await page.goto('/#/connectors', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Add connector/ }).click();
  await expect(page.getByRole('textbox', { name: 'Name *' })).toBeVisible();
}

test('R01 first start: an empty home shows the setup wizard and no runtime error', async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeP = runtimePort() + 10;
  const uiP = runtimePort() + 11;
  const home = tempDir('e2e-empty-');
  const logFile = path.join(home, 'serve.log');
  startRuntime({ home, work: path.join(home, 'work'), port: runtimeP, logFile });
  startUiServer(uiP, `http://127.0.0.1:${runtimeP}`);
  try {
    await waitForHealth(`http://127.0.0.1:${runtimeP}`);
    await waitForHealth(`http://127.0.0.1:${uiP}`);
    await page.goto(`http://127.0.0.1:${uiP}/`, { waitUntil: 'networkidle' });

    await expect(page.getByText('Sign in with ChatGPT')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Use another provider' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/runtime error|could not|failed|unavailable|not found/i);

    const backends = await api(page.request, 'GET', '/api/backends');
    expect(backends.status).toBe(200);
    const log = fs.readFileSync(logFile, 'utf8');
    expect(log).not.toMatch(/\b(ERROR|ERR|panic|fatal)\b/);
  } finally {
    await stopRuntimePort(uiP);
    await stopRuntimePort(runtimeP);
    fs.rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  }
});

test('R02 providers: an OpenAI-compatible backend connects and lists its models', async ({ page, request }) => {
  await removeBackend(request, 'vllm');
  try {
    await page.goto('/#/backends', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^vLLM/ }).click();
    await page.getByPlaceholder('http://localhost:8000/v1').fill(mockUrl());
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Available', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    await expect
      .poll(async () => {
        const item = await connection(request, 'vllm');
        return `${item?.providerType}:${item?.health}:${item?.modelCount}`;
      })
      .toBe('vllm:available:5');
    const state = await api(request, 'GET', '/api/state');
    const entry = (state.body as Array<{ name: string; [key: string]: unknown }>).find(item => item.name === 'vllm');
    expect(entry?.models).toContain('mock-model');

    await page.getByRole('tab', { name: 'Backends' }).click();
    await expect(page.getByText('Observed models (5)')).toBeVisible();
    await expect(page.getByText('mock-model', { exact: true })).toBeVisible();
  } finally {
    await removeBackend(request, 'vllm');
  }
});

test('R03 providers: empty base URL or unknown type is refused and nothing is saved', async ({ page, request }) => {
  const before = ((await api(request, 'GET', '/api/backends')).body as Array<{ name: string }>).map(item => item.name).sort();
  await page.goto('/#/backends?tab=backends', { waitUntil: 'networkidle' });
  const create = page.getByRole('button', { name: 'Create Backend' });
  await expect(create).toBeVisible();
  await expect(create).toBeDisabled();

  await page.getByPlaceholder('my-backend').fill('e2e-nourl');
  await expect(create).toBeDisabled();
  await expect
    .soft(page.getByText(/required|enter|must|invalid/i).first(), 'a message that says what is missing')
    .toBeVisible({ timeout: 2_000 });

  await page.getByPlaceholder('http://localhost:11434').fill('not a url');
  await expect.soft(create, 'a base URL that is not a URL').toBeDisabled();

  const unknown = await api(request, 'POST', '/api/backends', {
    name: 'e2e-unknown',
    baseUrl: 'http://127.0.0.1:1',
    type: 'nonsense',
  });
  expect(unknown.status).toBe(422);
  expect(JSON.stringify(unknown.body)).toMatch(/Type must be/);

  const after = ((await api(request, 'GET', '/api/backends')).body as Array<{ name: string }>).map(item => item.name).sort();
  expect(after).toEqual(before);
});

test('R06 chat: the answer renders and thinking stays collapsed, never as a raw tag', async ({ page }) => {
  setDialog(
    answer(
      '<thinking> I need to read the README.md file </thinking>\n\nThe project is a runtime for agents.',
      'Reasoning about the README before answering.',
    ),
  );
  await newChat(page);
  await send(page, 'What does this project do?');
  await expect(seen(page, 'The project is a runtime for agents.')).toBeVisible({ timeout: 30_000 });

  const body = page.locator('main');
  await expect(body).not.toContainText('<thinking>');
  await expect(body).not.toContainText('</thinking>');
  await expect(page.getByText('I need to read the README.md file')).toBeHidden();
  const thoughts = page.getByRole('button', { name: /^Thoughts/ });
  await expect(thoughts).toBeVisible();
  await expect(page.getByText('Reasoning about the README before answering.')).toBeHidden();
});

test('R08 chat: /think auto and /model are sent, confirmed in the transcript, and update the chips', async ({
  page,
  request,
}) => {
  await ensureMockBackend(request);
  await startLiveChat(page);

  await send(page, '/think auto');
  await expect(page.getByText('Think set to auto for this session.')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'More options' }).click();
  const think = page.locator('select').filter({ has: page.locator('option', { hasText: 'XHigh' }) });
  await expect(think).toHaveValue('auto');
  await page.keyboard.press('Escape');

  await send(page, '/model vllm/mock-alpha');
  await expect(page.getByText('Model set to mock-alpha (vllm).')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Model: mockvllm · mock-alpha' })).toBeVisible();
});

test('R09 chat: a failed request shows a dismissible error card and does not come back', async ({
  page,
  request,
}) => {
  await ensureMockBackend(request);
  await api(request, 'PUT', '/api/cli-config', { 'default-model': 'mock-alpha', 'default-provider': 'vllm' });
  await newChat(page);
  await expect(page.getByRole('button', { name: 'Model: mockvllm · mock-alpha' })).toBeVisible();

  mock.setFailChat(true);
  await send(page, 'please answer');
  const card = page.getByText('Execution failed');
  await expect(card.first()).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/#\/chat\/acp-/);
  const url = page.url();
  await expect(page.getByRole('button', { name: 'Technical details' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).first().click();
  await expect(card).toHaveCount(0);

  await page.goto('/#/permissions', { waitUntil: 'networkidle' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(composer(page)).toBeVisible();
  await page.waitForTimeout(4_000);
  const alertsInTranscript = page.locator('xpath=//*[contains(text(),"please answer")]/following::*[@role="alert"]');
  expect(await page.getByRole('alert').count(), 'every alert sits in the transcript after the message, none pinned above it').toBe(
    await alertsInTranscript.count(),
  );

  await page.reload({ waitUntil: 'networkidle' });
  await expect(composer(page)).toBeVisible();
  await page.waitForTimeout(1_500);
  expect.soft(await page.getByRole('alert').count(), 'after a reload too').toBe(await alertsInTranscript.count());
  await expect
    .soft(page.getByText('[step "').first(), 'raw step failure text stays behind Technical details')
    .not.toBeVisible();
});

test('R10 permissions: the Default set asks before a write; Allow writes, Deny leaves the tree untouched', async ({
  page,
}) => {
  const allowed = path.join(workDir(), 'e2e-allow.txt');
  const denied = path.join(workDir(), 'e2e-deny.txt');
  fs.rmSync(allowed, { force: true });
  fs.rmSync(denied, { force: true });

  setDialog(writeFileDialog('e2e-allow.txt', 'allowed content'));
  await newChat(page);
  await expect(page.getByRole('button', { name: 'HITL Policy: Default' })).toBeVisible();
  await send(page, 'write the allowed file');
  await expectPermissionCard(page, 'local_fs.write_file: e2e-allow.txt');
  expect(fs.existsSync(allowed)).toBe(false);
  await page.getByRole('button', { name: 'Allow', exact: true }).click();
  expect(await waitForFile(allowed)).toBe('allowed content');

  setDialog(writeFileDialog('e2e-deny.txt', 'denied content'));
  await newChat(page);
  await send(page, 'write the denied file');
  await expectPermissionCard(page, 'local_fs.write_file: e2e-deny.txt');
  await page.getByRole('button', { name: 'Deny', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Deny', exact: true })).toBeHidden();
  await expect(seen(page, 'The file was written.')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_000);
  expect(fs.existsSync(denied)).toBe(false);
});

test('R11 permissions: the set can be switched per chat and a denied command never runs', async ({ page }) => {
  const denied = path.join(workDir(), 'e2e-shell-denied.txt');
  const allowed = path.join(workDir(), 'e2e-shell-allowed.txt');
  fs.rmSync(denied, { force: true });
  fs.rmSync(allowed, { force: true });
  const touch = (file: string) =>
    shellDialog(process.execPath, ['-e', `require('fs').writeFileSync('${file}','ran')`]);

  await newChat(page);
  await pickPolicy(page, 'dev');
  await pickPolicy(page, 'ask_always');

  setDialog(touch('e2e-shell-denied.txt'));
  await send(page, 'run the denied command');
  await expectPermissionCard(page, 'local_shell.local_shell');
  await page.getByRole('button', { name: 'Deny', exact: true }).click();
  await expect(seen(page, 'The command finished.')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_500);
  expect(fs.existsSync(denied)).toBe(false);

  await newChat(page);
  await pickPolicy(page, 'ask_always');
  setDialog(touch('e2e-shell-allowed.txt'));
  await send(page, 'run the allowed command');
  await expectPermissionCard(page, 'local_shell.local_shell');
  await page.getByRole('button', { name: 'Allow', exact: true }).click();
  expect(await waitForFile(allowed)).toBe('ran');

  await newChat(page);
  await pickPolicy(page, 'Default');
});

test('R12 permissions: a rule edited on the Permissions page is saved and survives a reload', async ({
  page,
  request,
}) => {
  const rule = async () => {
    const res = await api(request, 'GET', '/api/agents-config/envelopes/dev?scope=home');
    return (res.body as { layer?: { tools?: Record<string, unknown> } } | undefined)?.layer?.tools?.echo;
  };
  const echoRow = () =>
    page
      .locator('div')
      .filter({ has: page.getByText('echo', { exact: true }) })
      .filter({ has: page.locator('select') })
      .last();
  try {
    await page.goto('/#/permissions/dev', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Dev' }).first()).toBeVisible();
    await echoRow().locator('select').selectOption({ label: 'Block' });
    await expect.poll(rule).toBe('deny');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(echoRow().locator('select')).toHaveValue('deny');
    expect(await rule()).toBe('deny');
  } finally {
    await page.goto('/#/permissions/dev', { waitUntil: 'networkidle' });
    await echoRow().locator('select').selectOption({ label: 'Follow the rules above' });
    await expect.poll(rule).toBeFalsy();
  }
});

test('R13 connectors: a stdio MCP server is added and checked, Ready with its tool', async ({ page, request }) => {
  const name = 'e2e-stdio';
  await removeConnector(request, name);
  try {
    await openAddConnector(page);
    await expect(page.getByText('Kind of connector')).toBeVisible();
    await page.getByRole('textbox', { name: 'Name *' }).fill(name);
    await page.getByRole('textbox', { name: 'Command *' }).fill(pythonCommand());
    await page.getByRole('textbox', { name: 'Arguments' }).first().fill(echoServer());
    await page.getByRole('textbox', { name: /Environment variables/ }).fill('ECHO_TOOL_NAME=e2e_shout');
    await page.getByRole('button', { name: 'Add and check' }).click();

    await expect(page.getByRole('button', { name: new RegExp(`^${name}.*Ready · 1 tool`, 's') })).toBeVisible({
      timeout: 60_000,
    });
    const found = (await listConnectors(request)).find(item => item.name === name);
    expect(found?.status).toBe('ready');
    expect(found?.transport).toBe('stdio');
    expect((found?.tools ?? []).map(tool => tool.name)).toEqual(['e2e_shout']);
  } finally {
    await removeConnector(request, name);
  }
});

test('R14 connectors: a remote MCP server with a wrong URL is Not available with its error', async ({
  page,
  request,
}) => {
  const name = 'e2e-remote';
  await removeConnector(request, name);
  try {
    await openAddConnector(page);
    await page.getByRole('radio', { name: /Remote MCP server/ }).click();
    await page.getByRole('textbox', { name: 'Name *' }).fill(name);
    await page.getByRole('textbox', { name: /Server URL/ }).fill('http://127.0.0.1:9/mcp');
    await page.getByRole('button', { name: 'Add and check' }).click();

    await expect(page.getByText('Not available', { exact: true })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Details' }).first().click();
    await expect(page.getByText(/initialize|dial tcp|connect failed|rejected by transport/i).first()).toBeVisible();

    const found = (await listConnectors(request)).find(item => item.name === name);
    expect(found?.status).toBe('unavailable');
    expect(found?.problem).toBeTruthy();
  } finally {
    await removeConnector(request, name);
  }
});

test('R15 connectors: an OpenAPI service is Ready and lists its operations', async ({ page, request }) => {
  const name = 'e2e-openapi';
  await removeConnector(request, name);
  try {
    await openAddConnector(page);
    await page.getByRole('radio', { name: /OpenAPI service/ }).click();
    await page.getByRole('textbox', { name: 'Name *' }).fill(name);
    await page.getByRole('textbox', { name: /Service URL/ }).fill(`http://127.0.0.1:${mockPort()}`);
    await page.getByRole('button', { name: 'Add and check' }).click();

    await expect(page.getByRole('button', { name: new RegExp(`^${name}.*Ready · 2 tools`, 's') })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('listItems', { exact: true })).toBeVisible();
    await expect(page.getByText('getItem', { exact: true })).toBeVisible();
    const found = (await listConnectors(request)).find(item => item.name === name);
    expect(found?.kind).toBe('openapi');
    expect((found?.tools ?? []).map(tool => tool.name).sort()).toEqual(['getItem', 'listItems']);
  } finally {
    await removeConnector(request, name);
  }
});

test('R16 connectors: a hidden tool is hidden in chat; the per-chat switch stays with that chat only', async ({
  page,
  request,
}) => {
  const name = 'e2e-hide';
  const tool = 'e2e_hide_tool';
  await removeConnector(request, name);
  await addEchoConnector(request, name, tool);
  try {
    await page.goto('/#/connectors', { waitUntil: 'networkidle' });
    const toolSwitch = page.getByRole('switch', { name: `Agents can use ${tool}` });
    if (!(await toolSwitch.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    }
    await expect(toolSwitch).toBeChecked();
    await toolSwitch.click({ force: true });
    await expect
      .poll(async () => ((await api(request, 'GET', '/api/connectors/hidden-tools')).body as { everywhere?: string[] }).everywhere)
      .toContain(`${name}.${tool}`);

    await startLiveChat(page);
    const panel = await openConnectorsPanel(page);
    const hiddenSwitch = panel.getByRole('switch', { name: `Agents can use ${tool}` });
    if (!(await hiddenSwitch.isVisible().catch(() => false))) {
      await panel.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    }
    await expect(hiddenSwitch).not.toBeChecked();
    const chatSwitch = () => page.getByRole('dialog').getByRole('switch', { name: `Use ${name} in this chat` });
    await expect(chatSwitch()).toBeChecked();
    await chatSwitch().click({ force: true });
    await expect(chatSwitch()).not.toBeChecked();
    await closeConnectorsPanel(page);

    await openConnectorsPanel(page);
    await expect(chatSwitch()).not.toBeChecked();
    await closeConnectorsPanel(page);

    await startLiveChat(page, 'another chat');
    await openConnectorsPanel(page);
    await expect(chatSwitch()).toBeChecked();
    await closeConnectorsPanel(page);
  } finally {
    await api(request, 'PUT', `/api/connectors/${name}/hidden-tools`, { tools: [] });
    await removeConnector(request, name);
  }
});

test('R17 connectors in this chat: the panel of a live session lists the connectors', async ({ page }) => {
  await startLiveChat(page);
  const panel = await openConnectorsPanel(page);
  await expect(panel).not.toContainText(/is not open/i);
  await expect(panel).not.toContainText(/Could not load/i);
  await expect(panel.getByRole('button', { name: /^local_fs.*Ready · 9 tools/s })).toBeVisible();
  await expect(panel.getByRole('switch', { name: 'Use local_fs in this chat' })).toBeChecked();
  await expect(panel.getByRole('button', { name: 'Manage connectors' })).toBeVisible();
});

test('R18 model picker: one row per provider and model, and the chip names the provider', async ({
  page,
  request,
}) => {
  await ensureMockBackend(request);
  await newChat(page);
  await page.getByRole('button', { name: /^Model:/ }).click();
  const search = page.getByPlaceholder('Search');
  if (await search.isVisible({ timeout: 1_000 }).catch(() => false)) await search.fill('mock-alpha');
  const rows = page.getByRole('option').filter({ hasText: 'mock-alpha' });
  await expect.soft(rows, 'one row for mockvllm / mock-alpha').toHaveCount(1);
  await rows.first().click();
  const chip = page.getByRole('button', { name: /^Model:/ });
  await expect.soft(chip).toHaveAttribute('aria-label', new RegExp(MOCK_BACKEND));
  await expect.soft(chip).not.toHaveAttribute('aria-label', /Any provider/);
  await expect(chip).toHaveAttribute('aria-label', /mock-alpha/);
});

test('R19 settings: language de switches the UI without a restart and sets the agent locale', async ({
  page,
  request,
}) => {
  try {
    await page.goto('/#/settings', { waitUntil: 'networkidle' });
    const input = page.locator('input[name="locale"]');
    await expect(input).toBeVisible();
    await input.fill('de');
    await input.locator('xpath=ancestor::form').getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('button', { name: 'Neue Sitzung', exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Sitzung').first()).toBeVisible();

    const config = (await api(request, 'GET', '/api/cli-config')).body;
    expect(config.locale).toBe('de');
    expect(config.resolvedFrom?.locale).not.toBe('detected');
  } finally {
    await restoreDefaults(request);
  }
});

test('R20 settings: unofficial sign-ins off hides Copilot, on lists it as Unofficial', async ({ page, request }) => {
  const copilot = () => page.getByText('GitHub Copilot');
  await api(request, 'PUT', '/api/cli-config', { 'unofficial-sign-ins': 'false' });
  try {
    await page.goto('/#/backends', { waitUntil: 'networkidle' });
    await expect(page.getByRole('tab', { name: 'Providers' })).toBeVisible();
    await expect(page.getByText('Anthropic', { exact: true }).first()).toBeVisible();
    await expect(copilot()).toHaveCount(0);

    await page.goto('/#/settings', { waitUntil: 'networkidle' });
    const toggle = page.getByRole('checkbox', { name: 'Allow unofficial sign-ins' });
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await page.getByRole('checkbox', { name: /I understand/ }).click();
    await page.getByRole('button', { name: 'Turn on' }).click();
    await expect(toggle).toBeChecked();
    await expect
      .poll(async () => (await api(request, 'GET', '/api/cli-config')).body.unofficialSignIns)
      .toBe('true');

    await page.goto('/#/backends', { waitUntil: 'networkidle' });
    await expect(copilot()).toBeVisible();
    await expect(page.getByText(/Unofficial/).first()).toBeVisible();

    await page.goto('/#/settings', { waitUntil: 'networkidle' });
    await page.getByRole('checkbox', { name: 'Allow unofficial sign-ins' }).click();
    await expect
      .poll(async () => (await api(request, 'GET', '/api/cli-config')).body.unofficialSignIns)
      .toBe('false');
    await page.goto('/#/backends', { waitUntil: 'networkidle' });
    await expect(page.getByText('Anthropic', { exact: true }).first()).toBeVisible();
    await expect(copilot()).toHaveCount(0);
  } finally {
    await api(request, 'PUT', '/api/cli-config', { 'unofficial-sign-ins': 'false' });
  }
});

test('R21 settings: the runtime defaults wording does not mention contenox serve or VS Code', async ({ page }) => {
  await page.goto('/#/settings', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Runtime defaults' })).toBeVisible();
  const panel = page
    .locator('section, div')
    .filter({ has: page.getByRole('heading', { name: 'Runtime defaults' }) })
    .last();
  const runtimeText = await panel.innerText();
  expect(runtimeText).not.toMatch(/contenox serve/i);
  expect(runtimeText).not.toMatch(/VS ?Code/i);

  const pageText = await page.locator('main').innerText();
  expect(pageText).not.toMatch(/contenox serve/i);
  expect(pageText).not.toMatch(/VS ?Code/i);
});

test('R22 new project: a folder is added to the sidebar and its chat is scoped to it', async ({ page }) => {
  const folder = tempDir('e2e-project-');
  const name = 'e2e-project';
  try {
    await page.goto('/#/chat', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByPlaceholder('Optional — defaults to the folder name').fill(name);
    await page.getByPlaceholder('/home/you/code/my-project').fill(folder);
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: `New session in ${name}` }).click();
    await expect(page.getByRole('button', { name: `Project: ${name}` })).toBeVisible();

    setDialog(writeFileDialog('e2e-scoped.txt', 'scoped'));
    await send(page, 'write into the project');
    await expectPermissionCard(page, 'local_fs.write_file: e2e-scoped.txt');
    await page.getByRole('button', { name: 'Allow', exact: true }).click();
    expect(await waitForFile(path.join(folder, 'e2e-scoped.txt'))).toBe('scoped');
    expect(fs.existsSync(path.join(workDir(), 'e2e-scoped.txt'))).toBe(false);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  }
});

test('R23 persistence: after a restart of serve chats, providers, connectors and settings are unchanged', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  const name = 'e2e-persist';
  await removeConnector(request, name);
  try {
    await ensureMockBackend(request);
    await addEchoConnector(request, name, 'e2e_persist_tool');
    await api(request, 'PUT', '/api/cli-config', { 'default-think': 'medium' });
    const url = await startLiveChat(page, 'persist me');

    const port = runtimePort();
    await stopRuntimePort(port);
    startRuntime({
      home: env('HARNESS_HOME'),
      work: workDir(),
      port,
      logFile: path.join(env('HARNESS_HOME'), 'serve-restarted.log'),
    });
    await waitForHealth(runtimeUrl());

    await page.goto(url, { waitUntil: 'networkidle' });
    await expect(seen(page, 'persist me')).toBeVisible({ timeout: 30_000 });
    await expect(seen(page, 'Hello from the scripted backend.')).toBeVisible();
    await expect(page.getByRole('link', { name: /persist me/ }).first()).toBeVisible();

    const mockConn = await connection(request, MOCK_BACKEND);
    expect(mockConn?.providerType).toBe('vllm');
    expect(mockConn?.baseUrl).toBe(mockUrl());
    expect((await connection(request, 'scripted'))?.providerType).toBe('scripted-test');

    await expect
      .poll(async () => (await listConnectors(request)).find(item => item.name === name)?.kind)
      .toBe('mcp');
    await expect
      .poll(async () => (await api(request, 'POST', `/api/connectors/${name}/check`)).body?.status, {
        timeout: 60_000,
      })
      .toBe('ready');

    const config = (await api(request, 'GET', '/api/cli-config')).body;
    expect(config.defaultThink).toBe('medium');
    expect(config.defaultModel).toBe('scripted-ui');
    expect(config.defaultProvider).toBe('scripted-test');

    await page.goto('/#/connectors', { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible();
  } finally {
    await removeConnector(request, name);
  }
});

test('R04 providers: Vertex without credentials', async () => {
  test.skip(true, 'live lane only');
});

test('R05 providers: Bedrock model not enabled', async () => {
  test.skip(true, 'live lane only');
});

test('R07 chat: Think default unset on Bedrock Nova', async () => {
  test.skip(true, 'live lane only');
});

test('R26 agents: Claude Code hosted', async () => {
  test.skip(true, 'live lane only');
});
