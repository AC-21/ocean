import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_FLUID_COUPLING_TIMEOUT_MS || 45_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_FLUID_COUPLING_OUT || "reports/fluid-coupling-latest.json";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-fluid-coupling-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the fluid coupling report. Original error: ${error instanceof Error ? error.message : String(error)}`);
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
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 8;
  }, undefined, { timeout: timeoutMs });

  await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: timeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return (
      canvas?.getAttribute("data-water-coupling") === "object-grid-v1" &&
      canvas?.getAttribute("data-water-coupling-active") === "true" &&
      Number(canvas?.getAttribute("data-water-coupling-cells") ?? 0) > 0 &&
      Number(canvas?.getAttribute("data-water-coupling-impulse") ?? 0) > 0
    );
  }, undefined, { timeout: timeoutMs });

  const telemetry = await page.locator(".ocean-canvas").evaluate((canvas) => ({
    coupling: canvas.getAttribute("data-water-coupling"),
    couplingActive: canvas.getAttribute("data-water-coupling-active") === "true",
    couplingCells: Number(canvas.getAttribute("data-water-coupling-cells") ?? 0),
    couplingForceN: Number(canvas.getAttribute("data-water-coupling-force") ?? 0),
    couplingImpulse: Number(canvas.getAttribute("data-water-coupling-impulse") ?? 0),
    couplingSamples: Number(canvas.getAttribute("data-water-coupling-samples") ?? 0),
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    grid: canvas.getAttribute("data-water-grid"),
    renderer: canvas.getAttribute("data-water-renderer"),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
  const stats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null);
  const coupling = stats?.lastCoupling ?? null;

  assert.equal(telemetry.renderer, "webgpu-grid-primary-v1", "FG-04 requires the WebGPU grid renderer");
  assert.equal(telemetry.waterContext, "webgpu", "FG-04 must not use Canvas 2D as the primary water context");
  assert.equal(telemetry.coupling, "object-grid-v1", "object-grid coupling telemetry should be active");
  assert.equal(telemetry.couplingActive, true, "object-grid coupling should activate during the drop");
  assert.ok(telemetry.couplingCells > 0, `expected footprint cells, got ${telemetry.couplingCells}`);
  assert.ok(telemetry.couplingImpulse > 0, `expected nonzero grid impulse, got ${telemetry.couplingImpulse}`);
  assert.ok(telemetry.couplingSamples > 0, `expected bounded grid samples, got ${telemetry.couplingSamples}`);
  assert.ok(coupling, "renderer stats should expose the latest coupling summary");
  assert.equal(coupling.active, true, "coupling summary should be active");
  assert.equal(coupling.boundedDiagnostics, true, "coupling diagnostics must be bounded local samples");
  assert.ok(coupling.footprintCells > 0, "coupling summary should include footprint cells");
  assert.ok(coupling.impulseMagnitude > 0, "coupling summary should include displacement impulse");
  assert.ok(Number.isFinite(coupling.verticalForceDeltaN), "vertical grid force delta should be finite");
  assert.ok(Number.isFinite(coupling.horizontalForceDeltaN), "horizontal grid force delta should be finite");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-04",
    noFullGridReadbackPerFrame: true,
    pass: true,
    stats,
    telemetry,
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid coupling report written to ${outPath}`);
  console.log(`- renderer: ${telemetry.renderer}, ${telemetry.waterContext}`);
  console.log(`- footprint: ${telemetry.couplingCells} cells, ${telemetry.couplingSamples} bounded samples`);
  console.log(`- impulse: ${telemetry.couplingImpulse}, force delta: ${telemetry.couplingForceN} N`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}
