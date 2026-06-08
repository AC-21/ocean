import assert from "node:assert/strict";
import { access, lstat, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { _electron as electron, type Page } from "playwright";
import { createFluidDefaultProfileCalibrationReport, type FluidDefaultProfileRuntimeProbe } from "./fluidDefaultProfileCalibration";
import { installFluidCalibrationProfile } from "./fluidInstalledCalibration";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
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

const timeoutMs = Number(process.env.OCEAN_LAB_DEFAULT_PROFILE_TIMEOUT_MS || 90_000);
const outPath = process.env.OCEAN_LAB_DEFAULT_PROFILE_CALIBRATION_OUT || "reports/fluid-default-profile-calibration-latest.json";
const adaptiveTierPath = process.env.OCEAN_LAB_DEFAULT_PROFILE_ADAPTIVE_IN || "docs/evidence/FG-23-adaptive-tier-2026-06-08.json";
const capabilityPath = process.env.OCEAN_LAB_DEFAULT_PROFILE_CAPABILITY_IN || "docs/evidence/FG-01-fluid-capability-2026-06-07.json";
const appPackage = await readJson<{ version: string }>("package.json");
const appName = "Ocean Impact Lab";
const defaultUserDataPath = path.resolve(
  process.env.OCEAN_LAB_DEFAULT_PROFILE_USER_DATA || path.join(homedir(), "Library", "Application Support", appName)
);
const launcherPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_LAUNCHER_PATH || path.join(homedir(), "Desktop", `${appName}.app`));
const launcherExecutablePath = path.join(launcherPath, "Contents", "MacOS", appName);
const calibrationProfileFileName = desktopStorageFiles.fluidCalibrationProfile;
assert.equal(calibrationProfileFileName, "fluid-calibration.v1.json", "FG-34 writes the expected default profile file");
const expectedInstalledBundle =
  process.env.OCEAN_LAB_DESKTOP_INSTALLED_BUNDLE ||
  path.join(homedir(), "Applications", "Ocean Impact Lab Builds", `${appName}-darwin-${process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch}`, `${appName}.app`);

const adaptiveSource = await readJson<FluidAdaptiveTierReport>(adaptiveTierPath);
const capabilitySource = await readJson<FluidCapabilityReport>(capabilityPath);
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
const preExistingProfile = await storage.readText(calibrationProfileFileName);
const install = await installFluidCalibrationProfile({
  adaptiveSource,
  appVersion: appPackage.version,
  capabilitySource,
  fileName: calibrationProfileFileName,
  generatedAt: new Date().toISOString(),
  storage,
  storageBasePath: storage.basePath,
});
await access(launcherExecutablePath);
const launcherTargetPath = await desktopLauncherTargetPath();
const launchEnv = sanitizedLaunchEnv();
delete launchEnv.HARBORLINE_USER_DATA_DIR;
delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER;
delete launchEnv.OCEAN_LAB_FLUID_TIER;

