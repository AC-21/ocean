import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
import type { FluidExperimentalReferenceOutcomesReport } from "./fluidExperimentalReferenceOutcomes";
import {
  createFluidHighResolutionCalibrationReport,
  type FluidHighResolutionCalibrationRuntimeProbe,
} from "./fluidHighResolutionCalibration";
import {
  calibrationProfileForAdaptiveReport,
  calibrationProfileWithExperimentalRuntimeGrid,
  validateFluidCalibrationProfile,
} from "./fluidPersistedCalibration";
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

const timeoutMs = Number(process.env.OCEAN_LAB_HIGH_RESOLUTION_CALIBRATION_TIMEOUT_MS || 90_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_HIGH_RESOLUTION_CALIBRATION_OUT || "reports/fluid-high-resolution-calibration-latest.json";
const adaptiveTierPath = process.env.OCEAN_LAB_HIGH_RESOLUTION_CALIBRATION_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const capabilityPath = process.env.OCEAN_LAB_HIGH_RESOLUTION_CALIBRATION_CAPABILITY_IN || "docs/evidence/FG-01-fluid-capability-2026-06-07.json";
const experimentalReferencePath =
  process.env.OCEAN_LAB_HIGH_RESOLUTION_CALIBRATION_REFERENCE_IN || "docs/evidence/FG-40-experimental-reference-outcomes-2026-06-08.json";
const appPackage = await readJson<{ version: string }>("package.json");
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_HIGH_RESOLUTION_CALIBRATION_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-high-resolution-calibration-"));
const userDataPath = await realpath(userDataRoot);

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  const adaptiveSource = await readJson<FluidAdaptiveTierReport>(adaptiveTierPath);
  const capabilitySource = await readJson<FluidCapabilityReport>(capabilityPath);
  const experimentalReference = await readJson<FluidExperimentalReferenceOutcomesReport>(experimentalReferencePath);
  const baseProfile = calibrationProfileForAdaptiveReport(adaptiveSource, new Date().toISOString(), {
    appVersion: appPackage.version,
    capabilityReport: capabilitySource,
  });
  const profile = calibrationProfileWithExperimentalRuntimeGrid(baseProfile, experimentalReference);
  const profileValidationFailures = validateFluidCalibrationProfile(profile, { expectedAppVersion: appPackage.version });
  assert.deepEqual(profileValidationFailures, [], `High-resolution calibration profile failed validation:\n${profileValidationFailures.join("\n")}`);

  const storage = createHarborlineStorage({
    app: {
      getName: () => appName,
      getPath: (name: string) => {
        if (name === "logs") return path.join(userDataPath, "logs");
        if (name === "userData") return userDataPath;
        throw new Error(`Unexpected app path: ${name}`);
      },
      getVersion: () => appPackage.version,
    },
  });
  const serializedProfile = `${JSON.stringify(profile, null, 2)}\n`;
  await storage.writeText(desktopStorageFiles.fluidCalibrationProfile, serializedProfile);
  const savedProfileRaw = await storage.readText(desktopStorageFiles.fluidCalibrationProfile);
  assert.ok(savedProfileRaw?.includes("\"runtimeGrid\""), "persisted high-resolution calibration profile did not include runtimeGrid");

  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }
  const launchEnv = sanitizedLaunchEnv();
  launchEnv.HARBORLINE_USER_DATA_DIR = userDataPath;
  delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER;
  delete launchEnv.OCEAN_LAB_EXPERIMENTAL_FLUID_GRID;
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
  await page.waitForFunction(() => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    return (
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
      Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  const runtimeProbe = await page.evaluate((): FluidHighResolutionCalibrationRuntimeProbe => {
    const canvas = document.querySelector(".ocean-canvas");
    return {
      capabilityGrid: {
        cellsX: window.__fluidGridCapabilityReport?.grid?.cellsX ?? 0,
        cellsY: window.__fluidGridCapabilityReport?.grid?.cellsY ?? 0,
      },
      grid: canvas?.getAttribute("data-water-grid") ?? null,
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      runtimeGridOverride: window.__fluidRuntimeGridOverride ?? null,
      selectedTier: window.__fluidGridCapabilityReport?.selectedTier ?? null,
      selection: window.__fluidGridTierSelection ?? null,
      tier: canvas?.getAttribute("data-water-tier") ?? null,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
      waterFrames: Number(canvas?.getAttribute("data-water-frames") ?? 0),
    };
  });

  const report = createFluidHighResolutionCalibrationReport({
    generatedAt: new Date().toISOString(),
    launchEnv: {
      envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
      envExperimentalGridPresent: Boolean(launchEnv.OCEAN_LAB_EXPERIMENTAL_FLUID_GRID),
      envRequestedTierPresent: Boolean(launchEnv.OCEAN_LAB_FLUID_TIER),
      envUserDataOverridePresent: Boolean(launchEnv.HARBORLINE_USER_DATA_DIR),
    },
    launchMode,
    profile: {
      pass: profile.pass,
      runtimeGrid: profile.runtimeGrid,
      schema: profile.schema,
      selectedTier: profile.selectedTier,
      sourceGate: profile.sourceGate,
    },
    runtimeProbe,
    sourceEvidence: {
      caseCount: experimentalReference.summary.caseCount,
      comparisonCount: experimentalReference.summary.comparisonCount,
      gate: experimentalReference.gate,
      liveGrid: experimentalReference.summary.liveGrid,
      pass: experimentalReference.pass,
    },
    storage: {
      fileName: desktopStorageFiles.fluidCalibrationProfile,
      persistedRawBytes: Buffer.byteLength(savedProfileRaw ?? "", "utf8"),
      readByMainProcess: runtimeProbe.selection?.mode === "calibrated-auto" && runtimeProbe.runtimeGridOverride?.cellsX === 1024 && runtimeProbe.grid === "1024x576",
      storageBasePath: storage.basePath,
      verificationReadMatched: savedProfileRaw === serializedProfile,
    },
  });
  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid high-resolution calibration report written to ${outPath}`);
  console.log(`- source: ${report.sourceEvidence.gate}, ${report.sourceEvidence.liveGrid}`);
  console.log(`- profile runtime grid: ${report.profile.runtimeGrid?.cellsX}x${report.profile.runtimeGrid?.cellsY}`);
  console.log(`- runtime: ${report.runtimeProbe.selection?.mode ?? "missing"} -> ${report.runtimeProbe.tier} (${report.runtimeProbe.grid})`);
  console.log(`- env experimental grid present: ${report.launchEnv.envExperimentalGridPresent}`);
  assert.equal(launchMode, "packaged-app", "FG-41 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-41", "FG-41 evidence must use the high-resolution calibration gate id");
  assert.deepEqual(report.failures, [], `FG-41 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

function sanitizedLaunchEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
