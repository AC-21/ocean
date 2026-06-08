import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, lstat, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { inflateSync } from "node:zlib";
import { _electron as electron, type Page } from "playwright";
import type { OceanPhysicsLiveSnapshot, OceanPhysicsScenarioConfig } from "../OceanPhysicsApp";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
import type {
  FloatSinkEnvelopeCaseInput,
  FloatSinkLiveEvidence,
  FloatSinkOutcomeKind,
  FloatSinkPredictionEvidence,
  FloatSinkTelemetryEvidence,
  FloatSinkViewportPixelProbe,
  FluidInstalledHighResolutionFloatSinkEnvelopeReport,
} from "./fluidInstalledHighResolutionFloatSinkEnvelope";
import { createFluidInstalledHighResolutionFloatSinkEnvelopeReport } from "./fluidInstalledHighResolutionFloatSinkEnvelope";
import type { InstalledHighResolutionReferencePacingSample } from "./fluidInstalledHighResolutionReferencePacing";
import {
  calibrationProfileForAdaptiveReport,
  calibrationProfileWithExperimentalRuntimeGrid,
  validateFluidCalibrationProfile,
} from "./fluidPersistedCalibration";
import type { FluidExperimentalReferenceOutcomesReport } from "./fluidExperimentalReferenceOutcomes";
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
const timeoutMs = Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_FLOAT_SINK_TIMEOUT_MS || 180_000);
const outPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_FLOAT_SINK_OUT ||
  "reports/fluid-installed-high-resolution-float-sink-envelope-latest.json";
const screenshotPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_FLOAT_SINK_SCREENSHOT ||
  "reports/fluid-installed-high-resolution-float-sink-envelope-latest.png";
const adaptiveTierPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_FLOAT_SINK_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const capabilityPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_FLOAT_SINK_CAPABILITY_IN || "docs/evidence/FG-01-fluid-capability-2026-06-07.json";
const experimentalReferencePath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_FLOAT_SINK_REFERENCE_IN ||
  "docs/evidence/FG-40-experimental-reference-outcomes-2026-06-08.json";
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

const presetEnvelope = [
  { expectedOutcome: "floats-indefinitely", presetId: "foam-rescue-block", presetName: "Closed-cell foam block" },
  { expectedOutcome: "floats-indefinitely", presetId: "pine-log", presetName: "Pine log" },
  { expectedOutcome: "floats-indefinitely", presetId: "ice-block", presetName: "Fresh-water ice block" },
  { expectedOutcome: "waterlogs-then-sinks", presetId: "leaky-steel-drum", presetName: "Leaky sealed steel drum" },
  { expectedOutcome: "waterlogs-then-sinks", presetId: "hardwood-crate", presetName: "Hardwood crate" },
  { expectedOutcome: "sinks-immediately", presetId: "concrete-cube", presetName: "Concrete cube" },
  { expectedOutcome: "sinks-immediately", presetId: "steel-sphere", presetName: "Solid steel sphere" },
  { expectedOutcome: "floats-indefinitely", presetId: "aluminum-canister", presetName: "Sealed aluminum canister" },
] satisfies Array<{ expectedOutcome: FloatSinkOutcomeKind; presetId: string; presetName: string }>;

