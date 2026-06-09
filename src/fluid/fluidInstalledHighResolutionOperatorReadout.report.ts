import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, lstat, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { _electron as electron, type Page } from "playwright";
import type { OceanPhysicsLiveSnapshot } from "../OceanPhysicsApp";
import {
  createFluidInstalledHighResolutionOperatorReadoutReport,
  type FluidInstalledHighResolutionOperatorReadoutReport,
  type FluidInstalledHighResolutionOperatorReadoutScenarioInput,
  type InstalledHighResolutionOperatorReadoutSnapshot,
  type InstalledHighResolutionOperatorReadouts,
  type OperatorReadoutOutcome,
} from "./fluidInstalledHighResolutionOperatorReadout";
import type { InstalledHighResolutionReferencePacingSample } from "./fluidInstalledHighResolutionReferencePacing";
import type { FluidRuntimeTierSelection } from "./fluidAdaptiveTier";

type SourceVisibilityEvidence = {
  failures: string[];
  gate: string;
  highResolutionEvidence: {
    liveGrid: string | null;
  };
  pass: boolean;
  viewportProbe: {
    pixelProbe: {
      averageLuma: number;
      colorBuckets: number;
      status: string;
      variety: string;
    };
  };
  window: {
    frontmost: boolean;
    visible: boolean;
  };
};

const execFileAsync = promisify(execFile);
const appName = "Ocean Impact Lab";
const timeoutMs = Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_OPERATOR_READOUT_TIMEOUT_MS || 90_000);
const outPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_OPERATOR_READOUT_OUT ||
  "reports/fluid-installed-high-resolution-operator-readout-latest.json";
const sourceVisibilityPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_OPERATOR_READOUT_IN ||
  "docs/evidence/FG-44-installed-high-resolution-desktop-visibility-2026-06-08.json";
const launcherPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_LAUNCHER_PATH || path.join(homedir(), "Desktop", `${appName}.app`));
const launcherExecutablePath = path.join(launcherPath, "Contents", "MacOS", appName);
const expectedInstalledBundle =
  process.env.OCEAN_LAB_DESKTOP_INSTALLED_BUNDLE ||
  path.join(homedir(), "Applications", "Ocean Impact Lab Builds", `${appName}-darwin-${process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch}`, `${appName}.app`);

const scenarios = [
  {
    durationMs: 4_500,
    expectedOutcome: "floats-indefinitely",
    id: "operator-foam-float-readout",
    presetId: "foam-rescue-block",
    presetName: "Closed-cell foam block",
  },
  {
    durationMs: 3_800,
    expectedOutcome: "sinks-immediately",
    id: "operator-concrete-sink-readout",
    presetId: "concrete-cube",
    presetName: "Concrete cube",
  },
  {
    durationMs: 4_200,
    expectedOutcome: "waterlogs-then-sinks",
    id: "operator-leaky-drum-waterlogging-readout",
    presetId: "leaky-steel-drum",
    presetName: "Leaky sealed steel drum",
  },
] satisfies Array<{
  durationMs: number;
  expectedOutcome: OperatorReadoutOutcome;
  id: string;
  presetId: string;
  presetName: string;
}>;

const sourceVisibility = await readJson<SourceVisibilityEvidence>(sourceVisibilityPath);
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
    env: launchEnv,
    executablePath: launcherExecutablePath,
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
  await waitForHighResolutionRuntime(page);
  const runtime = await runtimeEvidence(page);

  const operatorScenarios: FluidInstalledHighResolutionOperatorReadoutScenarioInput[] = [];
  for (const scenario of scenarios) {
    operatorScenarios.push(await runOperatorScenario(page, scenario));
  }

  const report = createFluidInstalledHighResolutionOperatorReadoutReport({
    launcher: {
      executablePath: launcherExecutablePath,
      path: launcherPath,
      resolvesToInstalledBundle: launcherTargetPath === expectedInstalledBundle,
      targetPath: launcherTargetPath,
    },
    runtime,
    scenarios: operatorScenarios,
    sourceVisibility: {
      failures: sourceVisibility.failures,
      gate: sourceVisibility.gate,
      liveGrid: sourceVisibility.highResolutionEvidence.liveGrid,
      pass: sourceVisibility.pass,
      sourcePath: sourceVisibilityPath,
      viewport: sourceVisibility.viewportProbe.pixelProbe,
      window: sourceVisibility.window,
    },
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(compactEvidenceReport(report), null, 2)}\n`);
  console.log(`Fluid installed high-resolution operator readout report written to ${outPath}`);
  console.log(`- source: ${report.sourceVisibility.gate}, ${report.sourceVisibility.liveGrid}`);
  console.log(`- runtime: ${report.runtime.selection?.mode ?? "missing"} -> ${report.runtime.selectedTier} (${report.runtime.liveGrid})`);
  console.log(
    `- pacing: max p95 ${report.summary.maxP95FrameMs.toFixed(2)} ms, ` +
      `max p99 ${report.summary.maxP99FrameMs.toFixed(2)} ms`
  );
  for (const entry of report.scenarios) {
    console.log(
      `- ${entry.presetId}: ${entry.readouts.floatResult}; predicted ${entry.readouts.predictedSink}; ` +
        `impact ${entry.readouts.impact}; splash ${entry.readouts.splash}`
    );
  }
  assert.equal(report.gate, "G-FG-45", "FG-45 evidence must use the installed high-resolution operator readout gate id");
  assert.deepEqual(report.failures, [], `FG-45 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
}

