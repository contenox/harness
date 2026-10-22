import { defineConfig, devices } from '@playwright/test';

/**
 * Visual review screenshots for the harness SPA.
 *
 * Screenshots are local artefacts: the snapshot directory is gitignored, so a
 * run can never commit them. The first run seeds the directory, later runs
 * compare against it, and `--update-snapshots` refreshes it after an intended
 * visual change.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: process.env.HARNESS_BASE_URL ?? 'http://127.0.0.1:32123',
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    trace: 'off',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  // Written under e2e/screenshots/, which .gitignore excludes.
  snapshotPathTemplate: '{testDir}/../screenshots/{arg}{ext}',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  updateSnapshots: 'missing',
});
