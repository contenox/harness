import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['src/**/*.test.{ts,tsx}'] } },
      {
        optimizeDeps: { include: ['@monaco-editor/react', 'monaco-editor'] },
        plugins: [storybookTest({ configDir: fileURLToPath(new URL('./.storybook', import.meta.url)) })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [
              { browser: 'chromium', name: 'small', viewport: { width: 412, height: 900 } },
              { browser: 'chromium', name: 'mid', viewport: { width: 820, height: 900 } },
              { browser: 'chromium', name: 'desktop', viewport: { width: 1280, height: 900 } },
            ],
          },
        },
      },
    ],
  },
});
