import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_FLUID_CAPABILITY_TIMEOUT_MS || 25_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_FLUID_CAPABILITY_OUT || "reports/fluid-capability-latest.json";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-fluid-capability-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the fluid capability report. Original error: ${error instanceof Error ? error.message : String(error)}`);
}

let electronApp;
try {
  electronApp = await electron.launch({
    args: [root],
    env: {
      ...process.env,
      HARBORLINE_USER_DATA_DIR: userDataPath,
    },
    timeout: timeoutMs,
  });

  const page = await electronApp.firstWindow({ timeout: timeoutMs });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: timeoutMs });
  const report = await page.waitForFunction(
    () => {
      const candidate = window.__fluidGridCapabilityReport;
      return candidate && candidate.status !== "checking" ? candidate : null;
    },
    undefined,
    { timeout: timeoutMs }
  ).then((handle) => handle.jsonValue());

  assert.equal(typeof report, "object", "fluid capability report should be an object");
  assert.ok(report.requiredBrowserApis.includes("navigator.gpu"), "report should preserve WebGPU API requirement");
  assert.ok(report.selectedTier, "report should select a fluid grid tier");
  assert.ok(report.grid?.cellsX > 0 && report.grid?.cellsY > 0, "report should include grid dimensions");
  assert.ok(report.backend === "webgpu-compute" || report.backend === "cpu-deterministic-test", `unexpected backend ${report.backend}`);
  if (report.status !== "webgpu-ready") {
    assert.ok(report.fallbackReason, "fallback report should explain why WebGPU is not active");
  }
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid capability report written to ${outPath}`);
  console.log(`- status: ${report.status}`);
  console.log(`- backend: ${report.backend}`);
  console.log(`- tier: ${report.selectedTier} (${report.grid.cellsX}x${report.grid.cellsY})`);
  console.log(`- fallback: ${report.fallbackReason ?? "none"}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}
