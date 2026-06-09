import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, lstat, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { _electron as electron, type Page } from "playwright";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
import type { FluidCapabilityReport } from "./webgpuCapability";
import type { FluidExperimentalReferenceOutcomesReport } from "./fluidExperimentalReferenceOutcomes";
import type { FluidInstalledHighResolutionResidualBudgetReport } from "./fluidInstalledHighResolutionResidualBudget";
import {
  createFluidInstalledHighResolutionVisualWatchdogReport,
  type VisualWatchdogPhase,
  type VisualWatchdogSample,
} from "./fluidInstalledHighResolutionVisualWatchdog";
import {
  calibrationProfileForAdaptiveReport,
  calibrationProfileWithExperimentalRuntimeGrid,
  validateFluidCalibrationProfile,
} from "./fluidPersistedCalibration";
import { summarizePngPixels } from "./fluidVisualPixelProbe";

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
const appName = "Ocean Impact Lab";
const timeoutMs = Number(process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_VISUAL_WATCHDOG_TIMEOUT_MS || 90_000);
const outPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_VISUAL_WATCHDOG_OUT ||
  "reports/fluid-installed-high-resolution-visual-watchdog-latest.json";
const screenshotDir =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_VISUAL_WATCHDOG_SCREENSHOT_DIR ||
  "reports/fluid-installed-high-resolution-visual-watchdog";
const sourceResidualBudgetPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_VISUAL_WATCHDOG_RESIDUAL_IN ||
  "docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json";
const adaptiveTierPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_VISUAL_WATCHDOG_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const capabilityPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_VISUAL_WATCHDOG_CAPABILITY_IN || "docs/evidence/FG-01-fluid-capability-2026-06-07.json";
const experimentalReferencePath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_VISUAL_WATCHDOG_REFERENCE_IN ||
  "docs/evidence/FG-40-experimental-reference-outcomes-2026-06-08.json";
const appPackage = await readJson<{ version: string }>("package.json");
const launcherPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_LAUNCHER_PATH || path.join(homedir(), "Desktop", `${appName}.app`));
const launcherExecutablePath = path.join(launcherPath, "Contents", "MacOS", appName);
const expectedInstalledBundle =
  process.env.OCEAN_LAB_DESKTOP_INSTALLED_BUNDLE ||
  path.join(homedir(), "Applications", "Ocean Impact Lab Builds", `${appName}-darwin-${process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch}`, `${appName}.app`);
const defaultUserDataPath = path.join(homedir(), "Library", "Application Support", appName);

