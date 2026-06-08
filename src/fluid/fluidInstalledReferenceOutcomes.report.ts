import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, lstat, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { _electron as electron, type Page } from "playwright";
import type { OceanPhysicsLiveSnapshot, OceanPhysicsScenarioConfig } from "../OceanPhysicsApp";
import type { GridFluidCouplingForces } from "../physicsOcean";
import type { FluidDefaultProfileCalibrationReport } from "./fluidDefaultProfileCalibration";
import { createFluidInstalledReferenceOutcomesReport } from "./fluidInstalledReferenceOutcomes";
import {
  createFluidUltraReferenceOutcomesReport,
  type FluidReferenceCanvasTelemetry,
  type FluidReferenceOutcomeCase,
  type FluidReferenceOutcomeComparison,
} from "./fluidUltraReferenceOutcomes";
import type { FluidFrameLoopStats } from "./fluidFrameLoop";
import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidWaterRenderStats } from "./fluidWaterRenderer";
import type { FluidCapabilityReport } from "./webgpuCapability";

const execFileAsync = promisify(execFile);
const timeoutMs = Number(process.env.OCEAN_LAB_INSTALLED_REFERENCE_TIMEOUT_MS || 90_000);
const outPath = process.env.OCEAN_LAB_INSTALLED_REFERENCE_OUT || "reports/fluid-installed-reference-outcomes-latest.json";
const defaultProfileEvidencePath =
  process.env.OCEAN_LAB_INSTALLED_REFERENCE_DEFAULT_PROFILE_IN || "reports/fluid-default-profile-calibration-latest.json";
const appName = "Ocean Impact Lab";
const launcherPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_LAUNCHER_PATH || path.join(homedir(), "Desktop", `${appName}.app`));
const launcherExecutablePath = path.join(launcherPath, "Contents", "MacOS", appName);
const expectedInstalledBundle =
  process.env.OCEAN_LAB_DESKTOP_INSTALLED_BUNDLE ||
  path.join(homedir(), "Applications", "Ocean Impact Lab Builds", `${appName}-darwin-${process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch}`, `${appName}.app`);

