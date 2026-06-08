import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, lstat, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { _electron as electron, type Page } from "playwright";
import type { OceanPhysicsScenarioConfig } from "../OceanPhysicsApp";
import type { FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import {
  createFluidInstalledReferencePacingReport,
  type FluidInstalledReferencePacingScenarioInput,
  type InstalledReferencePacingSample,
} from "./fluidInstalledReferencePacing";
import type { FluidInstalledReferenceOutcomesReport } from "./fluidInstalledReferenceOutcomes";
import type { FluidReferenceOutcomeCategory } from "./fluidUltraReferenceOutcomes";

const execFileAsync = promisify(execFile);
const timeoutMs = Number(process.env.OCEAN_LAB_INSTALLED_REFERENCE_PACING_TIMEOUT_MS || 120_000);
const outPath = process.env.OCEAN_LAB_INSTALLED_REFERENCE_PACING_OUT || "reports/fluid-installed-reference-pacing-latest.json";
const referenceEvidencePath =
  process.env.OCEAN_LAB_INSTALLED_REFERENCE_PACING_REFERENCE_IN || "reports/fluid-installed-reference-outcomes-latest.json";
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

const referenceScenarios: Array<{
  categories: FluidReferenceOutcomeCategory[];
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
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_REFERENCE_PACING_CONCRETE_MS || 3_800),
    expectedParticles: true,
    id: "reference-concrete-drop-splash-pacing",
    label: "Concrete drop and splash installed-reference pacing",
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
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_REFERENCE_PACING_ICE_MS || 4_200),
    expectedParticles: false,
    id: "reference-ice-float-pacing",
    label: "Ice float installed-reference pacing",
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
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_REFERENCE_PACING_FOAM_MS || 6_500),
    expectedParticles: true,
    id: "reference-foam-damping-pacing",
    label: "Foam damping installed-reference pacing",
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
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_REFERENCE_PACING_SINK_MS || 4_200),
    expectedParticles: true,
    id: "reference-concrete-sink-pacing",
    label: "Concrete sink installed-reference pacing",
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
    durationMs: Number(process.env.OCEAN_LAB_INSTALLED_REFERENCE_PACING_LEAK_MS || 3_800),
    expectedParticles: true,
    id: "reference-leaky-drum-sink-pacing",
    label: "Leaky drum sink installed-reference pacing",
    referenceCaseId: "live-leaky-drum-sink-time-prediction",
  },
];

const referenceEvidence = await readJson<FluidInstalledReferenceOutcomesReport>(referenceEvidencePath);
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

  const runtime = await page.evaluate(() => ({
    selectedGrid: {
      cellsX: window.__fluidGridCapabilityReport?.grid?.cellsX ?? 0,
      cellsY: window.__fluidGridCapabilityReport?.grid?.cellsY ?? 0,
    },
    selectedTier: window.__fluidGridCapabilityReport?.selectedTier ?? "missing",
    selection: window.__fluidGridTierSelection ?? null,
  })) as {
    selectedGrid: { cellsX: number; cellsY: number };
    selectedTier: string;
    selection: FluidRuntimeTierSelection | null;
  };

  const scenarios: FluidInstalledReferencePacingScenarioInput[] = [];
  for (const scenario of referenceScenarios) {
    scenarios.push(await measureReferenceScenario(page, scenario));
  }

  const report = createFluidInstalledReferencePacingReport({
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
    referenceEvidence,
    referenceEvidencePath,
    runtime,
    scenarios,
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(compactEvidenceReport(report), null, 2)}\n`);
  console.log(`Fluid installed reference pacing report written to ${outPath}`);
  console.log(`- reference: ${report.referenceEvidence.gate}, ${report.referenceEvidence.caseCount} cases, ${report.referenceEvidence.comparisonCount} comparisons`);
  console.log(`- runtime: ${report.runtime.selection?.mode ?? "missing"} -> ${report.runtime.selectedTier}`);
  for (const scenario of report.scenarios) {
    console.log(
      `- ${scenario.id}: ${scenario.framePacing.averageFps.toFixed(1)} FPS, p95 ${scenario.framePacing.p95FrameMs.toFixed(2)} ms, p99 ${scenario.framePacing.p99FrameMs.toFixed(2)} ms, dropped ${(scenario.framePacing.droppedFrameRatio * 100).toFixed(1)}%`
    );
  }
  assert.equal(report.gate, "G-FG-37", "FG-37 evidence must use the installed reference pacing gate id");
  assert.deepEqual(report.failures, [], `FG-37 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
}

async function measureReferenceScenario(
  page: Page,
  scenario: (typeof referenceScenarios)[number]
): Promise<FluidInstalledReferencePacingScenarioInput> {
  await configureAndDrop(page, scenario.config);
  const samples = await page.evaluate(collectReferencePacingSamples, scenario.durationMs) as InstalledReferencePacingSample[];
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

function collectReferencePacingSamples(durationMs: number): Promise<InstalledReferencePacingSample[]> {
  return new Promise((resolve) => {
    const samples: InstalledReferencePacingSample[] = [];
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
        particlesNoFullGridReadback: canvas?.getAttribute("data-water-particles-readback") === "true",
        phase: snapshot?.phase ?? null,
        physicsTimeS: snapshot?.timeS ?? null,
        pressureActive,
        pressureNoFullGridReadback: canvas?.getAttribute("data-water-pressure-readback") === "true",
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

function compactEvidenceReport(report: ReturnType<typeof createFluidInstalledReferencePacingReport>) {
  return {
    failures: report.failures,
    gate: report.gate,
    generatedAt: report.generatedAt,
    launchEnv: report.launchEnv,
    launcher: report.launcher,
    pass: report.pass,
    referenceEvidence: report.referenceEvidence,
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
    summary: report.summary,
    thresholds: report.thresholds,
  };
}

function representativeSamplesFor(samples: InstalledReferencePacingSample[]): InstalledReferencePacingSample[] {
  if (samples.length <= 3) return samples;
  return [samples[0], samples[Math.floor(samples.length / 2)], samples[samples.length - 1]];
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
