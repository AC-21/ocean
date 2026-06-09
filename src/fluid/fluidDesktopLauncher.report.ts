import assert from "node:assert/strict";
import { access, lstat, mkdir, readFile, readlink, symlink, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import { createFluidDesktopLauncherReport, type FluidDesktopLauncherRenderProbe } from "./fluidDesktopLauncher";

const outPath = process.env.OCEAN_LAB_DESKTOP_LAUNCHER_OUT || "reports/fluid-desktop-launcher-latest.json";
const root = process.cwd();
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const installRootPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_INSTALL_ROOT || path.join(homedir(), "Applications", "Ocean Impact Lab Builds"));
const appBundlePath = path.join(installRootPath, `${appName}-darwin-${arch}`, `${appName}.app`);
const executablePath = path.join(appBundlePath, "Contents", "MacOS", appName);
const launcherPath = path.resolve(process.env.OCEAN_LAB_DESKTOP_LAUNCHER_PATH || path.join(homedir(), "Desktop", `${appName}.app`));
const launcherExecutablePath = path.join(launcherPath, "Contents", "MacOS", appName);
const renderProbePath = process.env.OCEAN_LAB_DESKTOP_LAUNCHER_RENDER_OUT || "reports/fluid-desktop-launcher-render-probe-latest.json";
const shouldWriteLauncher = process.env.OCEAN_LAB_DESKTOP_LAUNCHER_WRITE !== "0";

await access(appBundlePath);
await access(executablePath);
const launcher = await ensureLauncher();
const signing = await signingEvidence();
await quitAppIfRunning();
const renderProbe = await runRenderProbe();

const report = createFluidDesktopLauncherReport({
  generatedAt: new Date().toISOString(),
  install: {
    appBundlePath,
    executablePath,
    installRootOutsideWorkspace: !path.resolve(installRootPath).startsWith(`${path.resolve(root)}${path.sep}`),
    installRootPath,
    workspaceRoot: root,
  },
  launcher,
  renderProbe,
  signing,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Fluid desktop launcher report written to ${outPath}`);
console.log(`- launcher: ${report.launcher.path}`);
console.log(`- target: ${report.launcher.targetPath}`);
console.log(`- codesign: ${report.signing.codesignVerified ? "verified" : "failed"}`);
console.log(`- pixels: ${report.renderProbe.pixelProbe.status}/${report.renderProbe.pixelProbe.variety}, ${report.renderProbe.pixelProbe.colorBuckets} buckets`);
assert.equal(report.gate, "G-FG-33", "FG-33 evidence must use the desktop launcher gate id");
assert.deepEqual(report.failures, [], `FG-33 failures:\n${report.failures.join("\n")}`);

async function ensureLauncher(): Promise<ReturnType<typeof createFluidDesktopLauncherReport>["launcher"]> {
  await mkdir(path.dirname(launcherPath), { recursive: true });
  const current = await launcherState();
  if (current.kind === "symlink" && current.resolvesToAppBundle) return current;
  if (!shouldWriteLauncher) return current;
  if (current.kind !== "missing" && current.kind !== "symlink") return current;
  if (current.kind === "symlink") await unlink(launcherPath);
  await symlink(appBundlePath, launcherPath, "dir");
  return launcherState();
}

async function launcherState(): Promise<ReturnType<typeof createFluidDesktopLauncherReport>["launcher"]> {
  try {
    const stat = await lstat(launcherPath);
    const kind = stat.isSymbolicLink() ? "symlink" : stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other";
    const targetPath = kind === "symlink" ? path.resolve(path.dirname(launcherPath), await readlink(launcherPath)) : null;
    return {
      executablePath: launcherExecutablePath,
      kind,
      path: launcherPath,
      resolvesToAppBundle: targetPath === appBundlePath,
      targetPath,
    };
  } catch (error) {
    if (isNotFound(error)) {
      return {
        executablePath: launcherExecutablePath,
        kind: "missing",
        path: launcherPath,
        resolvesToAppBundle: false,
        targetPath: null,
      };
    }
    throw error;
  }
}

async function signingEvidence(): Promise<ReturnType<typeof createFluidDesktopLauncherReport>["signing"]> {
  const verify = await run("codesign", ["--verify", "--deep", "--strict", "--verbose=4", appBundlePath], { allowFailure: true });
  const attrs = await run("xattr", ["-lr", appBundlePath], { allowFailure: true });
  const forbiddenExtendedAttributes = Array.from(
    new Set(
      attrs.output
        .split("\n")
        .map((line) => line.match(/:\s+(com\.apple\.(?:FinderInfo|fileprovider\.fpfs#P)):/)?.[1])
        .filter((value): value is string => Boolean(value))
    )
  ).sort();
  return {
    codesignVerified: verify.code === 0,
    forbiddenExtendedAttributes,
    verifyOutput: verify.output.trim(),
  };
}

async function runRenderProbe(): Promise<FluidDesktopLauncherRenderProbe> {
  await run("node", ["scripts/fluid_render_probe.mjs"], {
    env: {
      OCEAN_LAB_FLUID_RENDER_EXECUTABLE: launcherExecutablePath,
      OCEAN_LAB_FLUID_RENDER_OUT: renderProbePath,
      OCEAN_LAB_FLUID_RENDER_USER_DATA: "default",
    },
  });
  return JSON.parse(await readFile(renderProbePath, "utf8")) as FluidDesktopLauncherRenderProbe;
}

async function quitAppIfRunning() {
  await run("osascript", ["-e", `tell application "${appName}" to quit`], { allowFailure: true });
  if (await waitForProcessExit(5000)) return;
  await run("pkill", ["-TERM", "-f", executablePath], { allowFailure: true });
  if (await waitForProcessExit(5000)) return;
  throw new Error("Timed out waiting for stale Ocean Impact Lab process before Desktop launcher render probe");
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
  return result.output
    .split("\n")
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
}

async function run(
  command: string,
  args: string[],
  options: { allowFailure?: boolean; env?: Record<string, string> } = {}
): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("exit", (code) => {
      const output = Buffer.concat(chunks).toString("utf8");
      if (code === 0 || options.allowFailure) resolve({ code: code ?? 1, output });
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}\n${output}`));
    });
  });
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