const runtimeProbe = await launchAndProbe(launchEnv, install.installedProfile.selectedTier);
const report = createFluidDefaultProfileCalibrationReport({
  generatedAt: new Date().toISOString(),
  install: {
    defaultUserDataPath,
    fileName: install.fileName,
    installedProfile: install.installedProfile,
    persistedRawBytes: install.persistedRawBytes,
    preExistingProfileBytes: Buffer.byteLength(preExistingProfile ?? "", "utf8"),
    storageBasePath: install.storageBasePath,
    verificationReadMatched: install.verificationReadMatched,
  },
  launcher: {
    executablePath: launcherExecutablePath,
    path: launcherPath,
    resolvesToInstalledBundle: launcherTargetPath === expectedInstalledBundle,
    targetPath: launcherTargetPath,
  },
  runtimeProbe,
  storage: {
    envCalibratedTierPresent: Boolean(launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER),
    envRequestedTierPresent: Boolean(launchEnv.OCEAN_LAB_FLUID_TIER),
    installedTier: install.installedProfile.selectedTier,
    readByMainProcess:
      runtimeProbe.selection?.mode === "calibrated-auto" &&
      runtimeProbe.selection.calibratedTier === install.installedProfile.selectedTier,
  },
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Fluid default-profile calibration report written to ${outPath}`);
console.log(`- profile: ${report.install.storageBasePath}/${report.install.fileName}`);
console.log(`- launcher: ${report.launcher.path}`);
console.log(`- selection: ${report.runtimeProbe.selection?.mode ?? "missing"} -> ${report.runtimeProbe.selectedTier}`);
console.log(`- renderer: ${report.runtimeProbe.renderer}, ${report.runtimeProbe.grid}`);
console.log(`- pixels: ${report.runtimeProbe.pixelProbe.status}/${report.runtimeProbe.pixelProbe.variety}, ${report.runtimeProbe.pixelProbe.colorBuckets} buckets`);
assert.equal(report.gate, "G-FG-34", "FG-34 evidence must use the default-profile calibration gate id");
assert.deepEqual(report.failures, [], `FG-34 failures:\n${report.failures.join("\n")}`);

async function desktopLauncherTargetPath(): Promise<string | null> {
  const stat = await lstat(launcherPath);
  if (!stat.isSymbolicLink()) return null;
  return path.resolve(path.dirname(launcherPath), await readlink(launcherPath));
}

async function launchAndProbe(launchEnv: Record<string, string>, expectedTier: string): Promise<FluidDefaultProfileRuntimeProbe> {
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
    await page.waitForFunction(
      (tier) => {
        const canvas = document.querySelector(".ocean-canvas");
        return (
          window.__fluidGridTierSelection?.mode === "calibrated-auto" &&
          window.__fluidGridTierSelection?.requestedTier === "auto" &&
          window.__fluidGridTierSelection?.calibratedTier === tier &&
          window.__fluidGridPreferredTier === tier &&
          window.__fluidGridCapabilityReport?.selectedTier === tier &&
          window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
          window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
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

    await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: timeoutMs });
    await page.getByRole("button", { name: "Drop" }).click({ timeout: timeoutMs });
    await page.waitForTimeout(350);
    const png = await page.locator(".ocean-canvas").screenshot({ timeout: timeoutMs });
    const pixelProbe = summarizePng(png);
    return await page.locator(".ocean-canvas").evaluate((canvas, pixelProbe) => ({
      capabilitySelectedTier: window.__fluidGridCapabilityReport?.selectedTier ?? null,
      grid: canvas.getAttribute("data-water-grid"),
      launchMode: "desktop-launcher",
      pixelProbe,
      renderer: canvas.getAttribute("data-water-renderer"),
      selectedGrid: {
        cellsX: window.__fluidGridCapabilityReport?.grid?.cellsX ?? 0,
        cellsY: window.__fluidGridCapabilityReport?.grid?.cellsY ?? 0,
      },
      selectedTier: canvas.getAttribute("data-water-tier"),
      selection: window.__fluidGridTierSelection ?? null,
      waterContext: canvas.getAttribute("data-water-context"),
      waterFrames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    }), pixelProbe);
  } finally {
    if (electronApp) await electronApp.close().catch(() => undefined);
  }
}

function summarizePng(buffer: Buffer): FluidDefaultProfileRuntimeProbe["pixelProbe"] {
  const image = decodePngRgba(buffer);
  const samples: number[][] = [];
  const stepX = Math.max(1, Math.floor(image.width / 64));
  const stepY = Math.max(1, Math.floor(image.height / 42));
  for (let y = 0; y < image.height; y += stepY) {
    for (let x = 0; x < image.width; x += stepX) {
      const index = (y * image.width + x) * 4;
      samples.push([image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3]]);
    }
  }
  let opaqueSamples = 0;
  let lumaTotal = 0;
  const buckets = new Set<string>();
  for (const [r, g, b, a] of samples) {
    if (a > 8) opaqueSamples += 1;
    lumaTotal += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    buckets.add(`${Math.floor(r / 24)}-${Math.floor(g / 24)}-${Math.floor(b / 24)}-${Math.floor(a / 64)}`);
  }
  const averageLuma = lumaTotal / Math.max(1, samples.length);
  return {
    averageLuma,
    colorBuckets: buckets.size,
    status: opaqueSamples > samples.length * 0.92 && averageLuma > 5 ? "nonblank" : "blank",
    variety: buckets.size >= 18 ? "varied" : "flat",
  };
}

function decodePngRgba(buffer: Buffer): { data: Buffer; height: number; width: number } {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "expected PNG signature");
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
  const stride = width * sourceBytesPerPixel;
  const unfiltered = Buffer.alloc(width * height * sourceBytesPerPixel);
  const output = Buffer.alloc(width * height * 4);
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
      const target = (y * width + x) * 4;
      output[target] = unfiltered[source];
      output[target + 1] = unfiltered[source + 1];
      output[target + 2] = unfiltered[source + 2];
      output[target + 3] = colorType === 6 ? unfiltered[source + 3] : 255;
    }
  }
  return { data: output, height, width };
}

function unfilter(filter: number, raw: number, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 0:
      return raw;
    case 1:
      return (raw + left) & 255;
    case 2:
      return (raw + up) & 255;
    case 3:
      return (raw + Math.floor((left + up) / 2)) & 255;
    case 4:
      return (raw + paeth(left, up, upLeft)) & 255;
    default:
      throw new Error(`Unsupported PNG filter ${filter}`);
  }
}

function paeth(left: number, up: number, upLeft: number): number {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function sanitizedLaunchEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
