import { expect, test } from '@playwright/test';

/**
 * One screenshot per top-level surface. Most run against an empty, freshly
 * seeded database: that is the first-run state a reviewer actually sees, so it
 * is the state worth freezing and diffing.
 */
const surfaces: Array<[name: string, path: string]> = [
  ['root', '/'],
  ['chat', '/chat'],
  ['sessions', '/chats'],
  ['backends', '/backends'],
  ['missions', '/missions'],
  ['fleet', '/fleet'],
  ['inbox', '/inbox'],
  ['projects', '/projects'],
  ['terminal', '/terminal'],
  ['settings', '/settings'],
];

for (const [name, path] of surfaces) {
  test(`${name} renders`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    // Let async shells (status queries, websocket banners) settle before the
    // capture; the assertion below is what makes the wait meaningful.
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
