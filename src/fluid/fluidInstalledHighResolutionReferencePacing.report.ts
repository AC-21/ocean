import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, lstat, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { _electron as electron, type Page } from "playwright";
import type { OceanPhysicsLiveSnapshot, OceanPhysicsScenarioConfig } from "../OceanPhysicsApp";
import type { GridFluidCouplingForces } from "../physicsOcean";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
import {
  createFluidExperimentalReferenceOutcomesReport,
} from "./fluidExperimentalReferenceOutcomes";
import type { FluidFrameLoopStats } from "./fluidFrameLoop";
import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidHighResolutionCalibrationReport } from "./fluidHighResolutionCalibration";
import {
  createFluidInstalledHighResolutionReferencePacingReport,
  type FluidInstalledHighResolutionReferencePacingReport,
  type FluidInstalledHighResolutionReferencePacingScenarioInput,
  type InstalledHighResolutionReferencePacingSample,
} from "./fluidInstalledHighResolutionReferencePacing";
import {
  calibrationProfileForAdaptiveReport,
  calibrationProfileWithExperimentalRuntimeGrid,
  validateFluidCalibrationProfile,
} from "./fluidPersistedCalibration";
import type {
  FluidReferenceCanvasTelemetry,
  FluidReferenceOutcomeCase,
  FluidReferenceOutcomeComparison,
} from "./fluidUltraReferenceOutcomes";
import type { FluidWaterRenderStats, FluidWaterRuntimeGridDimensions } from "./fluidWaterRenderer";
import type { FluidCapabilityReport } from "./webgpuCapability";

const require = createRequire(import.meta.url);
const { createHarborlineStorage, desktopStorageFiles } = require("../../electron/storage.cjs") as {
  createHarborlineStorage: (options: { app: { getName: () => string; getPath: (name: string) => string; getVersion: () => string } }) => {
    basePath: string;
    readText: (fileName: string) => Promise<string | null>;
    writeText: (fileName: string, value: string) => Promise<void>;
  };
  desktopStorageFiles: {
    fluidCalibrationProfile: string;
  };
};

const execFileAsync = promisify(execFile);
const timeoutMs = Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_TIMEOUT_MS || 180_000);
const outPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_OUT ||
  "reports/fluid-installed-high-resolution-reference-pacing-latest.json";
const adaptiveTierPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const capabilityPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_CAPABILITY_IN || "docs/evidence/FG-01-fluid-capability-2026-06-07.json";
const experimentalReferencePath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_REFERENCE_IN ||
  "docs/evidence/FG-40-experimental-reference-outcomes-2026-06-08.json";
const highResolutionCalibrationPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_CALIBRATION_IN ||
  "docs/evidence/FG-41-high-resolution-calibration-2026-06-08.json";
const appPackage = await readJson<{ version: string }>("package.json");
const appName = "Ocean Impact Lab";
const launcherPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_LAUNCHER_PATH || path.join(homedir(), "Desktop", `${appName}.app`));
const launcherExecutablePath = path.join(launcherPath, "Contents", "MacOS", appName);
const expectedInstalledBundle =
  process.env.OCEAN_LAB_DESKTOP_INSTALLED_BUNDLE ||
  path.join(homedir(), "Applications", "Ocean Impact Lab Builds", `${appName}-darwin-${process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch}`, `${appName}.app`);
const defaultUserDataPath = path.join(homedir(), "Library", "Application Support", appName);

