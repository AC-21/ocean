import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_LIVE_PRESSURE_TIMEOUT_MS || 60_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_LIVE_PRESSURE_OUT || "reports/fluid-live-pressure-latest.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_LIVE_PRESSURE_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-live-pressure-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the live pressure report. Original error: ${error instanceof Error ? error.message : String(error)}`);
}

let electronApp;
try {
  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }
  electronApp = await electron.launch({
    ...(launchMode === "packaged-app" ? { executablePath: packagedExecutablePath } : { args: [root] }),
    env: {
      ...process.env,
      HARBORLINE_USER_DATA_DIR: userDataPath,
    },
    timeout: timeoutMs,
  });

  const page = await electronApp.firstWindow({ timeout: timeoutMs });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return (
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
      canvas?.getAttribute("data-water-context") === "webgpu" &&
      canvas?.getAttribute("data-water-pressure") === "bounded-pressure-gradient-live-v1" &&
      canvas?.getAttribute("data-water-pressure-active") === "true" &&
      Number(canvas.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: timeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return (
      canvas?.getAttribute("data-water-pressure") === "bounded-pressure-gradient-live-v1" &&
      canvas?.getAttribute("data-water-pressure-active") === "true" &&
      Number(canvas.getAttribute("data-water-pressure-impulse-energy") ?? 0) > 0 &&
      canvas?.getAttribute("data-water-particles") === "localized-particle-splash-live-v1" &&
      canvas?.getAttribute("data-water-particles-active") === "true" &&
      Number(canvas.getAttribute("data-water-particles-reentry-energy") ?? 0) > 0
    );
  }, undefined, { timeout: timeoutMs });

  const telemetry = await readLivePressureTelemetry(page);
  const stats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null);
  const pressure = stats?.lastPressure ?? null;
  const particle = stats?.lastParticleSplash ?? null;

  assert.equal(launchMode, "packaged-app", "FG-16 evidence must use the packaged app by default");
  assert.equal(telemetry.renderer, "webgpu-grid-primary-v1", "FG-16 requires the WebGPU grid renderer");
  assert.equal(telemetry.waterContext, "webgpu", "FG-16 must not use Canvas 2D as the primary water context");
  assert.equal(telemetry.pressure, "bounded-pressure-gradient-live-v1", "live pressure telemetry should be present");
  assert.equal(telemetry.pressureActive, true, "live pressure telemetry should be active");
  assert.equal(telemetry.noFullGridReadbackPerFrame, true, "live pressure must not need per-frame full-grid readback");
  assert.ok(telemetry.pressureGain > 0 && telemetry.pressureGain <= 0.08, `pressure gain out of bound: ${telemetry.pressureGain}`);
  assert.ok(telemetry.slopeLimit > 0 && telemetry.slopeLimit <= 0.5, `slope limit out of bound: ${telemetry.slopeLimit}`);
  assert.ok(telemetry.momentumLimit > 0 && telemetry.momentumLimit <= 1.5, `momentum limit out of bound: ${telemetry.momentumLimit}`);
  assert.ok(telemetry.cfl > 0 && telemetry.cfl <= 0.7, `CFL out of bound: ${telemetry.cfl}`);
  assert.ok(telemetry.pressureWorkJ > 0, `pressure work should be positive, got ${telemetry.pressureWorkJ}`);
  assert.ok(telemetry.impulseEnergyJ > 0, `drop should feed nonzero pressure impulse energy, got ${telemetry.impulseEnergyJ}`);
  assert.ok(telemetry.estimatedStorageBytes > 0, "pressure path should report storage budget");
  assert.ok(pressure?.active, "render stats should retain live pressure summary");
  assert.equal(pressure?.coupling, "bounded-pressure-gradient-live-v1", "render stats should name the live pressure solver");
  assert.equal(pressure?.noFullGridReadbackPerFrame, true, "render stats pressure summary must forbid full-grid readback");
  assert.ok(pressure?.bufferRoles?.includes("momentumX"), "pressure stats should include x momentum state");
  assert.ok(pressure?.bufferRoles?.includes("momentumY"), "pressure stats should include y momentum state");
  assert.ok(particle?.active, "FG-16 should keep live particle feedback active during the same drop path");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);
  assert.deepEqual(pageErrors, [], `Electron page errors: ${pageErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-16",
    launchMode,
    noFullGridReadbackPerFrame: true,
    pass: true,
    telemetry,
    pressure,
    particle,
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid live pressure report written to ${outPath}`);
  console.log(`- runtime: ${launchMode}`);
  console.log(`- renderer: ${telemetry.renderer}, ${telemetry.waterContext}`);
  console.log(`- pressure: gain ${telemetry.pressureGain.toFixed(3)}, slope ${telemetry.slopeLimit.toFixed(3)}, CFL ${telemetry.cfl.toFixed(3)}`);
  console.log(`- work/impulse: ${telemetry.pressureWorkJ.toFixed(2)} J / ${telemetry.impulseEnergyJ.toFixed(2)} J`);
  console.log(`- particles: ${telemetry.particleCount} live droplets`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function readLivePressureTelemetry(page) {
  return page.locator(".ocean-canvas").evaluate((canvas) => ({
    cfl: Number(canvas.getAttribute("data-water-pressure-cfl") ?? 0),
    estimatedStorageBytes: Number(canvas.getAttribute("data-water-pressure-storage") ?? 0),
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    grid: canvas.getAttribute("data-water-grid"),
    impulseEnergyJ: Number(canvas.getAttribute("data-water-pressure-impulse-energy") ?? 0),
    momentumLimit: Number(canvas.getAttribute("data-water-pressure-momentum-limit") ?? 0),
    noFullGridReadbackPerFrame: canvas.getAttribute("data-water-pressure-readback") === "true",
    particleCount: Number(canvas.getAttribute("data-water-particles-count") ?? 0),
    particles: canvas.getAttribute("data-water-particles"),
    particlesActive: canvas.getAttribute("data-water-particles-active") === "true",
    pressure: canvas.getAttribute("data-water-pressure"),
    pressureActive: canvas.getAttribute("data-water-pressure-active") === "true",
    pressureGain: Number(canvas.getAttribute("data-water-pressure-gain") ?? 0),
    pressureWorkJ: Number(canvas.getAttribute("data-water-pressure-work") ?? 0),
    renderer: canvas.getAttribute("data-water-renderer"),
    slopeLimit: Number(canvas.getAttribute("data-water-pressure-slope-limit") ?? 0),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}
