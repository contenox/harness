import { expect, test } from '@playwright/test';
import path from 'node:path';
import { AcpClient, WebSocketTransport } from '../../../acp-client/src';
import {
  answer,
  composer,
  env,
  runtimePort,
  runtimeUrl,
  seen,
  send,
  setDialog,
  startRuntime,
  stopRuntimePort,
  waitForHealth,
  workDir,
} from './support';

test('a real window shift stays in the chat with the original budget after reopening and resizing', async ({
  page,
}) => {
  const transport = new WebSocketTransport(runtimeUrl().replace(/^http/, 'ws') + '/acp');
  const client = new AcpClient(transport);
  try {
    await client.initialize();
    const { sessionId } = await client.newSession(workDir());
    await client.setConfigOption(sessionId, 'token-limit', '32768');
    setDialog(answer('Saved the earlier material.'));
    await client.prompt(sessionId, [{ type: 'text', text: 'earlier material '.repeat(2000) }]);
    await client.setConfigOption(sessionId, 'token-limit', '24576');
    await page.goto('/#/chat/' + sessionId, { waitUntil: 'domcontentloaded' });
    await expect(composer(page)).toBeVisible();
    await expect(page.getByText(/Context shifted\./)).toHaveCount(0);
    setDialog(answer('Finished after the window changed.'));
    await send(page, 'Please confirm.');
    await expect(seen(page, 'Finished after the window changed.')).toBeVisible({ timeout: 30000 });
    const lines = page.locator('summary').filter({ hasText: /Context shifted\./ });
    await expect(lines.first()).toContainText('24,576');
    await lines.first().click();
    await expect(page.getByText(/Estimated input fell from/).first()).toBeVisible();
    const count = await lines.count();
    await client.setConfigOption(sessionId, 'token-limit', '32768');
    const restored = await client.loadSession(sessionId, workDir());
    expect(restored.configOptions?.find(option => option.id === 'token-limit')?.currentValue).toBe(
      '32768',
    );
    transport.close();
    const port = runtimePort();
    await stopRuntimePort(port);
    startRuntime({
      home: env('HARNESS_HOME'),
      work: workDir(),
      port,
      logFile: path.join(env('HARNESS_HOME'), 'serve-restarted.log'),
    });
    await waitForHealth(runtimeUrl());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(lines).toHaveCount(count);
    await expect(lines.first()).toContainText('24,576');
    await expect(page.getByText('Saved the earlier material.', { exact: true })).toBeVisible();
    await expect(
      page.getByTitle(/Current window: 32,768 tokens.*2 user messages in this chat/),
    ).toBeVisible();
  } finally {
    transport.close();
  }
});