async function waitForHighResolutionRuntime(page: Page) {
  await page.waitForFunction(() => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    return (
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
}

async function runtimeEvidence(page: Page): Promise<FluidInstalledHighResolutionOperatorReadoutReport["runtime"]> {
  return page.evaluate(() => {
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
      selection: (window.__fluidGridTierSelection ?? null) as FluidRuntimeTierSelection | null,
      tier: canvas?.getAttribute("data-water-tier") ?? null,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
      waterFrames: Number(canvas?.getAttribute("data-water-frames") ?? 0),
    };
  });
}

async function runOperatorScenario(
  page: Page,
  scenario: (typeof scenarios)[number]
): Promise<FluidInstalledHighResolutionOperatorReadoutScenarioInput> {
  await resetOperatorScenario(page);
  await selectDifferentPresetFirst(page, scenario.presetId);
  const presetButton = page.getByRole("button", { exact: true, name: scenario.presetName });
  await presetButton.click({ timeout: timeoutMs });
  await page.waitForFunction(
    (presetId) => window.__oceanPhysicsSnapshot?.selectedPresetId === presetId && window.__oceanPhysicsSnapshot?.phase === "ready",
    scenario.presetId,
    { timeout: timeoutMs }
  );
  const initialSnapshot = await snapshotForReport(page, scenario.id, "initial");

  await page.getByRole("button", { exact: true, name: "Drop" }).click({ timeout: timeoutMs });
  await page.waitForFunction(
    (presetId) => {
      const snapshot = window.__oceanPhysicsSnapshot;
      return snapshot?.selectedPresetId === presetId && snapshot.phase !== "ready";
    },
    scenario.presetId,
    { timeout: timeoutMs }
  );
  const samples = (await page.evaluate(collectOperatorSamples, scenario.durationMs)) as InstalledHighResolutionReferencePacingSample[];
  await page.waitForFunction(() => window.__oceanPhysicsSnapshot?.impact !== null, undefined, { timeout: timeoutMs }).catch(() => undefined);
  const finalSnapshot = await snapshotForReport(page, scenario.id, "final");
  const readouts = await readOperatorReadouts(page);
  const telemetry = await telemetryEvidence(page);

  return {
    clickedDrop: true,
    clickedPreset: true,
    expectedOutcome: scenario.expectedOutcome,
    finalSnapshot,
    id: scenario.id,
    initialSnapshot,
    label: scenario.presetName,
    presetId: scenario.presetId,
    presetName: scenario.presetName,
    readouts,
    samples,
    telemetry,
  };
}

async function resetOperatorScenario(page: Page) {
  await page.getByRole("button", { exact: true, name: "Reset" }).click({ timeout: timeoutMs });
  await page.waitForFunction(() => window.__oceanPhysicsSnapshot?.phase === "ready", undefined, { timeout: timeoutMs });
}

async function selectDifferentPresetFirst(page: Page, targetPresetId: string) {
  const alternate = targetPresetId === "foam-rescue-block" ? "Concrete cube" : "Closed-cell foam block";
  await page.getByRole("button", { exact: true, name: alternate }).click({ timeout: timeoutMs });
  await page.waitForFunction(
    (presetId) => window.__oceanPhysicsSnapshot?.selectedPresetId !== presetId && window.__oceanPhysicsSnapshot?.phase === "ready",
    targetPresetId,
    { timeout: timeoutMs }
  );
}

async function snapshotForReport(
  page: Page,
  scenarioId: string,
  label: string
): Promise<InstalledHighResolutionOperatorReadoutSnapshot> {
  const snapshot = (await page.evaluate(() => window.__oceanPhysicsSnapshot ?? null)) as OceanPhysicsLiveSnapshot | null;
  if (!snapshot) throw new Error(`Missing ${label} operator snapshot for ${scenarioId}`);
  return {
    impactSpeedMps: snapshot.impact?.impactSpeedMps ?? null,
    liveFloatDurationS: snapshot.liveFloatDurationS,
    phase: snapshot.phase,
    predictionOutcome: snapshot.prediction.outcome,
    secondsUntilSink: snapshot.prediction.secondsUntilSink,
    selectedPresetId: snapshot.selectedPresetId,
    splashHeightM: snapshot.impact?.splashHeightM ?? null,
    waterFillFraction: snapshot.object.waterFillFraction,
  };
}

async function readOperatorReadouts(page: Page): Promise<InstalledHighResolutionOperatorReadouts> {
  return page.evaluate(() => {
    const blockFor = (title: string) =>
      Array.from(document.querySelectorAll(".readout-block")).find(
        (block) => block.querySelector(":scope > span")?.textContent?.trim() === title
      );
    const metricIn = (blockTitle: string, label: string) => {
      const block = blockFor(blockTitle);
      const metric = Array.from(block?.querySelectorAll(".metric") ?? []).find(
        (entry) => entry.querySelector("span")?.textContent?.trim() === label
      );
      return metric?.querySelector("strong")?.textContent?.trim() ?? "";
    };
    return {
      floatResult: blockFor("Float Result")?.querySelector("strong")?.textContent?.trim() ?? "",
      grid: metricIn("Fluid Backend", "Grid"),
      impact: blockFor("Impact")?.querySelector("strong")?.textContent?.trim() ?? "",
      liveAfloat: metricIn("Float Timing", "Live afloat"),
      liveState: document.querySelector(".stage-toolbar strong")?.textContent?.trim() ?? "",
      predictedSink: metricIn("Float Timing", "Predicted sink"),
      renderer: metricIn("Fluid Backend", "Renderer"),
      splash: metricIn("Impact", "Splash"),
    };
  });
}

async function telemetryEvidence(
  page: Page
): Promise<FluidInstalledHighResolutionOperatorReadoutScenarioInput["telemetry"]> {
  return page.evaluate(() => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    return {
      canvasGrid: canvas?.getAttribute("data-water-grid") ?? null,
      couplingActiveSeen: Boolean(window.__displayPacingObserved?.couplingActiveSeen),
      particlesActiveSeen: Boolean(window.__displayPacingObserved?.particlesActiveSeen),
      particlesNoFullGridReadback: canvas?.getAttribute("data-water-particles-readback") === "true",
      pressureActiveSeen: Boolean(window.__displayPacingObserved?.pressureActiveSeen),
      pressureNoFullGridReadback: canvas?.getAttribute("data-water-pressure-readback") === "true",
      renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      runtimeGridOverride: stage?.getAttribute("data-fluid-runtime-grid-override") ?? null,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
    };
  });
}