const calmSeawater = {
  currentSpeedMps: 0,
  waterDensityKgM3: 1025,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

const referenceScenarios: Array<{
  categories: FluidReferenceOutcomeComparison["category"][];
  config: OceanPhysicsScenarioConfig;
  durationMs: number;
  expectedParticles: boolean;
  id: string;
  label: string;
  referenceCaseId: string;
}> = [
  {
    categories: ["drop", "splash"],
    config: {
      dropHeightM: 8,
      ocean: calmSeawater,
      presetId: "concrete-cube",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_CONCRETE_MS || 3_800),
    expectedParticles: true,
    id: "high-resolution-concrete-drop-splash-pacing",
    label: "Concrete drop and splash installed high-resolution pacing",
    referenceCaseId: "live-concrete-drop-splash-pressure",
  },
  {
    categories: ["float"],
    config: {
      dropHeightM: 1,
      ocean: calmSeawater,
      presetId: "ice-block",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_ICE_MS || 4_200),
    expectedParticles: false,
    id: "high-resolution-ice-float-pacing",
    label: "Ice float installed high-resolution pacing",
    referenceCaseId: "live-ice-static-draft",
  },
  {
    categories: ["damping"],
    config: {
      dropHeightM: 1.35,
      ocean: calmSeawater,
      presetId: "foam-rescue-block",
      releaseAngleRad: 0.18,
      timeScale: 1,
    },
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_FOAM_MS || 6_500),
    expectedParticles: true,
    id: "high-resolution-foam-damping-pacing",
    label: "Foam damping installed high-resolution pacing",
    referenceCaseId: "live-foam-damped-settling",
  },
  {
    categories: ["sink"],
    config: {
      dropHeightM: 1,
      ocean: { ...calmSeawater, waterDepthM: 22 },
      presetId: "concrete-cube",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_SINK_MS || 4_200),
    expectedParticles: true,
    id: "high-resolution-concrete-sink-pacing",
    label: "Concrete sink installed high-resolution pacing",
    referenceCaseId: "live-concrete-sink-terminal-band",
  },
  {
    categories: ["sink"],
    config: {
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
    },
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_REFERENCE_PACING_LEAK_MS || 3_800),
    expectedParticles: true,
    id: "high-resolution-leaky-drum-sink-pacing",
    label: "Leaky drum sink installed high-resolution pacing",
    referenceCaseId: "live-leaky-drum-sink-time-prediction",
  },
];

const adaptiveSource = await readJson<FluidAdaptiveTierReport>(adaptiveTierPath);
const capabilitySource = await readJson<FluidCapabilityReport>(capabilityPath);
const experimentalReferenceSource = await readJson<ReturnType<typeof createFluidExperimentalReferenceOutcomesReport>>(experimentalReferencePath);
const sourceCalibration = await readJson<FluidHighResolutionCalibrationReport>(highResolutionCalibrationPath);
const baseProfile = calibrationProfileForAdaptiveReport(adaptiveSource, new Date().toISOString(), {
  appVersion: appPackage.version,
  capabilityReport: capabilitySource,
});
const profile = calibrationProfileWithExperimentalRuntimeGrid(baseProfile, experimentalReferenceSource);
const profileValidationFailures = validateFluidCalibrationProfile(profile, { expectedAppVersion: appPackage.version });
assert.deepEqual(profileValidationFailures, [], `Installed high-resolution profile failed validation:\n${profileValidationFailures.join("\n")}`);

const storage = createHarborlineStorage({
  app: {
    getName: () => appName,
    getPath: (name: string) => {
      if (name === "logs") return path.join(defaultUserDataPath, "logs");
      if (name === "userData") return defaultUserDataPath;
      throw new Error(`Unexpected app path: ${name}`);
    },
    getVersion: () => appPackage.version,
  },
});
const serializedProfile = `${JSON.stringify(profile, null, 2)}\n`;
await storage.writeText(desktopStorageFiles.fluidCalibrationProfile, serializedProfile);
const savedProfileRaw = await storage.readText(desktopStorageFiles.fluidCalibrationProfile);
assert.ok(savedProfileRaw?.includes("\"runtimeGrid\""), "installed high-resolution calibration profile did not include runtimeGrid");

