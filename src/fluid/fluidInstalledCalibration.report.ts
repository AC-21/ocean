import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import {
  createFluidInstalledCalibrationReport,
  installFluidCalibrationProfile,
} from "./fluidInstalledCalibration";

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

const timeoutMs = Number(process.env.OCEAN_LAB_INSTALLED_CALIBRATION_TIMEOUT_MS || 90_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_INSTALLED_CALIBRATION_OUT || "reports/fluid-installed-calibration-latest.json";
const adaptiveTierPath = process.env.OCEAN_LAB_INSTALLED_CALIBRATION_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_INSTALLED_CALIBRATION_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-installed-calibration-"));
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
      getVersion: () => "0.1.0-test",
    },
  });
  const install = await installFluidCalibrationProfile({
    adaptiveSource,
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

  const runtimeProbe = await launchAndProbe(launchEnv, install.installedProfile.selectedTier);
  const relaunchProbe = await launchAndProbe(launchEnv, install.installedProfile.selectedTier);

  const report = createFluidInstalledCalibrationReport({
    adaptiveSource,
    envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
    envRequestedTierPresent: Boolean(launchEnv.OCEAN_LAB_FLUID_TIER),
    generatedAt: new Date().toISOString(),
    install,
    launchMode,
    relaunchProbe: { ...relaunchProbe, launchMode },
    runtimeProbe: { ...runtimeProbe, launchMode },
  });

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid installed calibration report written to ${outPath}`);
  console.log(`- installed: ${report.install.fileName} -> ${report.install.installedProfile.selectedTier}`);
  console.log(`- runtime: ${report.runtimeProbe.selection?.mode ?? "missing"} -> ${report.runtimeProbe.selectedTier}`);
  console.log(`- relaunch: ${report.relaunchProbe.selection?.mode ?? "missing"} -> ${report.relaunchProbe.selectedTier}`);
  console.log(`- env fluid tier present: ${report.storage.envRequestedTierPresent}`);
  assert.equal(launchMode, "packaged-app", "FG-25 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-25", "FG-25 evidence must use the installed calibration gate id");
  assert.deepEqual(report.failures, [], `FG-25 failures:\n${report.failures.join("\n")}`);
} finally {
  await rm(userDataPath, { force: true, recursive: true });
}

async function launchAndProbe(launchEnv: Record<string, string>, expectedTier: string): Promise<FluidAdaptiveTierRuntimeProbe> {
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
      (tier) => {
        const stage = document.querySelector(".simulation-stage");
        const canvas = document.querySelector(".ocean-canvas");
        return (
          window.__fluidGridTierSelection?.mode === "calibrated-auto" &&
          window.__fluidGridTierSelection?.requestedTier === "auto" &&
          window.__fluidGridTierSelection?.calibratedTier === tier &&
          window.__fluidGridTierSelection?.preferredTier === tier &&
          window.__fluidGridPreferredTier === tier &&
          window.__fluidGridCapabilityReport?.selectedTier === tier &&
          window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
          window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
          stage?.getAttribute("data-fluid-tier-selection-mode") === "calibrated-auto" &&
          stage?.getAttribute("data-fluid-tier-requested") === "auto" &&
          stage?.getAttribute("data-fluid-preferred-tier") === tier &&
          canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
          canvas?.getAttribute("data-water-context") === "webgpu" &&
          canvas?.getAttribute("data-water-tier") === tier &&
          canvas?.getAttribute("data-water-grid") === "768x432" &&
          Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
        );
      },
      expectedTier,
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
