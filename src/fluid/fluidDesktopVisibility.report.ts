import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { lstat, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { inflateSync } from "node:zlib";
import {
  createFluidDesktopVisibilityReport,
  type FluidDesktopVisibilityPixelProbe,
  type FluidDesktopVisibilityReport,
} from "./fluidDesktopVisibility";

type DefaultProfileEvidence = {
  gate: string;
  pass: boolean;
  runtimeProbe: {
    grid: string | null;
    renderer: string | null;
    selectedTier: string | null;
    selection: {
      mode?: string;
    } | null;
    waterContext: string | null;
  };
};

type WindowState = FluidDesktopVisibilityReport["window"];

const execFileAsync = promisify(execFile);
const appName = "Ocean Impact Lab";
const timeoutMs = Number(process.env.OCEAN_LAB_DESKTOP_VISIBILITY_TIMEOUT_MS || 30_000);
const outPath = process.env.OCEAN_LAB_DESKTOP_VISIBILITY_OUT || "reports/fluid-desktop-visibility-latest.json";
const screenshotPath = process.env.OCEAN_LAB_DESKTOP_VISIBILITY_SCREENSHOT || "reports/fluid-desktop-visibility-latest.png";
const defaultProfileEvidencePath =
  process.env.OCEAN_LAB_DESKTOP_VISIBILITY_DEFAULT_PROFILE_IN || "reports/fluid-default-profile-calibration-latest.json";
const launcherPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_LAUNCHER_PATH || path.join(homedir(), "Desktop", `${appName}.app`));
const expectedInstalledBundle =
  process.env.OCEAN_LAB_DESKTOP_INSTALLED_BUNDLE ||
  path.join(homedir(), "Applications", "Ocean Impact Lab Builds", `${appName}-darwin-${process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch}`, `${appName}.app`);

const defaultProfileEvidence = await readJson<DefaultProfileEvidence>(defaultProfileEvidencePath);
const launcherTargetPath = await desktopLauncherTargetPath();

await quitAppIfRunning();
await runCommand("open", [launcherPath]);
await waitForInstalledProcess();
await waitForWindow();
await activateApp();
const windowState = await waitForFrontmostWindow();
await mkdir(path.dirname(screenshotPath), { recursive: true });
await runCommand("screencapture", ["-x", screenshotPath]);
const fullScreen = decodePngRgba(await readFile(screenshotPath));
const crop = oceanViewportCrop(windowState, fullScreen.width, fullScreen.height);
const pixelProbe = summarizeCrop(fullScreen, crop);
const processInfo = await installedProcessInfo();

