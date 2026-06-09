import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, type Page } from "playwright";
import type { OceanPhysicsLiveSnapshot, OceanPhysicsScenarioConfig } from "../OceanPhysicsApp";
import {
  createFluidHighResolutionFoamSettlingCalibrationReport,
  type FoamSettlingLiveRun,
  type FoamSettlingSnapshotSample,
} from "./fluidHighResolutionFoamSettlingCalibration";
import type { FluidHighResolutionCalibrationFrontierReport } from "./fluidHighResolutionCalibrationFrontier";
import type { FluidInstalledHighResolutionTargetResidualsReport } from "./fluidInstalledHighResolutionTargetResiduals";

const timeoutMs = Number(process.env.OCEAN_LAB_HIGH_RESOLUTION_FOAM_SETTLING_TIMEOUT_MS || 120_000);
const root = process.cwd();
const outPath =
  process.env.OCEAN_LAB_HIGH_RESOLUTION_FOAM_SETTLING_OUT ||
  "reports/fluid-high-resolution-foam-settling-calibration-latest.json";
const sourceFrontierPath =
  process.env.OCEAN_LAB_HIGH_RESOLUTION_FOAM_SETTLING_FRONTIER_IN ||
  "docs/evidence/FG-50-high-resolution-calibration-frontier-2026-06-09.json";
const sourceTargetResidualsPath =
  process.env.OCEAN_LAB_HIGH_RESOLUTION_FOAM_SETTLING_TARGET_RESIDUALS_IN ||
  "docs/evidence/FG-48-installed-high-resolution-target-residuals-2026-06-08.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_HIGH_RESOLUTION_FOAM_SETTLING_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-foam-settling-"));
const userDataPath = await realpath(userDataRoot);

const calmSeawater = {
  currentSpeedMps: 0,
  waterDensityKgM3: 1025,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

const sourceFrontier = await readJson<FluidHighResolutionCalibrationFrontierReport>(sourceFrontierPath);
const sourceTargetResiduals = await readJson<FluidInstalledHighResolutionTargetResidualsReport>(sourceTargetResidualsPath);

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }

  electronApp = await electron.launch({
    ...(launchMode === "packaged-app" ? { executablePath: packagedExecutablePath } : { args: [root] }),
    env: {
      ...process.env,
      HARBORLINE_USER_DATA_DIR: userDataPath,
      OCEAN_LAB_EXPERIMENTAL_FLUID_GRID: "1024x576",
      OCEAN_LAB_FLUID_TIER: "ultra",
    },
    timeout: timeoutMs,
  });

  const page = await electronApp.firstWindow({ timeout: timeoutMs });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return (
      window.__oceanPhysicsScenarioControls &&
      window.__oceanPhysicsSnapshot?.version === "ocean-physics-live-v1" &&
      window.__fluidRuntimeGridOverride?.cellsX === 1024 &&
      window.__fluidRuntimeGridOverride?.cellsY === 576 &&
      window.__fluidGridPreferredTier === "ultra" &&
      window.__fluidGridCapabilityReport?.selectedTier === "ultra" &&
      window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
      window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
      canvas?.getAttribute("data-water-context") === "webgpu" &&
      canvas?.getAttribute("data-water-tier") === "ultra" &&
      canvas?.getAttribute("data-water-grid") === "1024x576" &&
      canvas?.getAttribute("data-water-pressure") === "bounded-pressure-gradient-live-v1" &&
      Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  const live = await runFoamSettling(page, { consoleErrors, pageErrors });
  const report = createFluidHighResolutionFoamSettlingCalibrationReport({
    live,
    sourceFrontier,
    sourceTargetResiduals,
  });

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Fluid high-resolution foam settling calibration report written to ${outPath}`);
  console.log(`- runtime: ${report.live.launchMode}, ${report.live.runtime.liveGrid}`);
  console.log(`- first buoyancy error: ${report.improvement.firstBuoyancyErrorRatio.toFixed(4)}`);
  console.log(`- settled buoyancy error: ${report.improvement.settledBuoyancyErrorRatio.toFixed(4)}`);
  console.log(`- improvement from first: ${report.improvement.buoyancyImprovementRatioFromFirst.toFixed(4)}`);
  console.log(`- improvement from FG-48 source residual: ${report.improvement.buoyancyImprovementRatioFromSourceResidual.toFixed(4)}`);

  assert.equal(report.gate, "G-FG-51", "FG-51 evidence must use the high-resolution foam settling calibration gate id");
  assert.deepEqual(report.failures, [], `FG-51 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function runFoamSettling(
  page: Page,
  errors: Pick<FoamSettlingLiveRun, "consoleErrors" | "pageErrors">
): Promise<FoamSettlingLiveRun> {
  await configureScenario(page, {
    dropHeightM: 1.35,
    ocean: calmSeawater,
    presetId: "foam-rescue-block",
    releaseAngleRad: 0.18,
    timeScale: 1,
  });
  await page.evaluate(() => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.drop();
  });

  const firstWithinTolerance = await waitForFoamSample(
    page,
    "first-within-tolerance",
    (snapshot) => snapshot.phase === "floating" && snapshot.equilibrium.withinTolerance && snapshot.settledAtS === null
  );
  const settledWindow = await waitForFoamSample(
    page,
    "settled-window",
    (snapshot) =>
      snapshot.phase === "floating" &&
      snapshot.equilibrium.withinTolerance &&
      snapshot.settledAtS !== null &&
      snapshot.timeS - snapshot.settledAtS >= 2.4
  );
  const runtime = await runtimeSummary(page);

  return {
    consoleErrors: errors.consoleErrors,
    firstWithinTolerance,
    launchMode,
    pageErrors: errors.pageErrors,
    runtime,
    settledWindow,
  };
}

