import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_LIVE_PARTICLE_TIMEOUT_MS || 60_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_LIVE_PARTICLE_OUT || "reports/fluid-live-particles-latest.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_LIVE_PARTICLE_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-live-particles-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the live particle report. Original error: ${error instanceof Error ? error.message : String(error)}`);
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
      Number(canvas.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: timeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return (
      canvas?.getAttribute("data-water-particles") === "localized-particle-splash-live-v1" &&
      canvas?.getAttribute("data-water-particles-active") === "true" &&
      Number(canvas.getAttribute("data-water-particles-count") ?? 0) > 0 &&
      Number(canvas.getAttribute("data-water-particles-feedback-samples") ?? 0) > 0 &&
      Number(canvas.getAttribute("data-water-particles-reentry-energy") ?? 0) > 0
    );
  }, undefined, { timeout: timeoutMs });

  const telemetry = await readLiveParticleTelemetry(page);
  const stats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null);
  const particle = stats?.lastParticleSplash ?? null;

  assert.equal(launchMode, "packaged-app", "FG-14 evidence must use the packaged app by default");
  assert.equal(telemetry.renderer, "webgpu-grid-primary-v1", "FG-14 requires the WebGPU grid renderer");
  assert.equal(telemetry.waterContext, "webgpu", "FG-14 must not use Canvas 2D as the primary water context");
  assert.equal(telemetry.particles, "localized-particle-splash-live-v1", "live particle feedback telemetry should be present");
  assert.equal(telemetry.particlesActive, true, "live particle feedback should activate during the drop");
  assert.equal(telemetry.noFullGridReadbackPerFrame, true, "live particle feedback must not need per-frame full-grid readback");
  assert.ok(telemetry.particleCount > 0, `expected particles, got ${telemetry.particleCount}`);
  assert.ok(telemetry.feedbackSamples > 0, `expected feedback samples, got ${telemetry.feedbackSamples}`);
  assert.ok(telemetry.reentryEnergyJ > 0, `expected reentry energy, got ${telemetry.reentryEnergyJ}`);
  assert.ok(telemetry.massFraction > 0 && telemetry.massFraction <= 0.35, `mass fraction out of bound: ${telemetry.massFraction}`);
  assert.ok(telemetry.momentumFraction > 0 && telemetry.momentumFraction <= 0.1, `momentum fraction out of bound: ${telemetry.momentumFraction}`);
  assert.ok(particle?.active, "render stats should retain the live particle feedback summary");
  assert.ok(particle?.renderIntensity > 0, "live particle feedback should influence renderer uniforms");
  assert.ok(particle?.gridFeedback?.foamInjection > 0, "live particle feedback should carry foam feedback");
  assert.ok(particle?.predictedCrownHeightM >= particle?.referenceSplashBand?.minM, "particle crown should stay inside the reference band");
  assert.ok(particle?.predictedCrownHeightM <= particle?.referenceSplashBand?.maxM, "particle crown should stay inside the reference band");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);
  assert.deepEqual(pageErrors, [], `Electron page errors: ${pageErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-14",
    launchMode,
    noFullGridReadbackPerFrame: true,
    pass: true,
    telemetry,
    particle,
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid live particle report written to ${outPath}`);
  console.log(`- runtime: ${launchMode}`);
  console.log(`- renderer: ${telemetry.renderer}, ${telemetry.waterContext}`);
  console.log(`- particles: ${telemetry.particleCount}, crown ${telemetry.crownHeightM.toFixed(3)} m`);
  console.log(`- mass/momentum: ${telemetry.massFraction.toFixed(4)} / ${telemetry.momentumFraction.toFixed(4)}`);
  console.log(`- feedback: ${telemetry.feedbackSamples} samples, reentry ${telemetry.reentryEnergyJ.toFixed(2)} J`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function readLiveParticleTelemetry(page) {
  return page.locator(".ocean-canvas").evaluate((canvas) => ({
    crownHeightM: Number(canvas.getAttribute("data-water-particles-crown") ?? 0),
    feedbackSamples: Number(canvas.getAttribute("data-water-particles-feedback-samples") ?? 0),
    foamInjection: Number(canvas.getAttribute("data-water-particles-foam") ?? 0),
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    massFraction: Number(canvas.getAttribute("data-water-particles-mass-fraction") ?? 0),
    momentumFraction: Number(canvas.getAttribute("data-water-particles-momentum-fraction") ?? 0),
    noFullGridReadbackPerFrame: canvas.getAttribute("data-water-particles-readback") === "true",
    particleCount: Number(canvas.getAttribute("data-water-particles-count") ?? 0),
    particles: canvas.getAttribute("data-water-particles"),
    particlesActive: canvas.getAttribute("data-water-particles-active") === "true",
    renderer: canvas.getAttribute("data-water-renderer"),
    reentryEnergyJ: Number(canvas.getAttribute("data-water-particles-reentry-energy") ?? 0),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}
