import { expect, test } from '@playwright/test';

test('renews the same connection when health rejects its saved credential', async ({ page }) => {
  const id = 'reauth-existing-account';
  let pending = false;
  let renewed = false;
  let starts = 0;
  const row = {
    id,
    name: 'Existing ChatGPT account',
    providerType: 'openai-codex',
    configState: 'configured',
    authState: 'authenticated',
    secretConfigured: true,
    secretPresent: true,
    modelCount: 1,
  };
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.route('**/api/providers/connections', route =>
    route.fulfill({
      json: [
        {
          ...row,
          health: renewed ? 'available' : 'unavailable',
          errorCode: renewed ? undefined : 'login_required',
        },
      ],
    }),
  );
  await page.route('**/api/providers/connections/' + id + '/login*', async route => {
    const method = route.request().method();
    if (method === 'POST') {
      expect(new URL(route.request().url()).searchParams.get('renew')).toBe('true');
      starts++;
      pending = true;
    }
    await route.fulfill({
      json: pending
        ? {
            provider: 'openai-codex',
            state: 'login_pending',
            url: 'https://example.test/device',
            code: 'TEST-CODE',
          }
        : { provider: 'openai-codex', state: 'authenticated' },
    });
  });
  await page.route('**/api/providers/connections/' + id + '/check', route =>
    route.fulfill({ json: { ...row, health: 'available' } }),
  );
  await page.goto('/#/backends');
  await page
    .getByRole('button', { name: /ChatGPT subscription/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Sign in with ChatGPT', exact: true }).click();
  await expect(page.getByText('TEST-CODE', { exact: true })).toBeVisible();
  expect(starts).toBe(1);
  renewed = true;
  pending = false;
  await expect(page.getByText('Signed in with ChatGPT', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(row.name, { exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Sign in again' })).toBeVisible();
});
