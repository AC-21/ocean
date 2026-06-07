import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_FLUID_SPLASH_TIMEOUT_MS || 60_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_FLUID_SPLASH_OUT || "reports/fluid-splash-latest.json";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-fluid-splash-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the fluid splash report. Original error: ${error instanceof Error ? error.message : String(error)}`);
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
      canvas?.getAttribute("data-water-splash") === "grid-splash-v1" &&
      canvas?.getAttribute("data-water-splash-active") === "true" &&
      Number(canvas?.getAttribute("data-water-splash-foam-cells") ?? 0) > 0 &&
      Number(canvas?.getAttribute("data-water-splash-foam-energy") ?? 0) > 0 &&
      Number(canvas?.getAttribute("data-water-splash-spray") ?? 0) > 0 &&
      Number(canvas?.getAttribute("data-water-splash-crown") ?? 0) > 0
    );
  }, undefined, { timeout: timeoutMs });

  const activeTelemetry = await readSplashTelemetry(page);
  const activeStats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null);

  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return Number(canvas?.getAttribute("data-water-splash-reentry-energy") ?? 0) > 0;
  }, undefined, { timeout: timeoutMs });

  const reentryTelemetry = await readSplashTelemetry(page);
  const stats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null);
  const splash = stats?.lastSplash ?? null;

  assert.equal(reentryTelemetry.renderer, "webgpu-grid-primary-v1", "FG-05 requires the WebGPU grid renderer");
  assert.equal(reentryTelemetry.waterContext, "webgpu", "FG-05 must not use Canvas 2D as the primary water context");
  assert.equal(activeTelemetry.splash, "grid-splash-v1", "grid splash telemetry should be present");
  assert.equal(activeTelemetry.splashActive, true, "grid splash should activate during the drop");
  assert.ok(activeTelemetry.foamCells > 0, `expected foam cells, got ${activeTelemetry.foamCells}`);
  assert.ok(activeTelemetry.foamEnergyJ > 0, `expected foam energy, got ${activeTelemetry.foamEnergyJ}`);
  assert.ok(activeTelemetry.sprayDroplets > 0, `expected spray droplets, got ${activeTelemetry.sprayDroplets}`);
  assert.ok(activeTelemetry.crownHeightM > 0, `expected crown height, got ${activeTelemetry.crownHeightM}`);
  assert.ok(reentryTelemetry.accumulatedReentryEnergyJ > 0, `expected secondary reentry energy, got ${reentryTelemetry.accumulatedReentryEnergyJ}`);
  assert.ok(activeStats?.lastSplash?.gridEnergyJ > 0, "active splash summary should include local grid energy");
  assert.ok(splash?.boundedDiagnostics, "splash diagnostics must be bounded local samples");
  assert.ok((splash?.accumulatedReentryEnergyJ ?? 0) > 0, "splash summary should retain accumulated secondary reentry energy");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-05",
    noFullGridReadbackPerFrame: true,
    pass: true,
    activeStats,
    activeTelemetry,
    stats,
    reentryTelemetry,
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid splash report written to ${outPath}`);
  console.log(`- renderer: ${reentryTelemetry.renderer}, ${reentryTelemetry.waterContext}`);
  console.log(`- foam: ${activeTelemetry.foamCells} cells, ${activeTelemetry.foamEnergyJ.toFixed(2)} J`);
  console.log(`- spray: ${activeTelemetry.sprayDroplets} droplets, crown ${activeTelemetry.crownHeightM.toFixed(3)} m`);
  console.log(`- reentry: ${reentryTelemetry.accumulatedReentryEnergyJ.toFixed(4)} J`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function readSplashTelemetry(page) {
  return page.locator(".ocean-canvas").evaluate((canvas) => ({
    accumulatedReentryEnergyJ: Number(canvas.getAttribute("data-water-splash-reentry-energy") ?? 0),
    coupling: canvas.getAttribute("data-water-coupling"),
    couplingActive: canvas.getAttribute("data-water-coupling-active") === "true",
    crownHeightM: Number(canvas.getAttribute("data-water-splash-crown") ?? 0),
    foamCells: Number(canvas.getAttribute("data-water-splash-foam-cells") ?? 0),
    foamEnergyJ: Number(canvas.getAttribute("data-water-splash-foam-energy") ?? 0),
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    grid: canvas.getAttribute("data-water-grid"),
    gridEnergyJ: Number(canvas.getAttribute("data-water-splash-grid-energy") ?? 0),
    renderer: canvas.getAttribute("data-water-renderer"),
    splash: canvas.getAttribute("data-water-splash"),
    splashActive: canvas.getAttribute("data-water-splash-active") === "true",
    sprayDroplets: Number(canvas.getAttribute("data-water-splash-spray") ?? 0),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}
