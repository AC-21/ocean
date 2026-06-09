import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createFluidDesktopProbeIsolationReport, type FluidDesktopProbeIsolationRenderProbe } from "./fluidDesktopProbeIsolation";

type ElectronController = {
  launch: (options: { env: Record<string, string>; executablePath: string; timeout: number }) => Promise<any>;
};

type ElectronPage = {
  getByRole: (...args: any[]) => { waitFor: (options: { state: string; timeout: number }) => Promise<void> };
  locator: (selector: string) => { evaluate: <T>(callback: (element: HTMLCanvasElement) => T) => Promise<T> };
  waitForFunction: (...args: any[]) => Promise<void>;
};

type DefaultTelemetry = {
  frames: number;
  renderer: string | null;
  waterContext: string | null;
};

const appName = "Ocean Impact Lab";
const timeoutMs = Number(process.env.OCEAN_LAB_DESKTOP_PROBE_ISOLATION_TIMEOUT_MS || 45_000);
const outPath = process.env.OCEAN_LAB_DESKTOP_PROBE_ISOLATION_OUT || "reports/fluid-desktop-probe-isolation-latest.json";
const renderProbePath =
  process.env.OCEAN_LAB_DESKTOP_PROBE_ISOLATION_RENDER_OUT || "reports/fluid-desktop-probe-isolation-render-probe-latest.json";
const launcherPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_LAUNCHER_PATH || path.join(homedir(), "Desktop", `${appName}.app`));
const installedBundlePath =
  process.env.OCEAN_LAB_DESKTOP_INSTALLED_BUNDLE ||
  path.join(homedir(), "Applications", "Ocean Impact Lab Builds", `${appName}-darwin-${process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch}`, `${appName}.app`);
const executablePath = path.join(installedBundlePath, "Contents", "MacOS", appName);

const electronMainPath = "electron/main.cjs";
const electronMain = await readFile(electronMainPath, "utf8");
const userDataOverrideIndex = electronMain.indexOf('app.setPath("userData", process.env.HARBORLINE_USER_DATA_DIR)');
const singleInstanceLockIndex = electronMain.indexOf("app.requestSingleInstanceLock()");
const launcherTargetPath = await desktopLauncherTargetPath();

