import { expect, test } from '@playwright/test';
import { composer, send } from './support';

test('subscribe from an empty topic, preview, publish and replay', async ({ page }) => {
  const topic = 'review.browser.' + Date.now();
  await page.goto('/#/subscribe');
  await page.getByRole('tab', { name: 'Subscriptions', exact: true }).click();
  await page.getByRole('button', { name: 'Create trigger', exact: true }).click();
  const form = page.getByRole('region', { name: 'Create trigger', exact: true });
  await form.getByLabel('Name', { exact: true }).fill(topic);
  await form.getByLabel('Topic', { exact: true }).fill(topic);
  await form.getByLabel('Action', { exact: true }).selectOption('notify');
  await form.getByLabel('Task for the agent').fill('Review ready');
  await form.getByRole('button', { name: 'Create trigger' }).click();
  await expect(form).toBeHidden();
  await page.getByRole('tab', { name: 'Event log' }).click();
  await page.getByRole('button', { name: 'Create test event', exact: true }).click();
  const compose = page.locator('#event-compose');
  await compose.getByLabel('Topic', { exact: true }).fill(topic);
  await compose.getByLabel('JSON payload').fill('{"review":42}');
  await expect(compose.getByText(topic, { exact: false }).last()).toBeVisible();
  await compose.getByRole('button', { name: 'Fire test event' }).click();
  const event = page.getByRole('button', { name: new RegExp(topic + ' #') });
  await expect(event).toHaveCount(1);
  await event.click();
  await expect(
    page.getByRole('region', { name: new RegExp(topic + ' #') }).locator('pre'),
  ).toContainText('"review": 42');
  await page.getByRole('button', { name: 'Replay event', exact: true }).click();
  await compose.getByRole('region').getByRole('button', { name: 'Replay event' }).click();
  await expect(event).toHaveCount(2);
});

test('create, pause, resume and remove an interval in the schedule tab', async ({ page }) => {
  const topic = 'timer.browser.' + Date.now();
  await page.goto('/#/subscribe');
  await page.getByRole('tab', { name: 'Schedules' }).click();
  await page.getByRole('button', { name: /Create schedule/ }).click();
  const form = page.getByRole('region', { name: /Create schedule/ });
  await form.getByLabel('Topic').fill(topic);
  const every = form.getByLabel('Every', { exact: true });
  const validate = form.getByRole('button', { name: 'Validate interval' });
  await every.fill('1d');
  await validate.click();
  await expect(form.getByRole('alert')).toContainText('24h');
  await every.fill('1h30m');
  await expect(form.getByRole('alert')).toHaveCount(0);
  await validate.click();
  await expect(form.locator('[role="status"][aria-live="polite"]')).toContainText('Valid interval.');
  await expect(page.getByRole('button', { name: new RegExp(topic) })).toHaveCount(0);
  await every.fill('24h');
  await expect(form.locator('[role="status"][aria-live="polite"]')).toBeEmpty();
  await form.getByRole('button', { name: 'Create schedule' }).click();
  const row = page.getByRole('button', { name: new RegExp(topic) });
  await row.click();
  const controls = page.getByRole('region', { name: new RegExp(topic) });
  await controls.getByRole('button', { name: 'Pause' }).click();
  await controls.getByRole('button', { name: 'Resume' }).click();
  await expect(controls.getByRole('button', { name: 'Pause' })).toBeVisible();
  await controls.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
});

test('ACP topic and subscription pickers publish through the live runtime', async ({ page }) => {
  const topic = 'review.command.' + Date.now();
  await page.goto('/#/subscribe');
  const projects = page.getByRole('combobox', { name: 'Project' });
  const project = await projects.locator('option:checked').textContent();
  const root = await projects.inputValue();
  await page.getByRole('button', { name: 'New session in ' + project, exact: true }).click();
  await send(page, '/event ' + topic + ' {"test":true}');
  await expect(page.getByText(new RegExp('Published ' + topic)).last()).toBeVisible({
    timeout: 30000,
  });
  const input = composer(page);
  await input.fill('/subscribe ');
  await page
    .getByRole('option')
    .filter({ hasText: /^topic$/ })
    .click();
  await page.getByRole('option').filter({ hasText: topic }).click();
  await page
    .getByRole('option')
    .filter({ hasText: /^this-session$/ })
    .click();
  await page
    .getByRole('option')
    .filter({ hasText: /^hitl-policy-default\.json$/ })
    .click();
  await expect(input).toHaveValue(
    '/subscribe topic ' + topic + ' this-session hitl-policy-default.json ',
  );
  await input.fill((await input.inputValue()) + 'Read the review and summarize.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(/Subscribed|Created subscription/i).last()).toBeVisible();
  await page.goto('/#/subscribe');
  await projects.selectOption(root);
  await page.getByRole('tab', { name: 'Subscriptions', exact: true }).click();
  await expect(page.getByText(topic + ' → this-session', { exact: true })).toBeVisible();
});