async function configureScenario(page: Page, config: OceanPhysicsScenarioConfig): Promise<OceanPhysicsLiveSnapshot> {
  await page.evaluate((nextConfig) => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.configure(nextConfig);
  }, config);
  return waitForSnapshot(
    page,
    (snapshot) =>
      snapshot.phase === "ready" &&
      snapshot.spec.id === (config.specPatch?.id ?? config.presetId) &&
      Math.abs(snapshot.dropHeightM - (config.dropHeightM ?? snapshot.dropHeightM)) < 1e-6 &&
      Math.abs(snapshot.settings.waveHeightM - (config.ocean?.waveHeightM ?? snapshot.settings.waveHeightM)) < 1e-6 &&
      Math.abs(snapshot.settings.currentSpeedMps - (config.ocean?.currentSpeedMps ?? snapshot.settings.currentSpeedMps)) < 1e-6,
    `configure-${config.presetId ?? "custom"}`
  );
}

async function waitForFoamSample(
  page: Page,
  sampleKind: FoamSettlingSnapshotSample["sampleKind"],
  predicate: (snapshot: OceanPhysicsLiveSnapshot) => boolean
): Promise<FoamSettlingSnapshotSample> {
  const snapshot = await waitForSnapshot(page, predicate, sampleKind);
  const telemetry = await readCanvasTelemetry(page);
  return {
    angularSpeedRadps: snapshot.equilibrium.angularSpeedRadps,
    buoyancyErrorRatio: snapshot.equilibrium.buoyancyErrorRatio,
    draftErrorM: snapshot.equilibrium.draftErrorM,
    liveGrid: telemetry.grid,
    phase: snapshot.phase,
    pressureActive: telemetry.pressureActive,
    pressureNoFullGridReadback: telemetry.noFullGridReadbackPerFrame,
    renderer: telemetry.renderer,
    sampleKind,
    settledAtS: snapshot.settledAtS,
    settledWindowS: snapshot.settledAtS === null ? null : snapshot.timeS - snapshot.settledAtS,
    timeS: snapshot.timeS,
    verticalSpeedMps: snapshot.equilibrium.verticalSpeedMps,
    waterContext: telemetry.waterContext,
    waterFrames: telemetry.frames,
    withinTolerance: snapshot.equilibrium.withinTolerance,
  };
}

async function waitForSnapshot(
  page: Page,
  predicate: (snapshot: OceanPhysicsLiveSnapshot) => boolean,
  label: string
): Promise<OceanPhysicsLiveSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot: OceanPhysicsLiveSnapshot | null = null;
  while (Date.now() < deadline) {
    lastSnapshot = await page.evaluate(() => window.__oceanPhysicsScenarioControls?.snapshot?.() ?? window.__oceanPhysicsSnapshot ?? null) as OceanPhysicsLiveSnapshot | null;
    if (lastSnapshot && predicate(lastSnapshot)) return lastSnapshot;
    await page.waitForTimeout(80);
  }
  throw new Error(`Timed out waiting for ${label}. Last snapshot:\n${JSON.stringify(lastSnapshot, null, 2)}`);
}

type CanvasTelemetry = {
  frames: number;
  grid: string | null;
  noFullGridReadbackPerFrame: boolean;
  particlesActive: boolean;
  particlesNoFullGridReadbackPerFrame: boolean;
  pressureActive: boolean;
  renderer: string | null;
  waterContext: string | null;
};

async function readCanvasTelemetry(page: Page): Promise<CanvasTelemetry> {
  return page.locator(".ocean-canvas").evaluate((canvas) => ({
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    grid: canvas.getAttribute("data-water-grid"),
    noFullGridReadbackPerFrame: canvas.getAttribute("data-water-pressure-readback") === "true",
    particlesActive: canvas.getAttribute("data-water-particles-active") === "true",
    particlesNoFullGridReadbackPerFrame: canvas.getAttribute("data-water-particles-readback") === "true",
    pressureActive: canvas.getAttribute("data-water-pressure-active") === "true",
    renderer: canvas.getAttribute("data-water-renderer"),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}

async function runtimeSummary(page: Page): Promise<FoamSettlingLiveRun["runtime"]> {
  return page.evaluate(() => {
    const canvas = document.querySelector(".ocean-canvas");
    const capability = window.__fluidGridCapabilityReport;
    const runtimeGridOverride = window.__fluidRuntimeGridOverride;
    return {
      capabilityGrid: capability?.grid ? `${capability.grid.cellsX}x${capability.grid.cellsY}` : "missing",
      liveGrid: canvas?.getAttribute("data-water-grid") ?? null,
      preferredTier: window.__fluidGridPreferredTier ?? "missing",
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      runtimeGridOverride: runtimeGridOverride ? `${runtimeGridOverride.cellsX}x${runtimeGridOverride.cellsY}` : null,
      selectedTier: capability?.selectedTier ?? "missing",
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
      waterFrames: Number(canvas?.getAttribute("data-water-frames") ?? 0),
    };
  }) as Promise<FoamSettlingLiveRun["runtime"]>;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
