import { expect, test } from '@playwright/test';
import type { LocalModel, ModelOperation } from '../../src/lib/localAI';

test('local inventory recovers a gated download, supports cancellation, and confirms file removal', async ({
  page,
}) => {
  const model: LocalModel = {
    name: 'test-model',
    label: 'Test chat model',
    engine: 'llama',
    bytes: 1200000000,
    installed: false,
    assigned: false,
    primary: false,
    chat: true,
  };
  let operation: ModelOperation = {
    id: '',
    model: '',
    action: 'download',
    phase: '',
    current: 0,
    total: 0,
  };
  let attempts = 0;
  await page.route('**/api/local-ai/**', async route => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    if (pathname.endsWith('/operations/current')) return route.fulfill({ json: operation });
    if (pathname.endsWith('/operations') && req.method() === 'POST') {
      const input = req.postDataJSON();
      expect(input.model).toBe(model.name);
      expect(input.action).toBe('download');
      attempts++;
      operation = {
        action: 'download',
        id: String(attempts),
        model: model.name,
        phase: 'download',
        current: 12000,
        total: model.bytes,
      };
      if (attempts === 1)
        operation = {
          ...operation,
          phase: 'failed',
          failure: 'download',
          accessUrl: 'https://huggingface.co/example/model',
        };
      if (attempts === 2) expect(input.token).toBe('test-read-token');
      if (attempts === 3) {
        model.installed = true;
        operation.phase = 'done';
      }
      return route.fulfill({ json: operation, status: 202 });
    }
    if (req.method() === 'DELETE') {
      if (pathname.includes('/operations/')) {
        operation.phase = 'cancelled';
        return route.fulfill({ json: operation });
      }
      expect(pathname).toBe('/api/local-ai/models/test-model');
      model.installed = false;
      return route.fulfill({ json: true });
    }
    expect(pathname).toBe('/api/local-ai/models');
    return route.fulfill({ json: [model] });
  });
  await page.goto('/#/local-models');
  await page.getByRole('button', { name: /Test chat model/ }).click();
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open model repository' })).toHaveAttribute(
    'href',
    'https://huggingface.co/example/model',
  );
  const token = page.getByLabel('Hugging Face read token');
  await expect(token).toHaveAttribute('type', 'password');
  await token.fill('test-read-token');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Download complete', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Test chat model/ }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .last()
    .click();
  expect(model.installed).toBe(true);
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('No models installed yet.')).toBeVisible();
});