await access(launcherExecutablePath);
const launcherTargetPath = await desktopLauncherTargetPath();
const launchEnv = sanitizedLaunchEnv();
delete launchEnv.HARBORLINE_USER_DATA_DIR;
delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER;
delete launchEnv.OCEAN_LAB_EXPERIMENTAL_FLUID_GRID;
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
    const stage = document.querySelector(".simulation-stage");
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
      window.__fluidRuntimeGridOverride?.cellsX === 1024 &&
      window.__fluidRuntimeGridOverride?.cellsY === 576 &&
      stage?.getAttribute("data-fluid-runtime-grid-override") === "1024x576" &&
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
      canvas?.getAttribute("data-water-context") === "webgpu" &&
      canvas?.getAttribute("data-water-tier") === "ultra" &&
      canvas?.getAttribute("data-water-grid") === "1024x576" &&
      canvas?.getAttribute("data-water-pressure") === "bounded-pressure-gradient-live-v1" &&
      Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  const runtime = await page.evaluate(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return {
      capabilityGrid: {
        cellsX: window.__fluidGridCapabilityReport?.grid?.cellsX ?? 0,
        cellsY: window.__fluidGridCapabilityReport?.grid?.cellsY ?? 0,
      },
      liveGrid: canvas?.getAttribute("data-water-grid") ?? null,
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      runtimeGridOverride: window.__fluidRuntimeGridOverride ?? null,
      selectedTier: window.__fluidGridCapabilityReport?.selectedTier ?? "missing",
      selection: window.__fluidGridTierSelection ?? null,
      tier: canvas?.getAttribute("data-water-tier") ?? null,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
      waterFrames: Number(canvas?.getAttribute("data-water-frames") ?? 0),
    };
  }) as FluidInstalledHighResolutionReferencePacingReport["runtime"];

  const coreReference = await runHighResolutionReferenceCases(page, consoleErrors, pageErrors);
  const scenarios: FluidInstalledHighResolutionReferencePacingScenarioInput[] = [];
  for (const scenario of referenceScenarios) {
    scenarios.push(await measureReferenceScenario(page, scenario));
  }

  const report = createFluidInstalledHighResolutionReferencePacingReport({
    coreReference,
    generatedAt: new Date().toISOString(),
    installedProfile: {
      pass: profile.pass,
      runtimeGrid: profile.runtimeGrid,
      schema: profile.schema,
      selectedTier: profile.selectedTier,
      sourceGate: profile.sourceGate,
    },
    launchEnv: {
      envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
      envExperimentalGridPresent: Boolean(launchEnv.OCEAN_LAB_EXPERIMENTAL_FLUID_GRID),
      envRequestedTierPresent: Boolean(launchEnv.OCEAN_LAB_FLUID_TIER),
      envUserDataOverridePresent: Boolean(launchEnv.HARBORLINE_USER_DATA_DIR),
    },
    launcher: {
      executablePath: launcherExecutablePath,
      path: launcherPath,
      resolvesToInstalledBundle: launcherTargetPath === expectedInstalledBundle,
      targetPath: launcherTargetPath,
    },
    runtime,
    scenarios,
    sourceCalibration,
    storage: {
      defaultStorage: storage.basePath === path.join(defaultUserDataPath, "harborline-game"),
      fileName: desktopStorageFiles.fluidCalibrationProfile,
      persistedRawBytes: Buffer.byteLength(savedProfileRaw ?? "", "utf8"),
      profileHadRuntimeGrid: Boolean(profile.runtimeGrid),
      readByMainProcess:
        runtime.selection?.mode === "calibrated-auto" &&
        runtime.runtimeGridOverride?.cellsX === 1024 &&
        runtime.liveGrid === "1024x576",
      storageBasePath: storage.basePath,
      verificationReadMatched: savedProfileRaw === serializedProfile,
    },
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(compactEvidenceReport(report), null, 2)}\n`);
  console.log(`Fluid installed high-resolution reference pacing report written to ${outPath}`);
  console.log(`- source calibration: ${report.sourceCalibration.gate}, ${report.sourceCalibration.liveGrid}`);
  console.log(`- storage: ${report.storage.storageBasePath}`);
  console.log(`- runtime: ${report.runtime.selection?.mode ?? "missing"} -> ${report.runtime.selectedTier} (${report.runtime.liveGrid})`);
  console.log(`- reference: ${report.summary.referenceCaseCount} cases, ${report.summary.referenceComparisonCount} comparisons`);
  for (const scenario of report.scenarios) {
    console.log(
      `- ${scenario.id}: ${scenario.framePacing.averageFps.toFixed(1)} FPS, p95 ${scenario.framePacing.p95FrameMs.toFixed(2)} ms, p99 ${scenario.framePacing.p99FrameMs.toFixed(2)} ms, dropped ${(scenario.framePacing.droppedFrameRatio * 100).toFixed(1)}%`
    );
  }
  assert.equal(report.gate, "G-FG-42", "FG-42 evidence must use the installed high-resolution reference pacing gate id");
  assert.deepEqual(report.failures, [], `FG-42 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
}

