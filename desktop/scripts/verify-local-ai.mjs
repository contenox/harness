// Run against a built Harness UI and Runtime, with a native worker available.
// CONTENOX_LOCAL_AI_MODEL selects an installed model or a catalog download.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktop = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const require = createRequire(
  path.join(desktop, "../packages/harness/package.json"),
);
const { _electron, expect } = require("@playwright/test");
const packagedApp = process.env.CONTENOX_QA_PACKAGED_APP;
const executablePath = packagedApp || createRequire(import.meta.url)("electron");
const requestedModel = process.env.CONTENOX_LOCAL_AI_MODEL;
assert.ok(packagedApp || process.env.CONTENOX_RUNTIME_BIN, "Set CONTENOX_QA_PACKAGED_APP or CONTENOX_RUNTIME_BIN.");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "contenox-local-ai-"));
const evidence = process.env.CONTENOX_QA_OUTPUT || profile;
fs.mkdirSync(evidence, { recursive: true });
const env = {
  ...process.env,
  HOME: profile,
  USERPROFILE: profile,
  APPDATA: path.join(profile, "roaming"),
  LOCALAPPDATA: path.join(profile, "local"),
  CONTENOX_UPDATE_CHECK: "false",
};
delete env.ELECTRON_RUN_AS_NODE;
if (packagedApp) {
  delete env.CONTENOX_RUNTIME_BIN;
  delete env.CONTENOX_MODELD_BIN;
  // A packaged smoke test must not install a worker from a release server.
  env.CONTENOX_MODELD_BASE_URL = "http://127.0.0.1:1";
}
const launch = () =>
  _electron.launch({
    executablePath,
    args: [
      ...(packagedApp ? [] : [desktop]),
      "--lang=en-US",
      "--user-data-dir=" + path.join(profile, "desktop"),
    ],
    env,
    timeout: 90000,
  });
let app;
let page;
try {
  app = await launch();
  page = await app.firstWindow();
  const origin = await page
    .waitForURL(/^http:\/\/127\.0\.0\.1:/, { timeout: 90000 })
    .then(() => new URL(page.url()).origin);
  await page.evaluate(() => localStorage.setItem("i18nextLng", "en"));
  await page.reload();
  await page
    .getByRole("button", { name: "Use local AI", exact: true })
    .waitFor();
  await page.screenshot({ path: path.join(evidence, "first-run.png") });
  await page.getByRole("button", { name: "Use local AI", exact: true }).click();
  const detected = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/local-ai/hardware",
  );
  await page.getByRole("button", { name: "Detect my hardware" }).click();
  const recommendation = (await (await detected).json()).recommendation;
  const model = requestedModel || recommendation;
  assert.ok(
    model,
    "No recommendation fits this machine. Select an installed chat model to test.",
  );
  await expect(page.getByRole("button", { name: "Check again" })).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({ path: path.join(evidence, "local-setup.png") });
  await page.getByRole("button", { name: "Browse local models" }).click();
  const models = await (
    await page.request.get(origin + "/api/local-ai/models")
  ).json();
  const item = models.find((m) => m.name === model);
  assert.ok(item, "model must be present in the local catalog or inventory");
  await page.getByRole("textbox", { name: "Find a model" }).fill(model);
  await page
    .getByRole("button", {
      name: new RegExp(item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    })
    .first()
    .click();
  await page.screenshot({ path: path.join(evidence, "local-inventory.png") });
  if (!requestedModel)
    await page.getByRole("button", { name: "Back", exact: true }).click();
  await page
    .getByRole("button", {
      name: item.installed ? "Use for chat" : /^Download and use/,
    })
    .first()
    .click();
  await expect
    .poll(
      async () => {
        const op = await (
          await page.request.get(origin + "/api/local-ai/operations/current")
        ).json();
        if (op.phase === "failed") throw new Error(op.error);
        return op.phase;
      },
      { timeout: 900000, intervals: [1000, 2000, 3000] },
    )
    .toBe("done");
  const composer = page.getByRole("textbox", { name: "Message the agent…" });
  await expect(composer).toBeVisible({ timeout: 60000 });
  await composer.fill("Reply with just the word ORCHID.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText(/^ORCHID[.!]?$/i).last()).toBeVisible({
    timeout: 180000,
  });
  await page.screenshot({ path: path.join(evidence, "local-chat.png") });
  await page.goto(origin + "/#/backends?tab=local-ai");
  await expect(page.getByText(model, { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({ path: path.join(evidence, "local-status.png") });
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  await expect(
    page.getByRole("textbox", { name: "Message the agent…" }),
  ).toBeVisible({ timeout: 90000 });
  const current = await (
    await page.request.get(new URL("/api/local-ai/models", page.url()).href)
  ).json();
  assert.ok(current.find((m) => m.name === model && m.installed && m.primary));
  const originAfterRestart = new URL(page.url()).origin;
  const config = await (
    await page.request.get(originAfterRestart + "/api/cli-config")
  ).json();
  assert.ok(
    !config.defaultAltModel && !config.defaultAltProvider,
    "Local setup must leave recovery assignment to the user",
  );
  await page.goto(originAfterRestart + "/#/backends?tab=providers");
  await page.getByRole("link", { name: "Manage models" }).click();
  await expect(
    page.getByRole("heading", { name: "Local model inventory" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Find a model" }).waitFor();
  await expect(page.getByText("Chat default", { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidence, "local-inventory.png") });
  await page.goto(originAfterRestart + "/#/settings");
  const form = page
    .locator("form")
    .filter({ has: page.locator("[name=default-alt-provider]") });
  await form.locator("[name=default-alt-model]").selectOption(model);
  await form
    .locator("[name=default-alt-provider]")
    .selectOption({ label: "Local AI" });
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/cli-config") && r.request().method() === "PUT",
  );
  await form.locator("button[type=submit]").click();
  assert.ok((await saved).ok(), "Manual recovery selection must be saved");
  const updated = await (
    await page.request.get(originAfterRestart + "/api/cli-config")
  ).json();
  assert.equal(updated.defaultAltModel, model);
  assert.equal(updated.defaultAltProvider, updated.defaultProvider);
  await page.goto(originAfterRestart + "/#/backends?tab=local-ai");
  await page
    .getByRole("button", { name: new RegExp(model) })
    .first()
    .click();
  await page.getByRole("button", { name: "Unload from memory" }).click();
  await expect(page.getByText("No model is loaded.")).toBeVisible({
    timeout: 30000,
  });
  console.log(
    "Verified local onboarding, inventory, inference, worker status and restart.",
    evidence,
  );
} catch (error) {
  if (page && !page.isClosed()) {
    console.error(
      (
        await page
          .locator("body")
          .innerText()
          .catch(() => "")
      ).slice(0, 3500),
    );
    await page
      .screenshot({ path: path.join(evidence, "local-failure.png") })
      .catch(() => {});
  }
  console.error("Isolated test profile:", profile);
  throw error;
} finally {
  if (app) await app.close().catch(() => {});
}