const sourceResidualBudget = await readJson<FluidInstalledHighResolutionResidualBudgetReport>(sourceResidualBudgetPath);
const adaptiveSource = await readJson<FluidAdaptiveTierReport>(adaptiveTierPath);
const capabilitySource = await readJson<FluidCapabilityReport>(capabilityPath);
const experimentalReferenceSource = await readJson<FluidExperimentalReferenceOutcomesReport>(experimentalReferencePath);
const baseProfile = calibrationProfileForAdaptiveReport(adaptiveSource, new Date().toISOString(), {
  appVersion: appPackage.version,
  capabilityReport: capabilitySource,
});
const profile = calibrationProfileWithExperimentalRuntimeGrid(baseProfile, experimentalReferenceSource);
const profileValidationFailures = validateFluidCalibrationProfile(profile, { expectedAppVersion: appPackage.version });
assert.deepEqual(profileValidationFailures, [], `Installed high-resolution visual watchdog profile failed validation:\n${profileValidationFailures.join("\n")}`);

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
assert.ok(savedProfileRaw?.includes("\"runtimeGrid\""), "installed high-resolution visual watchdog profile did not include runtimeGrid");

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
  await mkdir(screenshotDir, { recursive: true });

  const samples: VisualWatchdogSample[] = [];
  samples.push(await captureSample(page, "idle-1", "idle"));
  await delay(450);
  samples.push(await captureSample(page, "idle-2", "idle"));
  await delay(450);
  samples.push(await captureSample(page, "idle-3", "idle"));

  await page.getByRole("button", { exact: true, name: "Concrete cube" }).click({ timeout: timeoutMs });
  await page.getByRole("button", { exact: true, name: "Drop" }).click({ timeout: timeoutMs });
  await delay(650);
  samples.push(await captureSample(page, "post-drop-1", "post-drop"));
  await delay(650);
  samples.push(await captureSample(page, "post-drop-2", "post-drop"));
  await delay(650);
  samples.push(await captureSample(page, "post-drop-3", "post-drop"));

  const runtime = await runtimeEvidence(page);
  const report = createFluidInstalledHighResolutionVisualWatchdogReport({
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
    samples,
    sourceResidualBudget,
    sourceResidualBudgetPath,
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
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid installed high-resolution visual watchdog report written to ${outPath}`);
  console.log(`- runtime: ${runtime.selection?.mode ?? "missing"} -> ${runtime.selectedTier} (${runtime.liveGrid})`);
  console.log(
    `- samples: ${report.summary.sampleCount}, water frame delta ${report.summary.waterFrameDelta}, ` +
      `luma ${report.summary.minAverageLuma.toFixed(2)}..${report.summary.maxAverageLuma.toFixed(2)}, ` +
      `min buckets ${report.summary.minColorBuckets}`
  );
  console.log(`- blank samples: ${report.summary.blankSampleIds.length > 0 ? report.summary.blankSampleIds.join(", ") : "none"}`);
  assert.equal(report.gate, "G-FG-47", "FG-47 evidence must use the installed high-resolution visual watchdog gate id");
  assert.deepEqual(report.failures, [], `FG-47 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
}

async function waitForHighResolutionRuntime(page: Page) {
  await page.waitForFunction(
    () => {
      const stage = document.querySelector(".simulation-stage");
      const canvas = document.querySelector(".ocean-canvas");
      return (
        window.__fluidGridTierSelection?.mode === "calibrated-auto" &&
        window.__fluidGridTierSelection?.requestedTier === "auto" &&
        window.__fluidGridTierSelection?.calibratedTier === "ultra" &&
        window.__fluidGridCapabilityReport?.selectedTier === "ultra" &&
        window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
        window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
        window.__fluidRuntimeGridOverride?.cellsX === 1024 &&
        window.__fluidRuntimeGridOverride?.cellsY === 576 &&
        stage?.getAttribute("data-fluid-runtime-grid-override") === "1024x576" &&
        stage?.getAttribute("data-water-render-mode") === "webgpu" &&
        canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
        canvas?.getAttribute("data-water-context") === "webgpu" &&
        canvas?.getAttribute("data-water-tier") === "ultra" &&
        canvas?.getAttribute("data-water-grid") === "1024x576" &&
        Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
      );
    },
    undefined,
    { timeout: timeoutMs }
  );
}

async function runtimeEvidence(page: Page) {
  return await page.evaluate(() => {
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
  });
}

async function captureSample(page: Page, id: string, phase: VisualWatchdogPhase): Promise<VisualWatchdogSample> {
  const screenshotPath = path.join(screenshotDir, `${id}.png`);
  const canvas = page.locator(".ocean-canvas");
  const png = await canvas.screenshot({ path: screenshotPath, timeout: timeoutMs });
  const pixelProbe = summarizePngPixels(png);
  const telemetry = await page.evaluate(() => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    const coupling = window.__fluidGridCouplingForces;
    return {
      couplingActive: coupling?.active === true,
      droppedDebtS: window.__fluidFrameLoopStats?.droppedDebtS ?? 0,
      liveGrid: canvas?.getAttribute("data-water-grid") ?? null,
      particlesActive: canvas?.getAttribute("data-water-particles-active") === "true",
      particlesNoFullGridReadback: canvas?.getAttribute("data-water-particles-readback") === "true",
      pressureActive: canvas?.getAttribute("data-water-pressure-active") === "true",
      pressureNoFullGridReadback: canvas?.getAttribute("data-water-pressure-readback") === "true",
      renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      runtimeGridOverride: stage?.getAttribute("data-fluid-runtime-grid-override") ?? null,
      tier: canvas?.getAttribute("data-water-tier") ?? null,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
      waterFrame: Number(canvas?.getAttribute("data-water-frames") ?? 0),
    };
  });
  return {
    capturedAtMs: performanceNow(),
    id,
    phase,
    pixelProbe,
    screenshotPath,
    telemetry,
  };
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

function performanceNow(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}
