import { expect, test } from '@playwright/test';
import path from 'node:path';
import { workDir } from './support';

test('workspace menu connects its remote and posts the editable review for the displayed revision', async ({
  page,
}) => {
  const root = workDir(),
    remote = { name: 'upstream', repo: 'example/engine' },
    binding = { ...remote, id: 37, credential: 'cli' };
  let connected = false;
  const head = 'e'.repeat(40);
  const posted: unknown[] = [];
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
  await page.route('**/api/workspace/github**', async route => {
    const req = route.request(),
      u = new URL(req.url());
    expect(path.normalize(u.searchParams.get('root') ?? '')).toBe(path.normalize(root));
    const view = u.pathname.split('/').at(-1);
    if (view === 'github') {
      if (req.method() === 'PUT') {
        expect(req.postDataJSON()).toEqual({ ...remote, credential: 'cli' });
        connected = true;
      }
      if (req.method() === 'DELETE') connected = false;
      return route.fulfill({
        json: { remotes: [remote], binding: connected ? binding : null, branch: 'feature' },
      });
    }
    if (view === 'reviews') {
      posted.push(req.postDataJSON());
      return route.fulfill({
        json: { url: 'https://github.com/example/engine/pull/9#pullrequestreview-7' },
      });
    }
    expect(u.searchParams.get('repoId')).toBe('37');
    const pr = {
      number: 9,
      title: 'Fix arithmetic',
      body: 'Test the result.',
      authorLogin: 'sam',
      head: 'feature',
      headOwner: 'example',
      ref: head,
      base: 'main',
      url: 'https://github.com/example/engine/pull/9',
      draft: true,
    };
    if (view === 'pull') return route.fulfill({ json: pr });
    const items =
      view === 'pulls'
        ? [pr]
        : view === 'files'
          ? [
              {
                filename: 'add.js',
                status: 'added',
                patch: '@@ -0,0 +1 @@\n+return a-b',
                additions: 1,
                deletions: 0,
              },
            ]
          : [{ id: 1, path: 'add.js', line: 1, author: 'sam', body: 'Check the sign.' }];
    return route.fulfill({ json: { items } });
  });
  await page.route('**/api/files/content?**', async route => {
    if (
      new URL(route.request().url()).searchParams.get('path') ===
      'reviews/github-37-pr-9-eeeeeeeeeeee.md'
    )
      return route.fulfill({ json: { content: 'Use addition.', encoding: 'utf8' } });
    return route.fallback();
  });
  await page.goto('/#/connectors');
  await page.getByTitle(path.basename(root), { exact: true }).first().click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'GitHub repository…' }).click();
  await page.getByRole('combobox', { name: 'Access' }).selectOption('cli');
  await page.getByRole('button', { name: 'Connect Repository', exact: true }).click();
  await page.getByRole('button', { name: 'Fix arithmetic', exact: true }).click();
  await expect(page.getByText('return a-b', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Review comments' }).click();
  await expect(page.getByText('Check the sign.')).toBeVisible();
  await page.getByRole('button', { name: 'Load review file' }).click();
  const draft = page.getByRole('textbox', { name: 'Review to post' });
  await expect(draft).toHaveValue('Use addition.');
  await draft.fill('Please return a+b.');
  await page.getByRole('button', { name: 'Post review to GitHub' }).click();
  await expect(page.getByRole('link', { name: 'View posted review on GitHub' })).toBeVisible();
  expect(posted).toEqual([{ repoId: 37, number: 9, head, body: 'Please return a+b.' }]);
  await page.getByRole('button', { name: /example\/engine \/ Pull Requests/i }).click();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Connect Repository' })).toBeVisible();
});
