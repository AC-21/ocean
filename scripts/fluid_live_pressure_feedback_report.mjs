import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_PRESSURE_FEEDBACK_TIMEOUT_MS || 60_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_PRESSURE_FEEDBACK_OUT || "reports/fluid-pressure-feedback-latest.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_PRESSURE_FEEDBACK_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-pressure-feedback-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the pressure feedback report. Original error: ${error instanceof Error ? error.message : String(error)}`);
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
      Number(canvas.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: timeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    const coupling = window.__fluidGridCouplingForces;
    return (
      canvas?.getAttribute("data-water-pressure") === "bounded-pressure-gradient-live-v1" &&
      canvas?.getAttribute("data-water-pressure-active") === "true" &&
      Number(canvas.getAttribute("data-water-pressure-vertical-force") ?? 0) !== 0 &&
      Number(canvas.getAttribute("data-water-pressure-force-bound") ?? 0) > 0 &&
      coupling?.active === true &&
      Number(coupling.pressureVerticalForceDeltaN ?? 0) !== 0 &&
      canvas?.getAttribute("data-water-particles") === "localized-particle-splash-live-v1" &&
      canvas?.getAttribute("data-water-particles-active") === "true"
    );
  }, undefined, { timeout: timeoutMs });

  const telemetry = await readPressureFeedbackTelemetry(page);
  const stats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null);
  const consumedCoupling = await page.evaluate(() => window.__fluidGridCouplingForces ?? null);
  const pressure = stats?.lastPressure ?? null;
  const objectCoupling = stats?.lastCoupling ?? null;
  const particle = stats?.lastParticleSplash ?? null;

  assert.equal(launchMode, "packaged-app", "FG-17 evidence must use the packaged app by default");
  assert.equal(telemetry.renderer, "webgpu-grid-primary-v1", "FG-17 requires the WebGPU grid renderer");
  assert.equal(telemetry.waterContext, "webgpu", "FG-17 must not use Canvas 2D as the primary water context");
  assert.equal(telemetry.pressure, "bounded-pressure-gradient-live-v1", "live pressure telemetry should be present");
  assert.equal(telemetry.pressureActive, true, "live pressure telemetry should be active");
  assert.equal(telemetry.noFullGridReadbackPerFrame, true, "pressure feedback must not need per-frame full-grid readback");
  assert.ok(pressure?.active, "render stats should retain live pressure summary");
  assert.ok(consumedCoupling?.active, "physics loop should expose an active combined grid coupling");
  assert.ok(Math.abs(pressure.verticalForceDeltaN) > 0, "pressure vertical force should be nonzero");
  assert.ok(Math.abs(pressure.horizontalForceDeltaN) > 0, "pressure horizontal force should be nonzero");
  assert.ok(Math.abs(pressure.verticalForceDeltaN) <= pressure.forceBoundN, "pressure vertical force should stay within its bound");
  assert.ok(Math.abs(pressure.horizontalForceDeltaN) <= pressure.forceBoundN * 0.55, "pressure horizontal force should stay within its bound");
  assert.ok(Math.abs(consumedCoupling.pressureVerticalForceDeltaN ?? 0) > 0, "consumed coupling should include pressure vertical force");
  assert.ok(Math.abs(consumedCoupling.pressureHorizontalForceDeltaN ?? 0) > 0, "consumed coupling should include pressure horizontal force");
  assert.ok(Math.abs(consumedCoupling.verticalForceDeltaN) <= pressure.forceBoundN * 2.8, "combined vertical force should stay bounded");
  assert.ok(Math.abs(consumedCoupling.horizontalForceDeltaN) <= pressure.forceBoundN * 2.8, "combined horizontal force should stay bounded");
  assert.ok(Math.abs(consumedCoupling.gridVelocityMps) <= 4, "combined grid velocity should stay bounded");
  assert.ok(objectCoupling?.active, "object-grid coupling should remain active in the same drop path");
  assert.ok(particle?.active, "live particle feedback should remain active in the same drop path");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);
  assert.deepEqual(pageErrors, [], `Electron page errors: ${pageErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-17",
    launchMode,
    noFullGridReadbackPerFrame: true,
    pass: true,
    telemetry,
    pressure,
    objectCoupling,
    consumedCoupling,
    particle,
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid pressure feedback report written to ${outPath}`);
  console.log(`- runtime: ${launchMode}`);
  console.log(`- pressure force: vertical ${pressure.verticalForceDeltaN.toFixed(2)} N, horizontal ${pressure.horizontalForceDeltaN.toFixed(2)} N`);
  console.log(`- combined force: vertical ${consumedCoupling.verticalForceDeltaN.toFixed(2)} N, horizontal ${consumedCoupling.horizontalForceDeltaN.toFixed(2)} N`);
  console.log(`- bound: ${pressure.forceBoundN.toFixed(2)} N, grid velocity ${consumedCoupling.gridVelocityMps.toFixed(3)} m/s`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function readPressureFeedbackTelemetry(page) {
  return page.locator(".ocean-canvas").evaluate((canvas) => ({
    forceBoundN: Number(canvas.getAttribute("data-water-pressure-force-bound") ?? 0),
    gridVelocityMps: Number(canvas.getAttribute("data-water-pressure-grid-velocity") ?? 0),
    horizontalForceDeltaN: Number(canvas.getAttribute("data-water-pressure-horizontal-force") ?? 0),
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    noFullGridReadbackPerFrame: canvas.getAttribute("data-water-pressure-readback") === "true",
    particles: canvas.getAttribute("data-water-particles"),
    particlesActive: canvas.getAttribute("data-water-particles-active") === "true",
    pressure: canvas.getAttribute("data-water-pressure"),
    pressureActive: canvas.getAttribute("data-water-pressure-active") === "true",
    renderer: canvas.getAttribute("data-water-renderer"),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    verticalForceDeltaN: Number(canvas.getAttribute("data-water-pressure-vertical-force") ?? 0),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}
