import { expect, test } from '@playwright/test';

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
