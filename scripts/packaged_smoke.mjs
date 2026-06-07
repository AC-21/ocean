import assert from "node:assert/strict";
import { access, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const smokeTimeoutMs = Number(process.env.OCEAN_LAB_ELECTRON_SMOKE_TIMEOUT_MS || process.env.HARBORLINE_ELECTRON_SMOKE_TIMEOUT_MS || 30_000);
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.env.HARBORLINE_PACKAGE_ARCH || process.arch;
const appName = "Ocean Impact Lab";
const executablePath =
  process.env.OCEAN_LAB_ELECTRON_EXECUTABLE ||
  process.env.HARBORLINE_ELECTRON_EXECUTABLE ||
  path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-packaged-user-data-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(
    `Playwright is required for packaged smoke. Run npm install first. Original error: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

await access(executablePath);

let electronApp;
try {
  electronApp = await electron.launch({
    executablePath,
    env: {
      ...process.env,
      HARBORLINE_USER_DATA_DIR: userDataPath,
    },
    timeout: smokeTimeoutMs,
  });
  const page = await electronApp.firstWindow({ timeout: smokeTimeoutMs });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: smokeTimeoutMs });
  await page.getByRole("button", { name: "Solid steel sphere" }).click({ timeout: smokeTimeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: smokeTimeoutMs });
  await waitForText(page.locator('.readout-block:has(> span:text-is("Impact"))'), /Awaiting entry|m\/s/);
  const canvasSize = await page.locator(".ocean-canvas").evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return { height: rect.height, width: rect.width };
  });
  assert.ok(canvasSize.width > 300, `canvas width should be visible, got ${canvasSize.width}`);
  assert.ok(canvasSize.height > 300, `canvas height should be visible, got ${canvasSize.height}`);
  assert.deepEqual(pageErrors, [], `Packaged page errors: ${pageErrors.join("\n")}`);
  assert.deepEqual(consoleErrors, [], `Packaged console errors: ${consoleErrors.join("\n")}`);

  console.log(`Packaged app smoke passed with userData at ${userDataPath}.`);
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