async function runHighResolutionReferenceCases(page: Page, consoleErrors: string[], pageErrors: string[]) {
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
  const finalStats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null) as FluidWaterRenderStats | null;
  const frameLoop = await page.evaluate(() => window.__fluidFrameLoopStats ?? null) as FluidFrameLoopStats | null;
  const consumedCoupling = await page.evaluate(() => window.__fluidGridCouplingForces ?? null) as GridFluidCouplingForces | null;
  const capability = await page.evaluate(() => window.__fluidGridCapabilityReport ?? null) as FluidCapabilityReport | null;
  const preferredTier = await page.evaluate(() => window.__fluidGridPreferredTier ?? "auto") as FluidGridTierId | "auto";
  const runtimeGridOverride = await page.evaluate(() => window.__fluidRuntimeGridOverride ?? null) as FluidWaterRuntimeGridDimensions | null;
  const runtimeGrid = gridFromTelemetry(finalTelemetry);

  return createFluidExperimentalReferenceOutcomesReport({
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
    noFullGridReadbackPerFrame:
      cases.every((entry) => entry.telemetry.noFullGridReadbackPerFrame && entry.telemetry.particlesNoFullGridReadbackPerFrame === true) &&
      finalTelemetry.noFullGridReadbackPerFrame &&
      finalTelemetry.particlesNoFullGridReadbackPerFrame === true,
    pageErrors,
    preferredTier,
    runtimeGrid,
    runtimeGridOverride,
    selectedTier: capability?.selectedTier ?? "low",
    telemetry: finalTelemetry,
  });
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
  const stats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null) as FluidWaterRenderStats | null;
  const consumedCoupling = await page.evaluate(() => window.__fluidGridCouplingForces ?? null) as GridFluidCouplingForces | null;
  const frameLoop = await page.evaluate((caseId) => {
    const stats = window.__fluidFrameLoopStats;
    return stats ? { ...stats, caseId } : null;
  }, options.id) as (FluidFrameLoopStats & { caseId: string }) | null;
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
    lastSnapshot = await page.evaluate(() => window.__oceanPhysicsScenarioControls?.snapshot?.() ?? window.__oceanPhysicsSnapshot ?? null) as OceanPhysicsLiveSnapshot | null;
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
    particlesNoFullGridReadbackPerFrame: canvas.getAttribute("data-water-particles-readback") === "true",
    pressure: canvas.getAttribute("data-water-pressure"),
    pressureActive: canvas.getAttribute("data-water-pressure-active") === "true",
    renderer: canvas.getAttribute("data-water-renderer"),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    verticalPressureForceN: Number(canvas.getAttribute("data-water-pressure-vertical-force") ?? 0),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}

async function measureReferenceScenario(
  page: Page,
  scenario: (typeof referenceScenarios)[number]
): Promise<FluidInstalledHighResolutionReferencePacingScenarioInput> {
  await configureAndDrop(page, scenario.config);
  const samples = await page.evaluate(collectReferencePacingSamples, scenario.durationMs) as InstalledHighResolutionReferencePacingSample[];
  const telemetry = await page.evaluate((expectedTimeScale) => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    const snapshot = window.__oceanPhysicsSnapshot;
    return {
      canvasGrid: canvas?.getAttribute("data-water-grid") ?? null,
      couplingActiveSeen: Boolean(window.__displayPacingObserved?.couplingActiveSeen),
      finalPhase: snapshot?.phase ?? null,
      longTaskSupported: Boolean(window.__displayPacingObserved?.longTaskSupported),
      particlesActiveSeen: Boolean(window.__displayPacingObserved?.particlesActiveSeen),
      pressureActiveSeen: Boolean(window.__displayPacingObserved?.pressureActiveSeen),
      renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      runtimeGridOverride: stage?.getAttribute("data-fluid-runtime-grid-override") ?? null,
      timeScale: expectedTimeScale,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
    };
  }, scenario.config.timeScale ?? 1);
  return {
    categories: scenario.categories,
    expectedActivePhysics: true,
    expectedCoupling: true,
    expectedParticles: scenario.expectedParticles,
    expectedPressure: true,
    id: scenario.id,
    label: scenario.label,
    referenceCaseId: scenario.referenceCaseId,
    samples,
    telemetry,
  };
}

