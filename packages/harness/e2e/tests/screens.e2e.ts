import { expect, test, type Page } from '@playwright/test';

/**
 * One screenshot per top-level surface. Most run against an empty, freshly
 * seeded database: that is the first-run state a reviewer actually sees, so it
 * is the state worth freezing and diffing.
 */
// The SPA routes on the URL hash (`#/chat`, `#/backends`, …), so a plain path
// only loads the shell and the router falls back to `#/chat` — every capture
// would then be the same page. Address the hash routes directly.
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

/** Opens the seeded conversation and returns its session id, or null when absent. */
async function openSeededSession(page: Page): Promise<string | null> {
  await page.goto('/#/chat', { waitUntil: 'networkidle' });
  // The sidebar link carries the session id in its href even while the narrow
  // layout keeps the sidebar collapsed, so no click is needed to discover it.
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
      // The harness seeds one ACP conversation; open it so the capture shows a
      // transcript rather than the empty composer behind the sidebar.
      const seeded = page.getByText('Show me what a seeded session looks like.').first();
      await seeded.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
      if (await seeded.isVisible().catch(() => false)) {
        await seeded.click();
        await page.waitForTimeout(1_500);
      }
    }
    // Let async shells (status queries, websocket banners) settle before the
    // capture; the assertion below is what makes the wait meaningful.
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}

// The workbench: the library's session layout (tree · chat · preview) over the
// session the harness seeded. These captures are the visual proof that the
// components and the workspace source are wired — tree, transcript, preview.
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
  // The preview pane renders the file's text through the library's FilePane.
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
    // Discover the session at a wide viewport (the sidebar is closed on a
    // phone and the list is not in the DOM until it opens), then shrink.
    await page.setViewportSize({ width: 1440, height: 900 });
    const sessionId = await openSeededSession(page);
    expect(sessionId, 'the seeded ACP session').not.toBeNull();
    await page.setViewportSize({ width: 412, height: 900 });

    await page.goto(`/#/workbench/${sessionId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1_500);
    await expect(page).toHaveScreenshot('workbench-phone.png', { fullPage: true });
  });
});
