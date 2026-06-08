import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
import { installFluidCalibrationProfile } from "./fluidInstalledCalibration";
import type { InstalledDisplayPacingSample } from "./fluidInstalledDisplayPacing";
import {
  createFluidSustainedInteractionPacingReport,
  type SustainedInteractionAction,
  type SustainedInteractionWorkloadInput,
} from "./fluidSustainedInteractionPacing";
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

const timeoutMs = Number(process.env.OCEAN_LAB_SUSTAINED_INTERACTION_TIMEOUT_MS || 120_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_SUSTAINED_INTERACTION_OUT || "reports/fluid-sustained-interaction-pacing-latest.json";
const adaptiveTierPath = process.env.OCEAN_LAB_SUSTAINED_INTERACTION_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const capabilityPath = process.env.OCEAN_LAB_SUSTAINED_INTERACTION_CAPABILITY_IN || "docs/evidence/FG-01-fluid-capability-2026-06-07.json";
const durationMs = Number(process.env.OCEAN_LAB_SUSTAINED_INTERACTION_DURATION_MS || 12_800);
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_SUSTAINED_INTERACTION_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-sustained-interaction-"));
const userDataPath = await realpath(userDataRoot);

const calmSeawater = {
  currentSpeedMps: 0,
  waterDensityKgM3: 1025,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

const actions: SustainedInteractionAction[] = [
  { atMs: 0, dropHeightM: 8, label: "Concrete cube dense impact", presetId: "concrete-cube", releaseAngleRad: 0 },
  { atMs: 3_200, dropHeightM: 1.35, label: "Foam block damping", presetId: "foam-rescue-block", releaseAngleRad: 0.18 },
  { atMs: 6_400, dropHeightM: 2.2, label: "Leaky drum float/fill", presetId: "leaky-steel-drum", releaseAngleRad: -0.14 },
  { atMs: 9_600, dropHeightM: 5.2, label: "Steel sphere compact sink", presetId: "steel-sphere", releaseAngleRad: 0.06 },
];

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

  const workload = await measureSustainedInteraction(page, durationMs, actions);
  const report = createFluidSustainedInteractionPacingReport({
    adaptiveSource,
    envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
    envRequestedTierPresent: Boolean(launchEnv.OCEAN_LAB_FLUID_TIER),
    generatedAt: new Date().toISOString(),
    install,
    launchMode,
    runtime,
    workload,
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(compactEvidenceReport(report), null, 2)}\n`);
  console.log(`Fluid sustained interaction pacing report written to ${outPath}`);
  console.log(`- installed: ${report.storage.installedTier}, mode ${report.runtime.selection?.mode ?? "missing"}`);
  console.log(`- workload: ${report.summary.actionCount} actions over ${(report.summary.durationMs / 1000).toFixed(1)} s`);
  console.log(
    `- pacing: ${report.workload.framePacing.averageFps.toFixed(1)} FPS, p95 ${report.summary.p95FrameMs.toFixed(2)} ms, p99 ${report.summary.p99FrameMs.toFixed(2)} ms, dropped ${(report.summary.worstDroppedFrameRatio * 100).toFixed(1)}%, debt ${report.summary.maxDroppedDebtS.toFixed(6)} s`
  );
  assert.equal(launchMode, "packaged-app", "FG-29 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-29", "FG-29 evidence must use the sustained interaction pacing gate id");
  assert.deepEqual(report.failures, [], `FG-29 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function measureSustainedInteraction(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  sustainedDurationMs: number,
  scheduledActions: SustainedInteractionAction[]
): Promise<SustainedInteractionWorkloadInput> {
  const samples: InstalledDisplayPacingSample[] = [];
  const segmentDurationMs = sustainedDurationMs / scheduledActions.length;
  let elapsedOffsetMs = 0;
  let physicsOffsetS = 0;
  let couplingActiveSeen = false;
  let longTaskSupported = false;
  let particlesActiveSeen = false;
  let pressureActiveSeen = false;

  for (const action of scheduledActions) {
    await configureAndDrop(page, action);
    const segment = await page.evaluate(collectSustainedInteractionSegmentSamples, segmentDurationMs) as {
      observed: {
        couplingActiveSeen: boolean;
        longTaskSupported: boolean;
        particlesActiveSeen: boolean;
        pressureActiveSeen: boolean;
      };
      samples: InstalledDisplayPacingSample[];
    };
    couplingActiveSeen = couplingActiveSeen || segment.observed.couplingActiveSeen;
    longTaskSupported = longTaskSupported || segment.observed.longTaskSupported;
    particlesActiveSeen = particlesActiveSeen || segment.observed.particlesActiveSeen;
    pressureActiveSeen = pressureActiveSeen || segment.observed.pressureActiveSeen;
    for (const sample of segment.samples) {
      samples.push({
        ...sample,
        atMs: sample.atMs + elapsedOffsetMs,
        physicsTimeS: sample.physicsTimeS === null ? null : sample.physicsTimeS + physicsOffsetS,
      });
    }
    const segmentPhysicsTimes = segment.samples
      .map((sample) => sample.physicsTimeS)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    physicsOffsetS += Math.max(0, ...segmentPhysicsTimes);
    elapsedOffsetMs += segmentDurationMs;
  }

  const telemetry = await page.evaluate((observed) => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    const snapshot = window.__oceanPhysicsSnapshot;
    return {
      couplingActiveSeen: observed.couplingActiveSeen,
      finalPhase: snapshot?.phase ?? null,
      firedActionCount: observed.firedActionCount,
      longTaskSupported: observed.longTaskSupported,
      particlesActiveSeen: observed.particlesActiveSeen,
      pressureActiveSeen: observed.pressureActiveSeen,
      renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      timeScale: 1,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
    };
  }, {
    couplingActiveSeen,
    firedActionCount: scheduledActions.length,
    longTaskSupported,
    particlesActiveSeen,
    pressureActiveSeen,
  });

  return {
    actions: scheduledActions,
    durationMs: sustainedDurationMs,
    expectedActivePhysics: true,
    id: "sustained-calibrated-mixed-drops",
    label: "Sustained calibrated mixed object drops",
    samples,
    telemetry,
  };
}

async function configureAndDrop(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  action: SustainedInteractionAction
) {
  await page.evaluate(({ nextAction, ocean }) => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.configure({
      dropHeightM: nextAction.dropHeightM,
      ocean,
      presetId: nextAction.presetId,
      releaseAngleRad: nextAction.releaseAngleRad,
      timeScale: 1,
    });
    window.__oceanPhysicsScenarioControls.drop();
  }, { nextAction: action, ocean: calmSeawater });
  await page.waitForFunction(
    (expected) => {
      const snapshot = window.__oceanPhysicsSnapshot;
      return snapshot?.spec.id === expected.presetId && snapshot.phase !== "ready";
    },
    action,
    { timeout: timeoutMs }
  );
}

function collectSustainedInteractionSegmentSamples(durationMs: number): Promise<{
  observed: {
    couplingActiveSeen: boolean;
    longTaskSupported: boolean;
    particlesActiveSeen: boolean;
    pressureActiveSeen: boolean;
  };
  samples: InstalledDisplayPacingSample[];
}> {
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
      const elapsedMs = now - start;

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
        atMs: elapsedMs,
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
      if (elapsedMs >= durationMs) {
        observer?.disconnect();
        resolve({
          observed: {
            couplingActiveSeen: Boolean(window.__displayPacingObserved?.couplingActiveSeen),
            longTaskSupported,
            particlesActiveSeen: Boolean(window.__displayPacingObserved?.particlesActiveSeen),
            pressureActiveSeen: Boolean(window.__displayPacingObserved?.pressureActiveSeen),
          },
          samples,
        });
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

function compactEvidenceReport(report: ReturnType<typeof createFluidSustainedInteractionPacingReport>) {
  return {
    adaptiveSource: report.adaptiveSource,
    failures: report.failures,
    gate: report.gate,
    generatedAt: report.generatedAt,
    install: report.install,
    launchMode: report.launchMode,
    pass: report.pass,
    runtime: report.runtime,
    storage: report.storage,
    summary: report.summary,
    thresholds: report.thresholds,
    workload: {
      actions: report.workload.actions,
      durationMs: report.workload.durationMs,
      expectedActivePhysics: report.workload.expectedActivePhysics,
      framePacing: report.workload.framePacing,
      id: report.workload.id,
      label: report.workload.label,
      representativeSamples: representativeSamplesFor(report.workload.samples),
      sampleCount: report.workload.samples.length,
      telemetry: report.workload.telemetry,
    },
  };
}

function representativeSamplesFor(samples: InstalledDisplayPacingSample[]): InstalledDisplayPacingSample[] {
  if (samples.length <= 3) return samples;
  return [samples[0], samples[Math.floor(samples.length / 2)], samples[samples.length - 1]];
}

function sanitizedLaunchEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
