import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
import type { FluidCapabilityReport } from "./webgpuCapability";
import { installFluidCalibrationProfile } from "./fluidInstalledCalibration";
import {
  createFluidInstalledDisplayPacingReport,
  type FluidInstalledDisplayPacingScenarioInput,
  type InstalledDisplayPacingSample,
} from "./fluidInstalledDisplayPacing";

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

const timeoutMs = Number(process.env.OCEAN_LAB_INSTALLED_DISPLAY_PACING_TIMEOUT_MS || 90_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_INSTALLED_DISPLAY_PACING_OUT || "reports/fluid-installed-display-pacing-latest.json";
const adaptiveTierPath = process.env.OCEAN_LAB_INSTALLED_DISPLAY_PACING_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const capabilityPath = process.env.OCEAN_LAB_INSTALLED_DISPLAY_PACING_CAPABILITY_IN || "docs/evidence/FG-01-fluid-capability-2026-06-07.json";
const idleDurationMs = Number(process.env.OCEAN_LAB_INSTALLED_DISPLAY_PACING_IDLE_MS || 2_800);
const impactDurationMs = Number(process.env.OCEAN_LAB_INSTALLED_DISPLAY_PACING_IMPACT_MS || 5_500);
const dampingDurationMs = Number(process.env.OCEAN_LAB_INSTALLED_DISPLAY_PACING_DAMPING_MS || 6_500);
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_INSTALLED_DISPLAY_PACING_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-installed-display-pacing-"));
const userDataPath = await realpath(userDataRoot);

const calmSeawater = {
  currentSpeedMps: 0,
  waterDensityKgM3: 1025,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  const adaptiveSource = await readJson<FluidAdaptiveTierReport>(adaptiveTierPath);
  const capabilitySource = await readJson<FluidCapabilityReport>(capabilityPath);
  const storage = createHarborlineStorage({
    app: {
      getName: () => appName,
      getPath: (name: string) => {
        if (name === "logs") return path.join(userDataPath, "logs");
        if (name === "userData") return userDataPath;
        throw new Error(`Unexpected app path: ${name}`);
      },
      getVersion: () => "0.1.0-test",
    },
  });
  const install = await installFluidCalibrationProfile({
    adaptiveSource,
    capabilitySource,
    fileName: desktopStorageFiles.fluidCalibrationProfile,
    generatedAt: new Date().toISOString(),
    storage,
    storageBasePath: storage.basePath,
  });

  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }
  const launchEnv = sanitizedLaunchEnv();
  launchEnv.HARBORLINE_USER_DATA_DIR = userDataPath;
  delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER;
  delete launchEnv.OCEAN_LAB_FLUID_TIER;

  electronApp = await electron.launch({
    ...(launchMode === "packaged-app" ? { executablePath: packagedExecutablePath } : { args: [root] }),
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
  await page.waitForFunction(
    (expectedTier) => {
      const canvas = document.querySelector(".ocean-canvas");
      return (
        window.__oceanPhysicsScenarioControls &&
        window.__oceanPhysicsSnapshot?.version === "ocean-physics-live-v1" &&
        window.__fluidGridTierSelection?.mode === "calibrated-auto" &&
        window.__fluidGridTierSelection?.requestedTier === "auto" &&
        window.__fluidGridTierSelection?.calibratedTier === expectedTier &&
        window.__fluidGridCapabilityReport?.selectedTier === expectedTier &&
        window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
        window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
        canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
        canvas?.getAttribute("data-water-context") === "webgpu" &&
        canvas?.getAttribute("data-water-tier") === expectedTier &&
        canvas?.getAttribute("data-water-grid") === "768x432" &&
        Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
      );
    },
    install.installedProfile.selectedTier,
    { timeout: timeoutMs }
  );

  const runtime = await page.evaluate(() => ({
    envCalibratedTierPresent: false,
    envRequestedTierPresent: false,
    selectedGrid: {
      cellsX: window.__fluidGridCapabilityReport?.grid?.cellsX ?? 0,
      cellsY: window.__fluidGridCapabilityReport?.grid?.cellsY ?? 0,
    },
    selectedTier: window.__fluidGridCapabilityReport?.selectedTier ?? "missing",
    selection: window.__fluidGridTierSelection ?? null,
  }));
  const scenarios: FluidInstalledDisplayPacingScenarioInput[] = [];

  await configureScenario(page, {
    dropHeightM: 8,
    ocean: calmSeawater,
    presetId: "concrete-cube",
    releaseAngleRad: 0,
    timeScale: 1,
  });
  scenarios.push(await measureDisplayScenario(page, "idle-installed-display-pacing", "Idle installed-calibration display pacing", idleDurationMs, false, 1));

  await configureScenario(page, {
    dropHeightM: 8,
    ocean: calmSeawater,
    presetId: "concrete-cube",
    releaseAngleRad: 0,
    timeScale: 1,
  });
  await page.evaluate(() => window.__oceanPhysicsScenarioControls?.drop());
  scenarios.push(await measureDisplayScenario(page, "concrete-installed-impact-display-pacing", "Concrete installed-calibration impact pacing", impactDurationMs, true, 1));

  await configureScenario(page, {
    dropHeightM: 1.35,
    ocean: calmSeawater,
    presetId: "foam-rescue-block",
    releaseAngleRad: 0.18,
    timeScale: 1,
  });
  await page.evaluate(() => window.__oceanPhysicsScenarioControls?.drop());
  scenarios.push(await measureDisplayScenario(page, "foam-installed-damping-display-pacing", "Foam installed-calibration damping pacing", dampingDurationMs, true, 1));

  const report = createFluidInstalledDisplayPacingReport({
    adaptiveSource,
    envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
    envRequestedTierPresent: Boolean(launchEnv.OCEAN_LAB_FLUID_TIER),
    generatedAt: new Date().toISOString(),
    install,
    launchMode,
    runtime,
    scenarios,
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(compactEvidenceReport(report), null, 2)}\n`);
  console.log(`Fluid installed display pacing report written to ${outPath}`);
  console.log(`- installed: ${report.storage.installedTier}, mode ${report.runtime.selection?.mode ?? "missing"}`);
  for (const scenario of report.scenarios) {
    console.log(
      `- ${scenario.id}: ${scenario.framePacing.averageFps.toFixed(1)} FPS, p95 ${scenario.framePacing.p95FrameMs.toFixed(2)} ms, p99 ${scenario.framePacing.p99FrameMs.toFixed(2)} ms, dropped ${(scenario.framePacing.droppedFrameRatio * 100).toFixed(1)}%`
    );
  }
  assert.equal(launchMode, "packaged-app", "FG-26 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-26", "FG-26 evidence must use the installed display pacing gate id");
  assert.deepEqual(report.failures, [], `FG-26 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function configureScenario(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  config: Record<string, unknown>
) {
  await page.evaluate((nextConfig) => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.configure(nextConfig);
  }, config);
  await page.waitForFunction(
    (expected) => {
      const snapshot = window.__oceanPhysicsSnapshot;
      return (
        snapshot?.phase === "ready" &&
        snapshot.spec.id === expected.presetId &&
        Math.abs(snapshot.dropHeightM - Number(expected.dropHeightM)) < 1e-6 &&
        Math.abs(snapshot.settings.currentSpeedMps - Number((expected.ocean as { currentSpeedMps: number }).currentSpeedMps)) < 1e-6 &&
        Math.abs(snapshot.settings.waveHeightM - Number((expected.ocean as { waveHeightM: number }).waveHeightM)) < 1e-6
      );
    },
    config,
    { timeout: timeoutMs }
  );
}

async function measureDisplayScenario(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  id: string,
  label: string,
  durationMs: number,
  expectedActivePhysics: boolean,
  timeScale: number
): Promise<FluidInstalledDisplayPacingScenarioInput> {
  const samples = await page.evaluate(collectDisplaySamples, durationMs) as InstalledDisplayPacingSample[];
  const telemetry = await page.evaluate((expectedTimeScale) => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    const snapshot = window.__oceanPhysicsSnapshot;
    return {
      couplingActiveSeen: Boolean(window.__displayPacingObserved?.couplingActiveSeen),
      finalPhase: snapshot?.phase ?? null,
      longTaskSupported: Boolean(window.__displayPacingObserved?.longTaskSupported),
      particlesActiveSeen: Boolean(window.__displayPacingObserved?.particlesActiveSeen),
      pressureActiveSeen: Boolean(window.__displayPacingObserved?.pressureActiveSeen),
      renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      timeScale: expectedTimeScale,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
    };
  }, timeScale);
  return { expectedActivePhysics, id, label, samples, telemetry };
}

function collectDisplaySamples(durationMs: number): Promise<InstalledDisplayPacingSample[]> {
  return new Promise((resolve) => {
    const samples: InstalledDisplayPacingSample[] = [];
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
        capabilityGrid: capability?.grid ? `${capability.grid.cellsX}x${capability.grid.cellsY}` : null,
        capabilitySelectedTier: capability?.selectedTier ?? null,
        couplingActive,
        droppedDebtS: frameLoop?.droppedDebtS ?? 0,
        dtMs: now - last,
        longTaskCount,
        longTaskDurationMs,
        maxSubstepsObserved: frameLoop?.maxSubstepsObserved ?? 0,
        particlesActive,
        phase: snapshot?.phase ?? null,
        physicsTimeS: snapshot?.timeS ?? null,
        pressureActive,
        renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
        renderer: canvas?.getAttribute("data-water-renderer") ?? null,
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

function sanitizedLaunchEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function compactEvidenceReport(report: ReturnType<typeof createFluidInstalledDisplayPacingReport>) {
  return {
    adaptiveSource: report.adaptiveSource,
    displayPacing: {
      failures: report.displayPacing.failures,
      gate: report.displayPacing.gate,
      pass: report.displayPacing.pass,
      summary: report.displayPacing.summary,
      thresholds: report.displayPacing.thresholds,
    },
    failures: report.failures,
    gate: report.gate,
    generatedAt: report.generatedAt,
    install: report.install,
    launchMode: report.launchMode,
    pass: report.pass,
    runtime: report.runtime,
    scenarios: report.scenarios.map((scenario) => ({
      expectedActivePhysics: scenario.expectedActivePhysics,
      framePacing: scenario.framePacing,
      id: scenario.id,
      label: scenario.label,
      representativeSamples: representativeSamplesFor(scenario.samples),
      sampleCount: scenario.samples.length,
      telemetry: scenario.telemetry,
    })),
    storage: report.storage,
    summary: report.summary,
  };
}

function representativeSamplesFor(samples: InstalledDisplayPacingSample[]): InstalledDisplayPacingSample[] {
  if (samples.length <= 3) return samples;
  return [samples[0], samples[Math.floor(samples.length / 2)], samples[samples.length - 1]];
}