let electron: ElectronController;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for FG-49 Desktop probe isolation. Original error: ${error instanceof Error ? error.message : String(error)}`);
}

await quitAppIfRunning();

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
let defaultBefore: DefaultTelemetry = { frames: 0, renderer: null, waterContext: null };
let defaultAfter: DefaultTelemetry = { frames: 0, renderer: null, waterContext: null };
let defaultAliveAfterProbe = false;
try {
  electronApp = await electron.launch({
    executablePath,
    env: cleanDefaultEnv(),
    timeout: timeoutMs,
  });
  const page = await electronApp.firstWindow({ timeout: timeoutMs });
  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: timeoutMs });
  defaultBefore = await waitForDefaultTelemetry(page);
  const temporaryProbe = await runTemporaryProbe();
  defaultAfter = await readDefaultTelemetry(page).catch(() => ({ frames: 0, renderer: null, waterContext: null }));
  defaultAliveAfterProbe = defaultAfter.frames >= defaultBefore.frames && defaultAfter.renderer === "webgpu-grid-primary-v1";

  const report = createFluidDesktopProbeIsolationReport({
    defaultInstance: {
      aliveAfterProbe: defaultAliveAfterProbe,
      framesAfterProbe: defaultAfter.frames,
      framesBeforeProbe: defaultBefore.frames,
      launchMode: "packaged-executable",
      renderer: defaultBefore.renderer,
      userData: "default",
      waterContext: defaultBefore.waterContext,
    },
    electronBootstrap: {
      singleInstanceLockIndex,
      sourcePath: electronMainPath,
      userDataOverrideBeforeSingleInstanceLock:
        userDataOverrideIndex >= 0 && singleInstanceLockIndex >= 0 && userDataOverrideIndex < singleInstanceLockIndex,
      userDataOverrideIndex,
    },
    launcher: {
      executablePath,
      path: launcherPath,
      targetPath: launcherTargetPath,
    },
    temporaryProbe,
  });

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid Desktop probe isolation report written to ${outPath}`);
  console.log(`- default frames: ${report.defaultInstance.framesBeforeProbe} -> ${report.defaultInstance.framesAfterProbe}`);
  console.log(`- bootstrap order: userData before lock = ${report.electronBootstrap.userDataOverrideBeforeSingleInstanceLock}`);
  console.log(`- temporary probe: exit ${report.temporaryProbe.exitCode}, userData=${report.temporaryProbe.report?.userData ?? "missing"}`);
  console.log(
    `- pixels: ${report.temporaryProbe.report?.pixelProbe.status ?? "missing"}/` +
      `${report.temporaryProbe.report?.pixelProbe.variety ?? "missing"}, ` +
      `${report.temporaryProbe.report?.pixelProbe.colorBuckets ?? 0} buckets`
  );
  assert.equal(report.gate, "G-FG-49", "FG-49 evidence must use the Desktop probe isolation gate id");
  assert.deepEqual(report.failures, [], `FG-49 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await quitAppIfRunning().catch(() => undefined);
}

async function waitForDefaultTelemetry(page: ElectronPage) {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector(".ocean-canvas");
      return (
        canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
        canvas?.getAttribute("data-water-context") === "webgpu" &&
        Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 6
      );
    },
    undefined,
    { timeout: timeoutMs }
  );
  return readDefaultTelemetry(page);
}

async function readDefaultTelemetry(
  page: ElectronPage
): Promise<DefaultTelemetry> {
  return page.locator(".ocean-canvas").evaluate((canvas) => ({
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    renderer: canvas.getAttribute("data-water-renderer"),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}

async function runTemporaryProbe() {
  await rm(renderProbePath, { force: true });
  const result = await run("node", ["scripts/fluid_render_probe.mjs"], {
    allowFailure: true,
    env: {
      ...cleanDefaultEnv(),
      OCEAN_LAB_FLUID_RENDER_EXECUTABLE: executablePath,
      OCEAN_LAB_FLUID_RENDER_OUT: renderProbePath,
    },
  });
  const report = await readRenderProbe(renderProbePath).catch(() => null);
  return {
    exitCode: result.code,
    report,
    reportPath: renderProbePath,
    stderrTail: tail(result.stderr),
    stdoutTail: tail(result.stdout),
    succeededWhileDefaultAlive: result.code === 0 && Boolean(report?.pass) && report?.userData === "temporary",
  };
}

async function readRenderProbe(filePath: string): Promise<FluidDesktopProbeIsolationRenderProbe> {
  return JSON.parse(await readFile(filePath, "utf8")) as FluidDesktopProbeIsolationRenderProbe;
}

async function desktopLauncherTargetPath() {
  const stat = await lstat(launcherPath);
  if (!stat.isSymbolicLink()) return null;
  return path.resolve(path.dirname(launcherPath), await readlink(launcherPath));
}

async function quitAppIfRunning() {
  await run("osascript", ["-e", `tell application "${appName}" to quit`], { allowFailure: true });
  if (await waitForProcessExit(5000)) return;
  await run("pkill", ["-TERM", "-f", executablePath], { allowFailure: true });
  if (await waitForProcessExit(5000)) return;
  throw new Error("Timed out waiting for Ocean Impact Lab to exit before FG-49 probe isolation");
}

async function waitForProcessExit(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pids = await processPids();
    if (pids.length === 0) return true;
    await delay(250);
  }
  return false;
}

async function processPids() {
  const result = await run("pgrep", ["-f", executablePath], { allowFailure: true });
  if (result.code !== 0) return [];
  return result.stdout
    .split("\n")
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
}

function cleanDefaultEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[key] = value;
  }
  delete env.HARBORLINE_USER_DATA_DIR;
  delete env.OCEAN_LAB_CALIBRATED_FLUID_TIER;
  delete env.OCEAN_LAB_EXPERIMENTAL_FLUID_GRID;
  delete env.OCEAN_LAB_FLUID_RENDER_USER_DATA;
  delete env.OCEAN_LAB_FLUID_TIER;
  return env;
}

function run(
  command: string,
  args: string[],
  options: { allowFailure?: boolean; env?: Record<string, string> } = {}
): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("exit", (code) => {
      const result = {
        code: code ?? 1,
        stderr: Buffer.concat(stderr).toString("utf8"),
        stdout: Buffer.concat(stdout).toString("utf8"),
      };
      if (result.code === 0 || options.allowFailure) resolve(result);
      else reject(new Error(`${command} ${args.join(" ")} exited with ${result.code}\n${result.stderr || result.stdout}`));
    });
  });
}

function tail(value: string) {
  return value.trim().slice(-2000);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
