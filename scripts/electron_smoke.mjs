import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const smokeTimeoutMs = Number(process.env.OCEAN_LAB_ELECTRON_SMOKE_TIMEOUT_MS || 25_000);
const root = process.cwd();
const executablePath = process.env.HARBORLINE_ELECTRON_EXECUTABLE;
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-electron-user-data-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(
    `Playwright is required for Electron smoke. Run npm install first. Original error: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

let electronApp;
try {
  electronApp = await electron.launch({
    args: executablePath ? [] : [root],
    env: {
      ...process.env,
      HARBORLINE_USER_DATA_DIR: userDataPath,
    },
    executablePath,
    timeout: smokeTimeoutMs,
  });

  const page = await electronApp.firstWindow({ timeout: smokeTimeoutMs });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: smokeTimeoutMs });
  await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: smokeTimeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: smokeTimeoutMs });
  await waitForText(page.locator(".stage-toolbar strong"), /Falling|Floating|Sinking|On seabed/);
  await waitForText(page.locator('.readout-block:has(> span:text-is("Impact"))'), /Awaiting entry|m\/s/);

  const hasCanvas = await page.locator(".ocean-canvas").evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 300 && rect.height > 300;
  });
  assert.equal(hasCanvas, true, "ocean canvas should be visible and sized");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);

  console.log(`Electron launch smoke passed with userData at ${userDataPath}.`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function waitForText(locator, pattern) {
  await locator.waitFor({ state: "visible", timeout: smokeTimeoutMs });
  const deadline = Date.now() + smokeTimeoutMs;
  while (Date.now() < deadline) {
    const text = await locator.textContent();
    if (pattern.test(text ?? "")) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${pattern} in ${await locator.textContent()}`);
}
