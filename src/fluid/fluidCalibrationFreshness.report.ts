import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import { createFluidCalibrationFreshnessReport } from "./fluidCalibrationFreshness";
import {
  calibrationProfileForAdaptiveReport,
  type FluidCalibrationProfile,
} from "./fluidPersistedCalibration";

const require = createRequire(import.meta.url);
const { createHarborlineStorage, desktopStorageFiles } = require("../../electron/storage.cjs") as {
  createHarborlineStorage: (options: { app: { getName: () => string; getPath: (name: string) => string; getVersion: () => string } }) => {
    readText: (fileName: string) => Promise<string | null>;
    writeText: (fileName: string, value: string) => Promise<void>;
  };
  desktopStorageFiles: {
    fluidCalibrationProfile: string;
  };
};

const timeoutMs = Number(process.env.OCEAN_LAB_CALIBRATION_FRESHNESS_TIMEOUT_MS || 90_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_CALIBRATION_FRESHNESS_OUT || "reports/fluid-calibration-freshness-latest.json";
const adaptiveTierPath = process.env.OCEAN_LAB_CALIBRATION_FRESHNESS_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const appPackage = await readJson<{ version: string }>("package.json");
const appName = "Ocean Impact Lab";
const appVersion = appPackage.version;
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_CALIBRATION_FRESHNESS_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-calibration-freshness-"));
const userDataPath = await realpath(userDataRoot);

try {
  const adaptiveSource = await readJson<FluidAdaptiveTierReport>(adaptiveTierPath);
  const storage = createHarborlineStorage({
    app: {
      getName: () => appName,
      getPath: (name: string) => {
        if (name === "logs") return path.join(userDataPath, "logs");
        if (name === "userData") return userDataPath;
        throw new Error(`Unexpected app path: ${name}`);
      },
      getVersion: () => appVersion,
    },
  });
  const validProfile = calibrationProfileForAdaptiveReport(adaptiveSource, new Date().toISOString(), {
    appVersion,
  });
  const staleProfile = calibrationProfileForAdaptiveReport(adaptiveSource, new Date().toISOString(), {
    appVersion: "0.0.0-stale",
  });

  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }
  const launchEnv = sanitizedLaunchEnv();
  launchEnv.HARBORLINE_USER_DATA_DIR = userDataPath;
  delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER;
  delete launchEnv.OCEAN_LAB_FLUID_TIER;

  await writeProfile(storage, desktopStorageFiles.fluidCalibrationProfile, validProfile);
  const validProfileProbe = await launchAndProbe(launchEnv, {
    expectedGrid: "768x432",
    expectedMode: "calibrated-auto",
    expectedTier: "ultra",
  });

  await writeProfile(storage, desktopStorageFiles.fluidCalibrationProfile, staleProfile);
  const staleProfileProbe = await launchAndProbe(launchEnv, {
    expectedGrid: "512x288",
    expectedMode: "default-high",
    expectedTier: "high",
  });

  const report = createFluidCalibrationFreshnessReport({
    adaptiveSource,
    envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
    envRequestedTierPresent: Boolean(launchEnv.OCEAN_LAB_FLUID_TIER),
    expectedAppVersion: appVersion,
    fileName: desktopStorageFiles.fluidCalibrationProfile,
    generatedAt: new Date().toISOString(),
    launchMode,
    staleProfile,
    staleProfileProbe: { ...staleProfileProbe, launchMode },
    validProfile,
    validProfileProbe: { ...validProfileProbe, launchMode },
  });

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid calibration freshness report written to ${outPath}`);
  console.log(`- app version: ${report.expectedAppVersion}`);
  console.log(`- valid profile: ${report.runtime.validProfileProbe.selection?.mode ?? "missing"} -> ${report.runtime.validProfileProbe.selectedTier}`);
  console.log(`- stale profile: ${report.runtime.staleProfileProbe.selection?.mode ?? "missing"} -> ${report.runtime.staleProfileProbe.selectedTier}`);
  assert.equal(launchMode, "packaged-app", "FG-27 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-27", "FG-27 evidence must use the calibration freshness gate id");
  assert.deepEqual(report.failures, [], `FG-27 failures:\n${report.failures.join("\n")}`);
} finally {
  await rm(userDataPath, { force: true, recursive: true });
}

async function writeProfile(
  storage: { readText: (fileName: string) => Promise<string | null>; writeText: (fileName: string, value: string) => Promise<void> },
  fileName: string,
  profile: FluidCalibrationProfile
) {
  const serialized = `${JSON.stringify(profile, null, 2)}\n`;
  await storage.writeText(fileName, serialized);
  assert.equal(await storage.readText(fileName), serialized, `${fileName} did not round-trip through desktop storage`);
}

async function launchAndProbe(
  launchEnv: Record<string, string>,
  expected: { expectedGrid: string; expectedMode: string; expectedTier: string }
): Promise<FluidAdaptiveTierRuntimeProbe> {
  let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
  try {
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
      (runtimeExpected) => {
        const canvas = document.querySelector(".ocean-canvas");
        return (
          window.__fluidGridTierSelection?.mode === runtimeExpected.expectedMode &&
          window.__fluidGridCapabilityReport?.selectedTier === runtimeExpected.expectedTier &&
          canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
          canvas?.getAttribute("data-water-context") === "webgpu" &&
          canvas?.getAttribute("data-water-tier") === runtimeExpected.expectedTier &&
          canvas?.getAttribute("data-water-grid") === runtimeExpected.expectedGrid &&
          Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
        );
      },
      expected,
      { timeout: timeoutMs }
    );
    if (consoleErrors.length > 0) throw new Error(`Electron console errors: ${consoleErrors.join(" | ")}`);
    if (pageErrors.length > 0) throw new Error(`Electron page errors: ${pageErrors.join(" | ")}`);

    return await page.evaluate(() => {
      const canvas = document.querySelector(".ocean-canvas");
      return {
        grid: canvas?.getAttribute("data-water-grid") ?? null,
        launchMode: "packaged-app",
        renderer: canvas?.getAttribute("data-water-renderer") ?? null,
        requestedTier: window.__fluidGridTierSelection?.requestedTier ?? "default",
        selectedGrid: {
          cellsX: window.__fluidGridCapabilityReport?.grid?.cellsX ?? 0,
          cellsY: window.__fluidGridCapabilityReport?.grid?.cellsY ?? 0,
        },
        selectedTier: window.__fluidGridCapabilityReport?.selectedTier ?? "low",
        selection: window.__fluidGridTierSelection ?? null,
        tier: canvas?.getAttribute("data-water-tier") ?? null,
        waterContext: canvas?.getAttribute("data-water-context") ?? null,
        waterFrames: Number(canvas?.getAttribute("data-water-frames") ?? 0),
      };
    }) as FluidAdaptiveTierRuntimeProbe;
  } finally {
    if (electronApp) await electronApp.close().catch(() => undefined);
  }
}

function sanitizedLaunchEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