async function configureAndDrop(page: Page, config: OceanPhysicsScenarioConfig) {
  await page.evaluate((nextConfig) => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.configure(nextConfig);
    window.__oceanPhysicsScenarioControls.drop();
  }, config);
  await page.waitForFunction(
    (expected) => {
      const snapshot = window.__oceanPhysicsSnapshot;
      return Boolean(snapshot && snapshot.spec.id === expected.presetId && snapshot.phase !== "ready");
    },
    config,
    { timeout: timeoutMs }
  );
}

function collectReferencePacingSamples(durationMs: number): Promise<InstalledHighResolutionReferencePacingSample[]> {
  return new Promise((resolve) => {
    const samples: InstalledHighResolutionReferencePacingSample[] = [];
    let start = 0;
    let last = 0;
    let longTaskCount = 0;
    let longTaskDurationMs = 0;
    let longTaskSupported = false;
    let observer: PerformanceObserver | null = null;

    try {
      longTaskSupported = PerformanceObserver.supportedEntryTypes?.includes("longtask") ?? false;
      if (longTaskSupported) {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskCount += 1;
            longTaskDurationMs += entry.duration;
          }
        });
        observer.observe({ entryTypes: ["longtask"] });
      }
    } catch {
      longTaskSupported = false;
      observer = null;
    }

    window.__displayPacingObserved = {
      couplingActiveSeen: false,
      longTaskSupported,
      particlesActiveSeen: false,
      pressureActiveSeen: false,
    };

    const sample = (now: number) => {
      if (start === 0) {
        start = now;
        last = now;
      }
      const stage = document.querySelector(".simulation-stage");
      const canvas = document.querySelector(".ocean-canvas");
      const snapshot = window.__oceanPhysicsSnapshot;
      const frameLoop = window.__fluidFrameLoopStats;
      const coupling = window.__fluidGridCouplingForces;
      const selection = window.__fluidGridTierSelection;
      const capability = window.__fluidGridCapabilityReport;
      const pressureActive = canvas?.getAttribute("data-water-pressure-active") === "true";
      const particlesActive = canvas?.getAttribute("data-water-particles-active") === "true";
      const couplingActive = coupling?.active === true;
      window.__displayPacingObserved = {
        couplingActiveSeen: Boolean(window.__displayPacingObserved?.couplingActiveSeen || couplingActive),
        longTaskSupported,
        particlesActiveSeen: Boolean(window.__displayPacingObserved?.particlesActiveSeen || particlesActive),
        pressureActiveSeen: Boolean(window.__displayPacingObserved?.pressureActiveSeen || pressureActive),
      };
      samples.push({
        atMs: now - start,
        canvasGrid: canvas?.getAttribute("data-water-grid") ?? null,
        capabilityGrid: capability?.grid ? `${capability.grid.cellsX}x${capability.grid.cellsY}` : null,
        capabilitySelectedTier: capability?.selectedTier ?? null,
        couplingActive,
        droppedDebtS: frameLoop?.droppedDebtS ?? 0,
        dtMs: now - last,
        longTaskCount,
        longTaskDurationMs,
        maxSubstepsObserved: frameLoop?.maxSubstepsObserved ?? 0,
        particlesActive,
        particlesNoFullGridReadback: canvas?.getAttribute("data-water-particles-readback") === "true",
        phase: snapshot?.phase ?? null,
        physicsTimeS: snapshot?.timeS ?? null,
        pressureActive,
        pressureNoFullGridReadback: canvas?.getAttribute("data-water-pressure-readback") === "true",
        renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
        renderer: canvas?.getAttribute("data-water-renderer") ?? null,
        runtimeGridOverride: stage?.getAttribute("data-fluid-runtime-grid-override") ?? null,
        tier: canvas?.getAttribute("data-water-tier") ?? null,
        tierSelectionMode: selection?.mode ?? null,
        tierSelectionPreferredTier: selection?.preferredTier ?? null,
        tierSelectionRequestedTier: selection?.requestedTier ?? null,
        totalSubsteps: frameLoop?.totalSubsteps ?? 0,
        waterContext: canvas?.getAttribute("data-water-context") ?? null,
        waterFrame: Number(canvas?.getAttribute("data-water-frames") ?? 0),
      });
      last = now;
      if (now - start >= durationMs) {
        observer?.disconnect();
        resolve(samples);
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

function compactEvidenceReport(report: FluidInstalledHighResolutionReferencePacingReport) {
  return {
    coreReference: {
      cases: report.coreReference.cases.map((entry) => ({
        category: entry.category,
        consumedCoupling: entry.consumedCoupling,
        frameLoop: entry.frameLoop,
        id: entry.id,
        pass: entry.pass,
        stats: entry.stats
          ? {
              gridCellsX: entry.stats.gridCellsX,
              gridCellsY: entry.stats.gridCellsY,
              lastPressure: entry.stats.lastPressure
                ? {
                    active: entry.stats.lastPressure.active,
                    noFullGridReadbackPerFrame: entry.stats.lastPressure.noFullGridReadbackPerFrame,
                  }
                : null,
              renderer: entry.stats.renderer,
              tier: entry.stats.tier,
            }
          : null,
        telemetry: entry.telemetry,
      })),
      comparisons: report.coreReference.comparisons,
      failures: report.coreReference.failures,
      gate: report.coreReference.gate,
      launchMode: report.coreReference.launchMode,
      noFullGridReadbackPerFrame: report.coreReference.noFullGridReadbackPerFrame,
      pass: report.coreReference.pass,
      preferredTier: report.coreReference.preferredTier,
      runtimeGrid: report.coreReference.runtimeGrid,
      runtimeGridOverride: report.coreReference.runtimeGridOverride,
      selectedTier: report.coreReference.selectedTier,
      summary: report.coreReference.summary,
      telemetry: report.coreReference.telemetry,
    },
    failures: report.failures,
    gate: report.gate,
    generatedAt: report.generatedAt,
    installedProfile: report.installedProfile,
    launchEnv: report.launchEnv,
    launcher: report.launcher,
    pass: report.pass,
    runtime: report.runtime,
    scenarios: report.scenarios.map((scenario) => ({
      categories: scenario.categories,
      expectedActivePhysics: scenario.expectedActivePhysics,
      expectedCoupling: scenario.expectedCoupling,
      expectedParticles: scenario.expectedParticles,
      expectedPressure: scenario.expectedPressure,
      framePacing: scenario.framePacing,
      id: scenario.id,
      label: scenario.label,
      referenceCaseId: scenario.referenceCaseId,
      representativeSamples: representativeSamplesFor(scenario.samples),
      sampleCount: scenario.samples.length,
      telemetry: scenario.telemetry,
    })),
    sourceCalibration: report.sourceCalibration,
    storage: report.storage,
    summary: report.summary,
    thresholds: report.thresholds,
  };
}

function representativeSamplesFor(samples: InstalledHighResolutionReferencePacingSample[]): InstalledHighResolutionReferencePacingSample[] {
  if (samples.length <= 3) return samples;
  return [samples[0], samples[Math.floor(samples.length / 2)], samples[samples.length - 1]];
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

function gridFromTelemetry(telemetry: FluidReferenceCanvasTelemetry): FluidWaterRuntimeGridDimensions {
  const [cellsX, cellsY] = String(telemetry.grid ?? "0x0").split("x").map((entry) => Number(entry));
  return {
    cellsX: Number.isFinite(cellsX) ? cellsX : 0,
    cellsY: Number.isFinite(cellsY) ? cellsY : 0,
  };
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