const adaptiveSource = await readJson<FluidAdaptiveTierReport>(adaptiveTierPath);
const capabilitySource = await readJson<FluidCapabilityReport>(capabilityPath);
const experimentalReferenceSource = await readJson<FluidExperimentalReferenceOutcomesReport>(experimentalReferencePath);
const baseProfile = calibrationProfileForAdaptiveReport(adaptiveSource, new Date().toISOString(), {
  appVersion: appPackage.version,
  capabilityReport: capabilitySource,
});
const profile = calibrationProfileWithExperimentalRuntimeGrid(baseProfile, experimentalReferenceSource);
const profileValidationFailures = validateFluidCalibrationProfile(profile, { expectedAppVersion: appPackage.version });
assert.deepEqual(profileValidationFailures, [], `Installed high-resolution float/sink profile failed validation:\n${profileValidationFailures.join("\n")}`);

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
assert.ok(savedProfileRaw?.includes("\"runtimeGrid\""), "installed high-resolution float/sink profile did not include runtimeGrid");

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
  }) as FluidInstalledHighResolutionFloatSinkEnvelopeReport["runtime"];
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  const runtimePng = await page.locator(".ocean-canvas").screenshot({ path: screenshotPath, timeout: timeoutMs });
  const pixelProbe = summarizePng(runtimePng);

  const cases: FloatSinkEnvelopeCaseInput[] = [];
  for (const preset of presetEnvelope) {
    cases.push(await measurePresetEnvelope(page, preset));
  }

  const report = createFluidInstalledHighResolutionFloatSinkEnvelopeReport({
    cases,
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
    visual: {
      pixelProbe,
      screenshotPath,
    },
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(compactEvidenceReport(report), null, 2)}\n`);
  console.log(`Fluid installed high-resolution float/sink envelope report written to ${outPath}`);
  console.log(`- runtime: ${report.runtime.selection?.mode ?? "missing"} -> ${report.runtime.selectedTier} (${report.runtime.liveGrid})`);
  console.log(
    `- viewport: ${report.visual.pixelProbe.status}/${report.visual.pixelProbe.variety}, ` +
      `${report.visual.pixelProbe.colorBuckets} buckets, luma ${report.visual.pixelProbe.averageLuma.toFixed(2)}`
  );
  console.log(`- presets: ${report.summary.presetCount}, outcomes: ${report.summary.outcomes.join(", ")}`);
  console.log(`- pacing: max p95 ${report.summary.maxP95FrameMs.toFixed(2)} ms, max p99 ${report.summary.maxP99FrameMs.toFixed(2)} ms`);
  for (const entry of report.cases) {
    console.log(
      `- ${entry.presetId}: ${entry.prediction.outcome}, phase ${entry.live.phase}, predicted sink ${formatSeconds(entry.prediction.secondsUntilSink)}`
    );
  }
  assert.equal(report.gate, "G-FG-43", "FG-43 evidence must use the installed high-resolution float/sink envelope gate id");
  assert.deepEqual(report.failures, [], `FG-43 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
}

async function measurePresetEnvelope(
  page: Page,
  preset: (typeof presetEnvelope)[number]
): Promise<FloatSinkEnvelopeCaseInput> {
  const normal = await runScenarioWindow(page, {
    dropHeightM: preset.expectedOutcome === "sinks-immediately" ? 1.2 : 1.35,
    ocean: calmSeawater,
    presetId: preset.presetId,
    releaseAngleRad: preset.expectedOutcome === "floats-indefinitely" ? 0.08 : 0,
    timeScale: 1,
  }, durationForOutcome(preset.expectedOutcome));
  const acceleratedWaterlogging =
    preset.expectedOutcome === "waterlogs-then-sinks"
      ? await runAcceleratedWaterlogging(page, preset)
      : undefined;
  return {
    acceleratedWaterlogging,
    expectedOutcome: preset.expectedOutcome,
    live: liveEvidenceFromSnapshot(normal.finalSnapshot, normal.observedPhase),
    prediction: predictionEvidenceFromSnapshot(normal.initialSnapshot),
    presetId: preset.presetId,
    presetName: preset.presetName,
    telemetry: normal.telemetry,
  };
}

async function runAcceleratedWaterlogging(page: Page, preset: (typeof presetEnvelope)[number]) {
  const accelerated = await runScenarioWindow(
    page,
    {
      dropHeightM: 1,
      ocean: calmSeawater,
      presetId: preset.presetId,
      releaseAngleRad: 0,
      specPatch: {
        leakAreaM2: 0.0025,
        porousAbsorptionRatePerMinute: 30,
        waterFillRatePerMinute: 30,
      },
      timeScale: 1,
    },
    8_500
  );
  return {
    final: liveEvidenceFromSnapshot(accelerated.finalSnapshot, accelerated.observedPhase),
    prediction: predictionEvidenceFromSnapshot(accelerated.initialSnapshot),
    telemetry: accelerated.telemetry,
  };
}

async function runScenarioWindow(page: Page, config: OceanPhysicsScenarioConfig, durationMs: number) {
  const initialSnapshot = await configureAndDrop(page, config);
  const samples = await page.evaluate(collectEnvelopeSamples, durationMs) as InstalledHighResolutionReferencePacingSample[];
  const finalSnapshot = await page.evaluate(
    () => window.__oceanPhysicsScenarioControls?.snapshot?.() ?? window.__oceanPhysicsSnapshot ?? null
  ) as OceanPhysicsLiveSnapshot | null;
  if (!finalSnapshot) throw new Error(`Missing final snapshot for ${config.presetId}`);
  return {
    finalSnapshot,
    initialSnapshot,
    observedPhase: observedPhaseFromSamples(samples, finalSnapshot.phase),
    telemetry: await telemetryEvidenceFromPage(page, samples),
  };
}

async function configureAndDrop(page: Page, config: OceanPhysicsScenarioConfig): Promise<OceanPhysicsLiveSnapshot> {
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
  const snapshot = await page.evaluate(
    () => window.__oceanPhysicsScenarioControls?.snapshot?.() ?? window.__oceanPhysicsSnapshot ?? null
  ) as OceanPhysicsLiveSnapshot | null;
  if (!snapshot) throw new Error(`Missing configured snapshot for ${config.presetId}`);
  return snapshot;
}

