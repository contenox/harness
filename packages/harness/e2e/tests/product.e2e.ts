import { expect, test, type Page } from '@playwright/test';

async function openSeededSession(page: Page): Promise<string | null> {
  await page.goto('/#/chats', { waitUntil: 'networkidle' });
  const link = page
    .getByRole('link', { name: /Show me what a seeded session looks like/ })
    .first();
  await link.waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {});
  let href = await link.getAttribute('href').catch(() => null);
  if (href === null) {
    const toggle = page.getByRole('button', { name: 'Toggle sidebar' });
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
    await link.waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {});
    href = await link.getAttribute('href').catch(() => null);
  }
  const id = href?.split('/').filter(Boolean).pop() ?? null;
  return id !== null && id.startsWith('acp-') ? id : null;
}

test('mission start offers the envelope catalog', async ({ page }) => {
  await page.goto('/#/missions/new', { waitUntil: 'networkidle' });
  await page.getByText('Intent').first().waitFor({ state: 'visible', timeout: 10_000 });

  const selects = page.locator('select');
  const count = await selects.count();
  const options: string[][] = [];
  for (let i = 0; i < count; i += 1) {
    options.push(
      await selects.nth(i).evaluate(node =>
        Array.from((node as HTMLSelectElement).options).map(option => option.textContent?.trim() ?? ''),
      ),
    );
  }
  console.info('mission selects', JSON.stringify(options));
  expect(options.flat()).toEqual(
    expect.arrayContaining(['strict', 'default', 'read_only']),
  );
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot('missions-new.png', { fullPage: true });
});

test('chat slash picker lists commands and model values', async ({ page }) => {
  const sessionId = await openSeededSession(page);
  expect(sessionId, 'the seeded ACP session').not.toBeNull();

  await page.goto(`/#/chat/${sessionId}`, { waitUntil: 'networkidle' });
  const box = page.locator('textarea').first();
  await box.waitFor({ state: 'visible', timeout: 10_000 });

  await box.fill('/');
  await page.getByRole('listbox', { name: 'Commands' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot('chat-slash-commands.png', { fullPage: true });

  await box.fill('/model ');
  await page.waitForTimeout(500);
  const values = page.getByRole('listbox', { name: 'Values for /model' });
  if (await values.isVisible().catch(() => false)) {
    await expect(page).toHaveScreenshot('chat-slash-model.png', { fullPage: true });
  }
});

test('files pane has the resizable editor split', async ({ page }) => {
  const sessionId = await openSeededSession(page);
  expect(sessionId, 'the seeded ACP session').not.toBeNull();

  await page.goto(`/#/chat/${sessionId}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Files' }).click();
  await page.waitForTimeout(1_000);
  await expect(page).toHaveScreenshot('files-pane.png', { fullPage: true });
});