function collectOperatorSamples(durationMs: number): Promise<InstalledHighResolutionReferencePacingSample[]> {
  return new Promise((resolve) => {
    const samples: InstalledHighResolutionReferencePacingSample[] = [];
    let start = 0;
    let last = 0;
    let longTaskCount = 0;
    let longTaskDurationMs = 0;
    let observer: PerformanceObserver | null = null;
    try {
      if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskCount += 1;
            longTaskDurationMs += entry.duration;
          }
        });
        observer.observe({ entryTypes: ["longtask"] });
      }
    } catch {
      observer = null;
    }

    window.__displayPacingObserved = {
      couplingActiveSeen: false,
      longTaskSupported: observer !== null,
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
        longTaskSupported: observer !== null,
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

function compactEvidenceReport(report: FluidInstalledHighResolutionOperatorReadoutReport) {
  return {
    failures: report.failures,
    gate: report.gate,
    generatedAt: report.generatedAt,
    launcher: report.launcher,
    pass: report.pass,
    runtime: report.runtime,
    scenarios: report.scenarios.map((scenario) => ({
      clickedDrop: scenario.clickedDrop,
      clickedPreset: scenario.clickedPreset,
      expectedOutcome: scenario.expectedOutcome,
      finalSnapshot: scenario.finalSnapshot,
      framePacing: scenario.framePacing,
      id: scenario.id,
      initialSnapshot: scenario.initialSnapshot,
      presetId: scenario.presetId,
      presetName: scenario.presetName,
      readouts: scenario.readouts,
      sampleCount: scenario.samples.length,
      samples: representativeSamplesFor(scenario.samples),
      telemetry: scenario.telemetry,
    })),
    sourceVisibility: report.sourceVisibility,
    summary: report.summary,
    thresholds: report.thresholds,
  };
}

function representativeSamplesFor(samples: InstalledHighResolutionReferencePacingSample[]): InstalledHighResolutionReferencePacingSample[] {
  if (samples.length <= 3) return samples;
  return [samples[0], samples[Math.floor(samples.length / 2)], samples[samples.length - 1]];
}

async function quitAppIfRunning() {
  await execFileAsync("osascript", ["-e", `tell application "${appName}" to quit`]).catch(() => undefined);
  if (await waitForProcessExit(5000)) return;
  await execFileAsync("pkill", ["-TERM", "-f", `${expectedInstalledBundle}/Contents/MacOS/${appName}`]).catch(() => undefined);
  if (await waitForProcessExit(5000)) return;
  throw new Error("Timed out waiting for stale installed Ocean Impact Lab process to exit");
}

async function waitForProcessExit(timeout: number) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const running = await execFileAsync("pgrep", ["-afil", appName])
      .then(({ stdout }) => stdout.includes(`${expectedInstalledBundle}/Contents/MacOS/${appName}`))
      .catch(() => false);
    if (!running) return true;
    await delay(250);
  }
  return false;
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