async function telemetryEvidenceFromPage(
  page: Page,
  samples: InstalledHighResolutionReferencePacingSample[]
): Promise<FloatSinkTelemetryEvidence> {
  return page.evaluate((collectedSamples) => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    return {
      canvasGrid: canvas?.getAttribute("data-water-grid") ?? null,
      couplingActiveSeen: Boolean(window.__displayPacingObserved?.couplingActiveSeen),
      particlesActiveSeen: Boolean(window.__displayPacingObserved?.particlesActiveSeen),
      pressureActiveSeen: Boolean(window.__displayPacingObserved?.pressureActiveSeen),
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      runtimeGridOverride: stage?.getAttribute("data-fluid-runtime-grid-override") ?? null,
      samples: collectedSamples,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
    };
  }, samples);
}

function collectEnvelopeSamples(durationMs: number): Promise<InstalledHighResolutionReferencePacingSample[]> {
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

function predictionEvidenceFromSnapshot(snapshot: OceanPhysicsLiveSnapshot): FloatSinkPredictionEvidence {
  return {
    criticalWaterFillFraction: snapshot.prediction.criticalWaterFillFraction,
    effectiveDensityKgM3: snapshot.spec.densityKgM3,
    equilibriumSubmergedFraction: snapshot.diagnostics.equilibriumSubmergedFraction,
    fullWaterloggedDensityKgM3: snapshot.spec.densityKgM3 + snapshot.spec.maxWaterFillFraction * snapshot.settings.waterDensityKgM3,
    initialSubmergedDepthM: snapshot.prediction.initialSubmergedDepthM,
    maxWaterFillFraction: snapshot.spec.maxWaterFillFraction,
    outcome: snapshot.prediction.outcome,
    secondsUntilSink: snapshot.prediction.secondsUntilSink,
    waterFillRatePerMinute: snapshot.spec.waterFillRatePerMinute,
  };
}

function liveEvidenceFromSnapshot(snapshot: OceanPhysicsLiveSnapshot, observedPhase: string = snapshot.phase): FloatSinkLiveEvidence {
  return {
    diagnostics: {
      effectiveDensityKgM3: snapshot.diagnostics.effectiveDensityKgM3,
      equilibriumSubmergedFraction: snapshot.diagnostics.equilibriumSubmergedFraction,
      terminalVelocityMps: snapshot.diagnostics.terminalVelocityMps,
    },
    equilibrium: {
      buoyancyErrorRatio: snapshot.equilibrium.buoyancyErrorRatio,
      draftErrorM: snapshot.equilibrium.draftErrorM,
      withinTolerance: snapshot.equilibrium.withinTolerance,
    },
    impactSpeedMps: snapshot.impact?.impactSpeedMps ?? null,
    liveFloatDurationS: snapshot.liveFloatDurationS,
    phase: observedPhase,
    sankAtS: snapshot.sankAtS,
    settledAtS: snapshot.settledAtS,
    waterFillFraction: snapshot.object.waterFillFraction,
  };
}

function observedPhaseFromSamples(samples: InstalledHighResolutionReferencePacingSample[], fallback: string): string {
  const lastActiveSample = [...samples].reverse().find((sample) => sample.phase && sample.phase !== "ready");
  return lastActiveSample?.phase ?? fallback;
}

function durationForOutcome(outcome: FloatSinkOutcomeKind): number {
  if (outcome === "floats-indefinitely") return 8_000;
  if (outcome === "waterlogs-then-sinks") return 4_000;
  return 3_000;
}

function compactEvidenceReport(report: FluidInstalledHighResolutionFloatSinkEnvelopeReport) {
  return {
    cases: report.cases.map((entry) => ({
      acceleratedWaterlogging: entry.acceleratedWaterlogging
        ? {
            final: entry.acceleratedWaterlogging.final,
            prediction: entry.acceleratedWaterlogging.prediction,
            telemetry: {
              ...entry.acceleratedWaterlogging.telemetry,
              samples: representativeSamplesFor(entry.acceleratedWaterlogging.telemetry.samples),
            },
          }
        : undefined,
      expectedOutcome: entry.expectedOutcome,
      framePacing: entry.framePacing,
      live: entry.live,
      prediction: entry.prediction,
      presetId: entry.presetId,
      presetName: entry.presetName,
      sampleCount: entry.telemetry.samples.length,
      telemetry: {
        ...entry.telemetry,
        samples: representativeSamplesFor(entry.telemetry.samples),
      },
    })),
    failures: report.failures,
    gate: report.gate,
    generatedAt: report.generatedAt,
    installedProfile: report.installedProfile,
    launchEnv: report.launchEnv,
    launcher: report.launcher,
    pass: report.pass,
    runtime: report.runtime,
    storage: report.storage,
    summary: report.summary,
    thresholds: report.thresholds,
    visual: report.visual,
  };
}

function representativeSamplesFor(samples: InstalledHighResolutionReferencePacingSample[]): InstalledHighResolutionReferencePacingSample[] {
  if (samples.length <= 3) return samples;
  return [samples[0], samples[Math.floor(samples.length / 2)], samples[samples.length - 1]];
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

function formatSeconds(value: number | null): string {
  if (value === null) return "indefinite";
  if (value === 0) return "immediate";
  return `${value.toFixed(1)}s`;
}

function summarizePng(buffer: Buffer): FloatSinkViewportPixelProbe {
  const image = decodePngRgba(buffer);
  const stepX = Math.max(1, Math.floor(image.width / 80));
  const stepY = Math.max(1, Math.floor(image.height / 52));
  let samples = 0;
  let opaqueSamples = 0;
  let lumaTotal = 0;
  const buckets = new Set<string>();
  for (let y = 0; y < image.height; y += stepY) {
    for (let x = 0; x < image.width; x += stepX) {
      const index = (y * image.width + x) * 4;
      const r = image.data[index];
      const g = image.data[index + 1];
      const b = image.data[index + 2];
      const a = image.data[index + 3];
      samples += 1;
      if (a > 8) opaqueSamples += 1;
      lumaTotal += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      buckets.add(`${Math.floor(r / 24)}-${Math.floor(g / 24)}-${Math.floor(b / 24)}-${Math.floor(a / 64)}`);
    }
  }
  const averageLuma = lumaTotal / Math.max(1, samples);
  return {
    averageLuma,
    colorBuckets: buckets.size,
    height: image.height,
    opaqueSamples,
    samples,
    status: opaqueSamples > samples * 0.92 && averageLuma > 10 ? "nonblank" : "blank",
    variety: buckets.size >= 18 ? "varied" : "flat",
    width: image.width,
  };
}

function decodePngRgba(buffer: Buffer): { data: Buffer; height: number; width: number } {
  const signature = buffer.subarray(0, 8).toString("hex");
  assert.equal(signature, "89504e470d0a1a0a", "expected PNG signature");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks: Buffer[] = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      assert.equal(data[8], 8, "only 8-bit PNG screenshots are supported");
      assert.ok(colorType === 2 || colorType === 6, "only RGB/RGBA PNG screenshots are supported");
    } else if (type === "IDAT") {
      chunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  const inflated = inflateSync(Buffer.concat(chunks));
  const sourceBytesPerPixel = colorType === 6 ? 4 : 3;
  const outputBytesPerPixel = 4;
  const stride = width * sourceBytesPerPixel;
  const unfiltered = Buffer.alloc(width * height * sourceBytesPerPixel);
  const output = Buffer.alloc(width * height * outputBytesPerPixel);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const row = inflated.subarray(inputOffset, inputOffset + stride);
    inputOffset += stride;
    const previousStart = (y - 1) * stride;
    const outputStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = row[x];
      const left = x >= sourceBytesPerPixel ? unfiltered[outputStart + x - sourceBytesPerPixel] : 0;
      const up = y > 0 ? unfiltered[previousStart + x] : 0;
      const upLeft = y > 0 && x >= sourceBytesPerPixel ? unfiltered[previousStart + x - sourceBytesPerPixel] : 0;
      unfiltered[outputStart + x] = unfilter(filter, raw, left, up, upLeft);
    }
    for (let x = 0; x < width; x += 1) {
      const source = outputStart + x * sourceBytesPerPixel;
      const target = (y * width + x) * outputBytesPerPixel;
      output[target] = unfiltered[source];
      output[target + 1] = unfiltered[source + 1];
      output[target + 2] = unfiltered[source + 2];
      output[target + 3] = colorType === 6 ? unfiltered[source + 3] : 255;
    }
  }
  return { data: output, height, width };
}

function unfilter(filter: number, raw: number, left: number, up: number, upLeft: number): number {
  if (filter === 0) return raw;
  if (filter === 1) return (raw + left) & 255;
  if (filter === 2) return (raw + up) & 255;
  if (filter === 3) return (raw + Math.floor((left + up) / 2)) & 255;
  if (filter === 4) return (raw + paeth(left, up, upLeft)) & 255;
  throw new Error(`Unsupported PNG filter ${filter}`);
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
}
