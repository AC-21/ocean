import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import {
  calibrationProfileForAdaptiveReport,
  createFluidPersistedCalibrationReport,
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

const timeoutMs = Number(process.env.OCEAN_LAB_PERSISTED_CALIBRATION_TIMEOUT_MS || 90_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_PERSISTED_CALIBRATION_OUT || "reports/fluid-persisted-calibration-latest.json";
const adaptiveTierPath = process.env.OCEAN_LAB_PERSISTED_CALIBRATION_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_PERSISTED_CALIBRATION_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-persisted-calibration-"));
const userDataPath = await realpath(userDataRoot);

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  const adaptiveSource = await readJson<FluidAdaptiveTierReport>(adaptiveTierPath);
  const profile = calibrationProfileForAdaptiveReport(adaptiveSource, new Date().toISOString());
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
  await storage.writeText(desktopStorageFiles.fluidCalibrationProfile, JSON.stringify(profile));
  const savedProfileRaw = await storage.readText(desktopStorageFiles.fluidCalibrationProfile);
  assert.ok(savedProfileRaw?.includes("\"schema\":\"ocean-fluid-calibration-profile-v1\""), "persisted calibration profile was not written");

  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }
  const launchEnv: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
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
      const stage = document.querySelector(".simulation-stage");
      const canvas = document.querySelector(".ocean-canvas");
      return (
        window.__fluidGridTierSelection?.mode === "calibrated-auto" &&
        window.__fluidGridTierSelection?.requestedTier === "auto" &&
        window.__fluidGridTierSelection?.calibratedTier === expectedTier &&
        window.__fluidGridTierSelection?.preferredTier === expectedTier &&
        window.__fluidGridPreferredTier === expectedTier &&
        window.__fluidGridCapabilityReport?.selectedTier === expectedTier &&
        window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
        window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
        stage?.getAttribute("data-fluid-tier-selection-mode") === "calibrated-auto" &&
        stage?.getAttribute("data-fluid-tier-requested") === "auto" &&
        stage?.getAttribute("data-fluid-preferred-tier") === expectedTier &&
        canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
        canvas?.getAttribute("data-water-context") === "webgpu" &&
        canvas?.getAttribute("data-water-tier") === expectedTier &&
        canvas?.getAttribute("data-water-grid") === "768x432" &&
        Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
      );
    },
    profile.selectedTier,
    { timeout: timeoutMs }
  );

  const runtimeProbe = await page.evaluate(() => {
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

  const report = createFluidPersistedCalibrationReport({
    adaptiveSource,
    envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
    fileName: desktopStorageFiles.fluidCalibrationProfile,
    generatedAt: new Date().toISOString(),
    launchMode,
    profile,
    runtimeProbe: { ...runtimeProbe, launchMode },
  });
  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid persisted calibration report written to ${outPath}`);
  console.log(`- profile: ${report.profile.selectedTier} from ${report.profile.sourceGate}`);
  console.log(`- runtime: ${report.runtimeProbe.selection?.mode ?? "missing"} -> ${report.runtimeProbe.selectedTier} (${report.runtimeProbe.selectedGrid.cellsX}x${report.runtimeProbe.selectedGrid.cellsY})`);
  console.log(`- env calibrated tier present: ${report.storage.envCalibratedTierPresent}`);
  assert.equal(launchMode, "packaged-app", "FG-24 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-24", "FG-24 evidence must use the persisted calibration gate id");
  assert.deepEqual(report.failures, [], `FG-24 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
