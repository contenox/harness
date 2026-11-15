import { expect, test } from '@playwright/test';

test('adds a scoped catalog connector and reopens its saved row after sign-in', async ({
  page,
}) => {
  const row = {
    id: 'linear-test',
    name: 'linear',
    label: 'linear',
    kind: 'mcp',
    url: 'https://mcp.linear.app/mcp',
    transport: 'http',
    authType: 'oauth',
    scope: 'workspace',
    workspace: '/projects/demo',
    status: 'needs_sign_in',
    tools: [],
  };
  let created = false;
  await page.route('**/api/workspace/roots', route =>
    route.fulfill({ json: { roots: [{ path: row.workspace, name: 'Demo' }] } }),
  );
  await page.route('**/api/connectors', route => route.fulfill({ json: created ? [row] : [] }));
  await page.route('**/api/connectors/linear/check', route => route.fulfill({ json: row }));
  await page.route('**/api/mcp-servers', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({
      name: row.name,
      url: row.url,
      transport: 'http',
      authType: 'oauth',
      workspace: row.workspace,
    });
    created = true;
    await route.fulfill({ status: 201, json: row });
  });
  await page.goto('/#/connectors');
  const card = page
    .getByRole('region', { name: 'Connector catalog' })
    .getByRole('button', { name: /^Linear/ });
  await card.click();
  const dialog = page.getByRole('dialog', { name: 'Add Linear' });
  await expect(dialog.getByRole('link', { name: 'Linear setup guide' })).toHaveAttribute(
    'href',
    'https://linear.app/docs/mcp',
  );
  await dialog.getByRole('combobox').selectOption(row.workspace);
  await dialog.getByRole('button', { name: 'Add and check' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.goto('/hooks/remote?mcp_oauth=error&name=linear');
  await expect(page.getByText(/Sign-in did not finish/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await card.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/Sign-in did not finish/)).toHaveCount(0);
});