const report = createFluidDesktopVisibilityReport({
  defaultProfileEvidence: {
    gate: defaultProfileEvidence.gate,
    grid: defaultProfileEvidence.runtimeProbe.grid,
    mode: defaultProfileEvidence.runtimeProbe.selection?.mode ?? null,
    pass: defaultProfileEvidence.pass,
    renderer: defaultProfileEvidence.runtimeProbe.renderer,
    selectedTier: defaultProfileEvidence.runtimeProbe.selectedTier,
    sourcePath: defaultProfileEvidencePath,
    waterContext: defaultProfileEvidence.runtimeProbe.waterContext,
  },
  launcher: {
    path: launcherPath,
    resolvesToInstalledBundle: launcherTargetPath === expectedInstalledBundle,
    targetPath: launcherTargetPath,
  },
  process: processInfo,
  viewportProbe: {
    crop,
    pixelProbe,
    screenshotPath,
  },
  window: windowState,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Fluid desktop visibility report written to ${outPath}`);
console.log(`- launcher: ${report.launcher.path}`);
console.log(`- process: ${report.process.pid} ${report.process.installedBundleProcess ? "installed" : "unexpected"}`);
console.log(`- window: ${report.window.title}, ${report.window.width} x ${report.window.height}, frontmost=${report.window.frontmost}`);
console.log(`- crop: ${report.viewportProbe.crop.width} x ${report.viewportProbe.crop.height}`);
console.log(
  `- pixels: ${report.viewportProbe.pixelProbe.status}/${report.viewportProbe.pixelProbe.variety}, ` +
    `${report.viewportProbe.pixelProbe.colorBuckets} buckets, luma ${report.viewportProbe.pixelProbe.averageLuma.toFixed(2)}`
);
assert.equal(report.gate, "G-FG-35", "FG-35 evidence must use the desktop visibility gate id");
assert.deepEqual(report.failures, [], `FG-35 failures:\n${report.failures.join("\n")}`);

async function quitAppIfRunning() {
  await runCommand("osascript", ["-e", `tell application "${appName}" to quit`]).catch(() => undefined);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const process = await installedProcessInfo().catch(() => null);
    if (!process) return;
    await delay(250);
  }
}

async function waitForInstalledProcess() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const process = await installedProcessInfo().catch(() => null);
    if (process?.installedBundleProcess) return;
    await delay(250);
  }
  throw new Error("Timed out waiting for installed Ocean Impact Lab process");
}

async function waitForWindow() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await readWindowState().catch(() => null);
    if (state && state.visible && state.windowCount >= 1 && state.onScreen) return state;
    await delay(250);
  }
  throw new Error("Timed out waiting for visible Ocean Impact Lab window");
}

async function waitForFrontmostWindow(): Promise<WindowState> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await activateApp().catch(() => undefined);
    const state = await readWindowState().catch(() => null);
    if (state && state.visible && state.frontmost && state.windowCount >= 1 && state.onScreen) return state;
    await delay(250);
  }
  throw new Error("Timed out waiting for frontmost Ocean Impact Lab window");
}

async function activateApp() {
  await runCommand("osascript", [
    "-e",
    `tell application "${appName}" to activate`,
    "-e",
    `tell application "System Events" to set frontmost of application process "${appName}" to true`,
  ]);
}

async function readWindowState(): Promise<WindowState> {
  const script = `
set AppleScript's text item delimiters to "|"
tell application "System Events"
  tell application process "${appName}"
    set w to window 1
    set p to position of w
    set s to size of w
    return (visible as text) & "|" & (frontmost as text) & "|" & ((count of windows) as text) & "|" & (name of w) & "|" & ((item 1 of p) as text) & "|" & ((item 2 of p) as text) & "|" & ((item 1 of s) as text) & "|" & ((item 2 of s) as text)
  end tell
end tell
`;
  const output = await runCommand("osascript", ["-e", script]);
  const [visible, frontmost, windowCount, title, x, y, width, height] = output.trim().split("|");
  const state = {
    frontmost: frontmost === "true",
    height: Number(height),
    onScreen: Number(x) > -40 && Number(y) > -40 && Number(width) > 0 && Number(height) > 0,
    title,
    visible: visible === "true",
    width: Number(width),
    windowCount: Number(windowCount),
    x: Number(x),
    y: Number(y),
  };
  return state;
}

async function installedProcessInfo(): Promise<FluidDesktopVisibilityReport["process"]> {
  const output = await runCommand("pgrep", ["-afil", appName]);
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const line = lines.find((candidate) => candidate.includes(`${expectedInstalledBundle}/Contents/MacOS/${appName}`));
  if (!line) throw new Error("Installed Ocean Impact Lab process was not found");
  const firstSpace = line.indexOf(" ");
  const pid = Number(line.slice(0, firstSpace));
  const command = line.slice(firstSpace + 1);
  return {
    command,
    installedBundleProcess: command.includes(`${expectedInstalledBundle}/Contents/MacOS/${appName}`),
    pid,
  };
}

async function desktopLauncherTargetPath(): Promise<string | null> {
  const stat = await lstat(launcherPath);
  if (!stat.isSymbolicLink()) return null;
  return path.resolve(path.dirname(launcherPath), await readlink(launcherPath));
}

function oceanViewportCrop(window: WindowState, screenWidth: number, screenHeight: number) {
  const x = Math.round(window.x + window.width * 0.29);
  const y = Math.round(window.y + window.height * 0.18);
  const width = Math.round(window.width * 0.45);
  const height = Math.round(window.height * 0.52);
  return {
    height: Math.max(1, Math.min(height, screenHeight - y)),
    width: Math.max(1, Math.min(width, screenWidth - x)),
    x: Math.max(0, Math.min(x, screenWidth - 1)),
    y: Math.max(0, Math.min(y, screenHeight - 1)),
  };
}

function summarizeCrop(
  image: { data: Buffer; height: number; width: number },
  crop: { height: number; width: number; x: number; y: number }
): FluidDesktopVisibilityPixelProbe {
  let samples = 0;
  let opaqueSamples = 0;
  let lumaTotal = 0;
  let minLuma = Number.POSITIVE_INFINITY;
  let maxLuma = 0;
  const buckets = new Set<string>();
  const stepX = Math.max(1, Math.floor(crop.width / 72));
  const stepY = Math.max(1, Math.floor(crop.height / 48));
  for (let y = crop.y; y < crop.y + crop.height; y += stepY) {
    for (let x = crop.x; x < crop.x + crop.width; x += stepX) {
      const index = (y * image.width + x) * 4;
      const r = image.data[index];
      const g = image.data[index + 1];
      const b = image.data[index + 2];
      const a = image.data[index + 3];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      samples += 1;
      if (a > 8) opaqueSamples += 1;
      lumaTotal += luma;
      minLuma = Math.min(minLuma, luma);
      maxLuma = Math.max(maxLuma, luma);
      buckets.add(`${Math.floor(r / 20)}-${Math.floor(g / 20)}-${Math.floor(b / 20)}-${Math.floor(a / 64)}`);
    }
  }
  const averageLuma = lumaTotal / Math.max(1, samples);
  return {
    averageLuma,
    colorBuckets: buckets.size,
    status: opaqueSamples > samples * 0.92 && averageLuma > 10 ? "nonblank" : "blank",
    variety: buckets.size >= 18 && maxLuma - minLuma >= 24 ? "varied" : "flat",
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

async function runCommand(command: string, args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    maxBuffer: 1024 * 1024 * 16,
  });
  return `${stdout}${stderr}`;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