const calmSeawater = {
  currentSpeedMps: 0,
  waterDensityKgM3: 1025,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

const defaultProfileEvidence = await readJson<FluidDefaultProfileCalibrationReport>(defaultProfileEvidencePath);
await access(launcherExecutablePath);
const launcherTargetPath = await desktopLauncherTargetPath();
const launchEnv = sanitizedLaunchEnv();
delete launchEnv.HARBORLINE_USER_DATA_DIR;
delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER;
delete launchEnv.OCEAN_LAB_FLUID_TIER;

await quitAppIfRunning();
let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  electronApp = await electron.launch({
    executablePath: launcherExecutablePath,
    env: launchEnv,
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
      window.__fluidGridTierSelection?.mode === "calibrated-auto" &&
      window.__fluidGridTierSelection?.requestedTier === "auto" &&
      window.__fluidGridTierSelection?.calibratedTier === "ultra" &&
      window.__fluidGridPreferredTier === "ultra" &&
      window.__fluidGridCapabilityReport?.selectedTier === "ultra" &&
      window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
      window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
      canvas?.getAttribute("data-water-context") === "webgpu" &&
      canvas?.getAttribute("data-water-tier") === "ultra" &&
      canvas?.getAttribute("data-water-grid") === "768x432" &&
      canvas?.getAttribute("data-water-pressure") === "bounded-pressure-gradient-live-v1" &&
      Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  const comparisons: FluidReferenceOutcomeComparison[] = [];
  const cases: FluidReferenceOutcomeCase[] = [];

  const dropCase = await runDropCase(page, {
    category: "drop+splash",
    config: {
      dropHeightM: 8,
      ocean: calmSeawater,
      presetId: "concrete-cube",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    id: "live-concrete-drop-splash-pressure",
    waitFor: (snapshot) => snapshot.impact !== null && snapshot.timeS >= snapshot.impact.atS + 0.08,
  });
  if (!dropCase.snapshot.impact) throw new Error("Concrete drop case finished without an impact snapshot.");
  const dropImpact = dropCase.snapshot.impact;
  const dropSpeedBand = freeFallSpeedBand(dropCase.snapshot.dropHeightM, dropCase.snapshot.settings.gravity);
  const splashBand = splashHeightBand(dropImpact.impactSpeedMps, dropCase.snapshot.settings.gravity, 0.72);
  comparisons.push(
    comparison("live-drop-speed-reference", "drop", dropImpact.impactSpeedMps, dropSpeedBand.min, dropSpeedBand.max, "m/s"),
    comparison("live-splash-height-reference", "splash", dropImpact.splashHeightM, splashBand.min, splashBand.max, "m")
  );
  cases.push(dropCase);

  const iceCase = await runDropCase(page, {
    category: "float",
    config: {
      dropHeightM: 1,
      ocean: calmSeawater,
      presetId: "ice-block",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    id: "live-ice-static-draft",
    waitFor: (snapshot) => snapshot.phase === "floating" && Math.abs(snapshot.equilibrium.draftErrorM ?? Number.POSITIVE_INFINITY) <= 0.055,
  });
  const iceExpected = 917 / calmSeawater.waterDensityKgM3;
  comparisons.push(
    comparison(
      "live-ice-equilibrium-submerged-fraction-reference",
      "float",
      iceCase.snapshot.diagnostics.equilibriumSubmergedFraction,
      iceExpected - 0.035,
      iceExpected + 0.035,
      "fraction"
    ),
    comparison(
      "live-ice-hydrostatic-draft-error",
      "float",
      Math.abs(iceCase.snapshot.equilibrium.draftErrorM ?? Number.POSITIVE_INFINITY),
      0,
      0.055,
      "m"
    )
  );
  cases.push(iceCase);

  const foamCase = await runDropCase(page, {
    category: "damping",
    config: {
      dropHeightM: 1.35,
      ocean: calmSeawater,
      presetId: "foam-rescue-block",
      releaseAngleRad: 0.18,
      timeScale: 1,
    },
    id: "live-foam-damped-settling",
    waitFor: (snapshot) => snapshot.phase === "floating" && snapshot.equilibrium.withinTolerance,
  });
  comparisons.push(
    comparison("live-foam-settled-draft-error", "damping", Math.abs(foamCase.snapshot.equilibrium.draftErrorM ?? Number.POSITIVE_INFINITY), 0, 0.055, "m"),
    comparison("live-foam-settled-buoyancy-error", "damping", foamCase.snapshot.equilibrium.buoyancyErrorRatio, 0, 0.08, "ratio"),
    comparison("live-foam-equilibrium-window", "damping", foamCase.snapshot.equilibrium.withinTolerance ? 1 : 0, 1, 1, "boolean")
  );
  cases.push(foamCase);

  const terminalCase = await runDropCase(page, {
    category: "sink",
    config: {
      dropHeightM: 1,
      ocean: { ...calmSeawater, waterDepthM: 22 },
      presetId: "concrete-cube",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    id: "live-concrete-sink-terminal-band",
    waitFor: (snapshot) => (snapshot.phase === "sinking" || snapshot.phase === "sank") && snapshot.timeS >= 2.2,
  });
  comparisons.push(
    comparison(
      "live-concrete-terminal-speed-reference",
      "sink",
      terminalCase.snapshot.diagnostics.terminalVelocityMps ?? Number.NaN,
      1,
      8,
      "m/s"
    ),
    comparison("live-concrete-sink-phase", "sink", terminalCase.snapshot.phase === "sinking" || terminalCase.snapshot.phase === "sank" ? 1 : 0, 1, 1, "boolean")
  );
  cases.push(terminalCase);

  const smallLeak = await configureScenario(page, {
    dropHeightM: 1,
    ocean: calmSeawater,
    presetId: "leaky-steel-drum",
    releaseAngleRad: 0,
    specPatch: {
      airReliefCoefficient: 0.992,
      leakAreaM2: 0.000006,
      leakDischargeCoefficient: 0.62,
      vented: false,
    },
    timeScale: 1,
  });
  const largeLeak = await configureScenario(page, {
    dropHeightM: 1,
    ocean: calmSeawater,
    presetId: "leaky-steel-drum",
    releaseAngleRad: 0,
    specPatch: {
      airReliefCoefficient: 0.992,
      leakAreaM2: 0.00003,
      leakDischargeCoefficient: 0.62,
      vented: false,
    },
    timeScale: 1,
  });
  const leakRatio = (largeLeak.prediction.secondsUntilSink ?? Number.POSITIVE_INFINITY) / Math.max(1, smallLeak.prediction.secondsUntilSink ?? Number.POSITIVE_INFINITY);
  comparisons.push(comparison("live-leaky-drum-sink-time-ratio-reference", "sink", leakRatio, 0, 0.55, "ratio"));
  cases.push({
    category: "sink",
    id: "live-leaky-drum-sink-time-prediction",
    largeLeakSecondsUntilSink: largeLeak.prediction.secondsUntilSink,
    pass: leakRatio >= 0 && leakRatio <= 0.55,
    smallLeakSecondsUntilSink: smallLeak.prediction.secondsUntilSink,
    snapshot: largeLeak,
    telemetry: await readCanvasTelemetry(page),
  });

  const finalTelemetry = await readCanvasTelemetry(page);
  const finalStats = (await page.evaluate(() => window.__fluidWaterRenderStats ?? null)) as FluidWaterRenderStats | null;
  const frameLoop = (await page.evaluate(() => window.__fluidFrameLoopStats ?? null)) as FluidFrameLoopStats | null;
  const consumedCoupling = (await page.evaluate(() => window.__fluidGridCouplingForces ?? null)) as GridFluidCouplingForces | null;
  const capability = (await page.evaluate(() => window.__fluidGridCapabilityReport ?? null)) as FluidCapabilityReport | null;
  const preferredTier = (await page.evaluate(() => window.__fluidGridPreferredTier ?? "auto")) as FluidGridTierId | "auto";
  const runtimeSelection = await page.locator(".ocean-canvas").evaluate((canvas) => ({
    capabilitySelectedTier: window.__fluidGridCapabilityReport?.selectedTier ?? null,
    grid: canvas.getAttribute("data-water-grid"),
    renderer: canvas.getAttribute("data-water-renderer"),
    selectedGrid: {
      cellsX: window.__fluidGridCapabilityReport?.grid?.cellsX ?? 0,
      cellsY: window.__fluidGridCapabilityReport?.grid?.cellsY ?? 0,
    },
    selectedTier: canvas.getAttribute("data-water-tier"),
    selection: window.__fluidGridTierSelection ?? null,
    waterContext: canvas.getAttribute("data-water-context"),
  }));

  const coreReference = createFluidUltraReferenceOutcomesReport({
    capability: capability
      ? {
          grid: {
            cellsX: capability.grid.cellsX,
            cellsY: capability.grid.cellsY,
          },
          selectedTier: capability.selectedTier,
        }
      : null,
    cases,
    comparisons,
    consoleErrors,
    consumedCoupling,
    finalStats,
    frameLoop,
    generatedAt: new Date().toISOString(),
    launchMode: "packaged-app",
    noFullGridReadbackPerFrame: true,
    pageErrors,
    preferredTier,
    selectedGrid: {
      cellsX: capability?.grid.cellsX ?? 0,
      cellsY: capability?.grid.cellsY ?? 0,
    },
    selectedTier: capability?.selectedTier ?? "low",
    telemetry: finalTelemetry,
  });

  const report = createFluidInstalledReferenceOutcomesReport({
    coreReference,
    defaultProfileEvidence: {
      gate: defaultProfileEvidence.gate,
      grid: defaultProfileEvidence.runtimeProbe.grid,
      mode: defaultProfileEvidence.runtimeProbe.selection?.mode ?? null,
      pass: defaultProfileEvidence.pass,
      selectedTier: defaultProfileEvidence.runtimeProbe.selectedTier,
      sourcePath: defaultProfileEvidencePath,
    },
    generatedAt: new Date().toISOString(),
    launchEnv: {
      envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
      envRequestedTierPresent: Boolean(launchEnv.OCEAN_LAB_FLUID_TIER),
      envUserDataOverridePresent: Boolean(launchEnv.HARBORLINE_USER_DATA_DIR),
    },
    launcher: {
      executablePath: launcherExecutablePath,
      path: launcherPath,
      resolvesToInstalledBundle: launcherTargetPath === expectedInstalledBundle,
      targetPath: launcherTargetPath,
    },
    runtimeSelection,
  });

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid installed reference outcomes report written to ${outPath}`);
  console.log(`- launcher: ${report.launcher.path}`);
  console.log(`- selection: ${report.summary.mode} -> ${report.summary.selectedTier} (${report.summary.grid})`);
  console.log(`- cases: ${report.summary.caseCount}, comparisons: ${report.summary.comparisonCount}`);
  console.log(`- drop speed: ${dropImpact.impactSpeedMps.toFixed(3)} m/s`);
  console.log(`- splash: ${dropImpact.splashHeightM.toFixed(3)} m`);
  console.log(`- ice submerged: ${iceCase.snapshot.diagnostics.submergedFraction.toFixed(4)}`);
  console.log(`- foam settled: ${foamCase.snapshot.settledAtS?.toFixed(2) ?? "not-settled"} s`);
  console.log(`- leak ratio: ${leakRatio.toFixed(4)}`);
  assert.equal(report.gate, "G-FG-36", "FG-36 evidence must use the installed reference outcomes gate id");
  assert.deepEqual(report.failures, [], `FG-36 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
}

async function quitAppIfRunning() {
  await execFileAsync("osascript", ["-e", `tell application "${appName}" to quit`]).catch(() => undefined);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const running = await execFileAsync("pgrep", ["-afil", appName])
      .then(({ stdout }) => stdout.includes(`${expectedInstalledBundle}/Contents/MacOS/${appName}`))
      .catch(() => false);
    if (!running) return;
    await delay(250);
  }
}

async function runDropCase(
  page: Page,
  options: {
    category: FluidReferenceOutcomeCase["category"];
    config: OceanPhysicsScenarioConfig;
    id: string;
    waitFor: (snapshot: OceanPhysicsLiveSnapshot) => boolean;
  }
): Promise<FluidReferenceOutcomeCase> {
  await configureScenario(page, options.config);
  await page.evaluate(() => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.drop();
  });
  const snapshot = await waitForSnapshot(page, options.waitFor, options.id);
  const telemetry = await readCanvasTelemetry(page);
  const stats = (await page.evaluate(() => window.__fluidWaterRenderStats ?? null)) as FluidWaterRenderStats | null;
  const consumedCoupling = (await page.evaluate(() => window.__fluidGridCouplingForces ?? null)) as GridFluidCouplingForces | null;
  const frameLoop = (await page.evaluate((caseId) => {
    const stats = window.__fluidFrameLoopStats;
    return stats ? { ...stats, caseId } : null;
  }, options.id)) as (FluidFrameLoopStats & { caseId: string }) | null;
  return {
    category: options.category,
    consumedCoupling,
    frameLoop,
    id: options.id,
    pass: true,
    snapshot,
    stats,
    telemetry,
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

async function waitForSnapshot(
  page: Page,
  predicate: (snapshot: OceanPhysicsLiveSnapshot) => boolean,
  label: string
): Promise<OceanPhysicsLiveSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot: OceanPhysicsLiveSnapshot | null = null;
  while (Date.now() < deadline) {
    lastSnapshot = (await page.evaluate(
      () => window.__oceanPhysicsScenarioControls?.snapshot?.() ?? window.__oceanPhysicsSnapshot ?? null
    )) as OceanPhysicsLiveSnapshot | null;
    if (lastSnapshot && predicate(lastSnapshot)) return lastSnapshot;
    await page.waitForTimeout(80);
  }
  throw new Error(`Timed out waiting for ${label}. Last snapshot:\n${JSON.stringify(lastSnapshot, null, 2)}`);
}

async function readCanvasTelemetry(page: Page): Promise<FluidReferenceCanvasTelemetry> {
  return page.locator(".ocean-canvas").evaluate((canvas) => ({
    forceBoundN: Number(canvas.getAttribute("data-water-pressure-force-bound") ?? 0),
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    grid: canvas.getAttribute("data-water-grid"),
    noFullGridReadbackPerFrame: canvas.getAttribute("data-water-pressure-readback") === "true",
    particles: canvas.getAttribute("data-water-particles"),
    particlesActive: canvas.getAttribute("data-water-particles-active") === "true",
    pressure: canvas.getAttribute("data-water-pressure"),
    pressureActive: canvas.getAttribute("data-water-pressure-active") === "true",
    renderer: canvas.getAttribute("data-water-renderer"),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    verticalPressureForceN: Number(canvas.getAttribute("data-water-pressure-vertical-force") ?? 0),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}

function comparison(
  id: string,
  category: FluidReferenceOutcomeComparison["category"],
  actual: number,
  min: number,
  max: number,
  unit: string
): FluidReferenceOutcomeComparison {
  return {
    actual,
    category,
    expected: { max, min },
    id,
    pass: Number.isFinite(actual) && actual >= min && actual <= max,
    unit,
  };
}

function freeFallSpeedBand(dropHeightM: number, gravity: number): { max: number; min: number } {
  const max = Math.sqrt(2 * gravity * dropHeightM);
  return {
    max,
    min: max * 0.88,
  };
}

function splashHeightBand(impactSpeedMps: number, gravity: number, objectHeightM: number): { max: number; min: number } {
  const ballisticHead = impactSpeedMps ** 2 / gravity;
  return {
    max: 0.19 * ballisticHead + 0.9 * objectHeightM,
    min: 0.045 * ballisticHead + 0.18 * objectHeightM,
  };
}

async function desktopLauncherTargetPath(): Promise<string | null> {
  const stat = await lstat(launcherPath);
  if (!stat.isSymbolicLink()) return null;
  return path.resolve(path.dirname(launcherPath), await readlink(launcherPath));
}

function sanitizedLaunchEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
