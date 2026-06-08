import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFluidLocalCalibrationReport, type FluidLocalCalibrationScenarioInput, type FramePacingSample } from "./fluidLocalCalibration";
import type { FluidCapabilityReport } from "./webgpuCapability";
import type { FluidGridBenchmarkReport } from "./fluidGridGpu";

const timeoutMs = Number(process.env.OCEAN_LAB_LOCAL_CALIBRATION_TIMEOUT_MS || 60_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_LOCAL_CALIBRATION_OUT || "reports/fluid-local-calibration-latest.json";
const idleDurationMs = Number(process.env.OCEAN_LAB_LOCAL_CALIBRATION_IDLE_MS || 2_500);
const dropDurationMs = Number(process.env.OCEAN_LAB_LOCAL_CALIBRATION_DROP_MS || 5_000);
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_LOCAL_CALIBRATION_TARGET === "packaged" ? "packaged-app" : "electron-source";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-local-calibration-"));
const userDataPath = await realpath(userDataRoot);

let electron: typeof import("playwright")["_electron"];
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for local fluid calibration. Original error: ${error instanceof Error ? error.message : String(error)}`);
}

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }
  electronApp = await electron.launch({
    ...(launchMode === "packaged-app" ? { executablePath: packagedExecutablePath } : { args: [root] }),
    env: {
      ...process.env,
      HARBORLINE_USER_DATA_DIR: userDataPath,
    },
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
    () => {
      const canvas = document.querySelector(".ocean-canvas");
      return canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" && Number(canvas.getAttribute("data-water-frames") ?? 0) >= 12;
    },
    undefined,
    { timeout: timeoutMs }
  );

  const capability = await page.evaluate(() => window.__fluidGridCapabilityReport ?? null) as FluidCapabilityReport | null;
  assert.equal(capability?.status, "webgpu-ready", "FG-07 requires WebGPU capability in the local desktop runtime");

  const gridBenchmark = await page.evaluate(() =>
    window.__runFluidGridBenchmark?.({
      capability: window.__fluidGridCapabilityReport,
      requestGpuTimestamps: true,
      steps: 120,
      tier: "high",
    })
  ) as FluidGridBenchmarkReport | null;
  assert.ok(gridBenchmark, "FG-07 requires a high-tier local GPU benchmark");

  const scenarios: FluidLocalCalibrationScenarioInput[] = [];
  scenarios.push(await measureScenario(page, "idle-high-tier", "Idle high-tier WebGPU water", idleDurationMs));

  await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: timeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: timeoutMs });
  scenarios.push(await measureScenario(page, "concrete-cube-drop", "Concrete cube drop with splash coupling", dropDurationMs));

  const report = createFluidLocalCalibrationReport({
    capability,
    generatedAt: new Date().toISOString(),
    gridBenchmark,
    runtime: {
      executablePath: launchMode === "packaged-app" ? packagedExecutablePath : null,
      launchMode,
    },
    scenarios,
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Local fluid calibration written to ${outPath}`);
  console.log(`- runtime: ${report.runtime.launchMode}${report.runtime.executablePath ? ` (${report.runtime.executablePath})` : ""}`);
  console.log(`- GPU timing: ${formatGpuTiming(report.gpuEvidence)}`);
  for (const scenario of report.scenarios) {
    console.log(
      `- ${scenario.id}: ${scenario.framePacing.averageFps.toFixed(1)} FPS, p95 ${scenario.framePacing.p95FrameMs.toFixed(2)} ms, p99 ${scenario.framePacing.p99FrameMs.toFixed(2)} ms, dropped ${(scenario.framePacing.droppedFrameRatio * 100).toFixed(1)}%, ${scenario.framePacing.stability}`
    );
  }
  if (!report.pass) {
    console.error("FG-07 local calibration failed:");
    for (const failure of report.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function measureScenario(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  id: string,
  label: string,
  durationMs: number
): Promise<FluidLocalCalibrationScenarioInput> {
  const samples = await page.evaluate(collectFrameSamples, durationMs) as FramePacingSample[];
  const telemetry = await page.locator(".simulation-stage").evaluate((stage) => {
    const canvas = stage.querySelector(".ocean-canvas") as HTMLCanvasElement | null;
    const phase = stage.querySelector(".stage-toolbar strong")?.textContent?.trim() ?? null;
    return {
      finalPhase: phase,
      fluidCapability: stage.getAttribute("data-fluid-capability"),
      renderMode: stage.getAttribute("data-water-render-mode"),
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      tier: canvas?.getAttribute("data-water-tier") ?? null,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
    };
  });
  return { id, label, samples, telemetry };
}

function collectFrameSamples(durationMs: number): Promise<FramePacingSample[]> {
  return new Promise((resolve) => {
    const samples: FramePacingSample[] = [];
    let start = 0;
    let last = 0;
    const sample = (now: number) => {
      if (start === 0) {
        start = now;
        last = now;
      }
      const stage = document.querySelector(".simulation-stage");
      const canvas = document.querySelector(".ocean-canvas");
      const phase = document.querySelector(".stage-toolbar strong")?.textContent?.trim() ?? null;
      samples.push({
        atMs: now - start,
        dtMs: now - last,
        phase,
        renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
        renderer: canvas?.getAttribute("data-water-renderer") ?? null,
        tier: canvas?.getAttribute("data-water-tier") ?? null,
        waterContext: canvas?.getAttribute("data-water-context") ?? null,
        waterFrame: Number(canvas?.getAttribute("data-water-frames") ?? 0),
      });
      last = now;
      if (now - start >= durationMs) {
        resolve(samples);
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

function formatGpuTiming(evidence: { highTierGpuAverageStepMs: number | null; highTierGpuP95StepMs: number | null; highTierGpuSampleCount: number; timestampQueryUsed: boolean }) {
  if (!evidence.timestampQueryUsed || evidence.highTierGpuAverageStepMs === null) return "timestamp-query unavailable";
  return `${evidence.highTierGpuAverageStepMs.toFixed(4)} ms avg, ${evidence.highTierGpuP95StepMs?.toFixed(4) ?? "n/a"} ms p95, ${evidence.highTierGpuSampleCount} samples`;
}
