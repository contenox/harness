import { expect, test, type Page } from '@playwright/test';

const surfaces: Array<[name: string, path: string]> = [
  ['root', '/'],
  ['chat', '/#/chat'],
  ['sessions', '/#/chats'],
  ['backends', '/#/backends'],
  ['missions', '/#/missions'],
  ['fleet', '/#/fleet'],
  ['inbox', '/#/inbox'],
  ['projects', '/#/projects'],
  ['terminal', '/#/terminal'],
  ['settings', '/#/settings'],
];

async function openSeededSession(page: Page): Promise<string | null> {
  await page.goto('/#/chat', { waitUntil: 'networkidle' });
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

for (const [name, path] of surfaces) {
  test(`${name} renders`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    if (name === 'chat') {
      const seeded = page.getByText('Show me what a seeded session looks like.').first();
      await seeded.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
      if (await seeded.isVisible().catch(() => false)) {
        await seeded.click();
        await page.waitForTimeout(1_500);
      }
    }
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}

test('workbench shows the tree and the conversation', async ({ page }) => {
  const sessionId = await openSeededSession(page);
  expect(sessionId, 'the seeded ACP session').not.toBeNull();

  await page.goto(`/#/workbench/${sessionId}`, { waitUntil: 'networkidle' });
  await page.getByText('README.md').first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(1_000);
  await expect(page).toHaveScreenshot('workbench.png', { fullPage: true });
});

test('workbench previews a file', async ({ page }) => {
  const sessionId = await openSeededSession(page);
  expect(sessionId, 'the seeded ACP session').not.toBeNull();

  await page.goto(`/#/workbench/${sessionId}`, { waitUntil: 'networkidle' });
  const readme = page.getByText('README.md').first();
  await readme.waitFor({ state: 'visible', timeout: 10_000 });
  await readme.click();
  await page.getByText('This file is served by the runtime').first().waitFor({
    state: 'visible',
    timeout: 10_000,
  });
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('workbench-file.png', { fullPage: true });
});

test.describe('workbench on a phone', () => {
  test.use({ viewport: { width: 412, height: 900 } });

  test('workbench collapses to one pane', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const sessionId = await openSeededSession(page);
    expect(sessionId, 'the seeded ACP session').not.toBeNull();
    await page.setViewportSize({ width: 412, height: 900 });

    await page.goto(`/#/workbench/${sessionId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1_500);
    await expect(page).toHaveScreenshot('workbench-phone.png', { fullPage: true });
  });
});
