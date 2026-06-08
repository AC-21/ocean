import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { defaultFluidFrameLoopConfig, type FluidFrameLoopStats } from "./fluidFrameLoop";

type FrameLoopSample = {
  atMs: number;
  phase: string | null;
  renderMode: string | null;
  renderer: string | null;
  stats: FluidFrameLoopStats | null;
  waterContext: string | null;
  waterFrame: number;
};

type FrameLoopSummary = {
  activeSampleCount: number;
  droppedDebtS: number;
  fixedStepS: number | null;
  maxAccumulatedSimS: number;
  maxInterpolationAlpha: number;
  maxLastSubsteps: number;
  maxSubstepsObserved: number;
  maxSubstepsPerFrame: number | null;
  sampleCount: number;
  totalSubstepsDelta: number;
  waterFrameDelta: number;
};

const timeoutMs = Number(process.env.OCEAN_LAB_FRAME_LOOP_TIMEOUT_MS || 45_000);
const sampleDurationMs = Number(process.env.OCEAN_LAB_FRAME_LOOP_SAMPLE_MS || 3_500);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_FRAME_LOOP_OUT || "reports/fluid-frame-loop-latest.json";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-frame-loop-"));
const userDataPath = await realpath(userDataRoot);

let electron: typeof import("playwright")["_electron"];
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for fluid frame-loop evidence. Original error: ${error instanceof Error ? error.message : String(error)}`);
}

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  electronApp = await electron.launch({
    args: [root],
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
    () => window.__fluidFrameLoopStats && Number(document.querySelector(".ocean-canvas")?.getAttribute("data-water-frames") ?? 0) >= 12,
    undefined,
    { timeout: timeoutMs }
  );

  await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: timeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: timeoutMs });
  const samples = (await page.evaluate(collectFrameLoopSamples, sampleDurationMs)) as FrameLoopSample[];
  const summary = summarizeFrameLoopSamples(samples);
  const finalTelemetry = samples[samples.length - 1] ?? null;
  const failures = [
    ...rendererFailures(finalTelemetry),
    ...(summary.fixedStepS !== null && Math.abs(summary.fixedStepS - defaultFluidFrameLoopConfig.fixedStepS) < 1e-9
      ? []
      : [`expected fixed step ${defaultFluidFrameLoopConfig.fixedStepS}, got ${summary.fixedStepS}`]),
    ...(summary.maxSubstepsPerFrame === defaultFluidFrameLoopConfig.maxSubstepsPerFrame ? [] : ["frame loop did not expose the configured max-substep guard"]),
    ...(summary.maxLastSubsteps <= defaultFluidFrameLoopConfig.maxSubstepsPerFrame ? [] : ["frame loop exceeded the per-frame substep guard"]),
    ...(summary.activeSampleCount > 0 ? [] : ["drop run did not produce active fixed-step samples"]),
    ...(summary.totalSubstepsDelta > 0 ? [] : ["drop run did not advance fixed-step physics"]),
    ...(summary.waterFrameDelta > 0 ? [] : ["water renderer did not advance during the frame-loop sample"]),
    ...(summary.maxAccumulatedSimS <= defaultFluidFrameLoopConfig.fixedStepS + 1e-6 ? [] : ["simulation debt exceeded one fixed step at normal speed"]),
    ...(summary.droppedDebtS <= 1e-9 ? [] : ["normal-speed drop accumulated dropped simulation debt"]),
    ...(consoleErrors.length === 0 ? [] : [`Electron console errors: ${consoleErrors.join(" | ")}`]),
    ...(pageErrors.length === 0 ? [] : [`Electron page errors: ${pageErrors.join(" | ")}`]),
  ];

  const report = {
    gate: "G-FG-08",
    generatedAt: new Date().toISOString(),
    pass: failures.length === 0,
    config: defaultFluidFrameLoopConfig,
    failures,
    summary,
    telemetry: finalTelemetry
      ? {
          phase: finalTelemetry.phase,
          renderMode: finalTelemetry.renderMode,
          renderer: finalTelemetry.renderer,
          waterContext: finalTelemetry.waterContext,
        }
      : null,
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid frame-loop report written to ${outPath}`);
  console.log(`- fixed step: ${summary.fixedStepS?.toFixed(6) ?? "missing"} s, max substeps/frame ${summary.maxSubstepsObserved}/${summary.maxSubstepsPerFrame}`);
  console.log(`- active samples: ${summary.activeSampleCount}, physics steps: ${summary.totalSubstepsDelta}, water frames: ${summary.waterFrameDelta}`);
  console.log(`- debt: accumulated ${summary.maxAccumulatedSimS.toFixed(6)} s, dropped ${summary.droppedDebtS.toFixed(6)} s`);

  if (!report.pass) {
    console.error("FG-08 frame-loop gate failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

function collectFrameLoopSamples(durationMs: number): Promise<FrameLoopSample[]> {
  return new Promise((resolve) => {
    const samples: FrameLoopSample[] = [];
    let start = 0;
    const sample = (now: number) => {
      if (start === 0) start = now;
      const stage = document.querySelector(".simulation-stage");
      const canvas = document.querySelector(".ocean-canvas");
      samples.push({
        atMs: now - start,
        phase: document.querySelector(".stage-toolbar strong")?.textContent?.trim() ?? null,
        renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
        renderer: canvas?.getAttribute("data-water-renderer") ?? null,
        stats: window.__fluidFrameLoopStats ? { ...window.__fluidFrameLoopStats } : null,
        waterContext: canvas?.getAttribute("data-water-context") ?? null,
        waterFrame: Number(canvas?.getAttribute("data-water-frames") ?? 0),
      });
      if (now - start >= durationMs) {
        resolve(samples);
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

function summarizeFrameLoopSamples(samples: FrameLoopSample[]): FrameLoopSummary {
  const stats = samples.map((sample) => sample.stats).filter((value): value is FluidFrameLoopStats => value !== null);
  const firstStats = stats[0] ?? null;
  const lastStats = stats[stats.length - 1] ?? null;
  const firstWater = samples[0]?.waterFrame ?? 0;
  const lastWater = samples[samples.length - 1]?.waterFrame ?? firstWater;
  return {
    activeSampleCount: stats.filter((entry) => entry.lastSubsteps > 0).length,
    droppedDebtS: lastStats?.droppedDebtS ?? 0,
    fixedStepS: lastStats?.fixedStepS ?? null,
    maxAccumulatedSimS: maxOf(stats.map((entry) => entry.accumulatedSimS)),
    maxInterpolationAlpha: maxOf(stats.map((entry) => entry.interpolationAlpha)),
    maxLastSubsteps: maxOf(stats.map((entry) => entry.lastSubsteps)),
    maxSubstepsObserved: lastStats?.maxSubstepsObserved ?? 0,
    maxSubstepsPerFrame: lastStats?.maxSubstepsPerFrame ?? null,
    sampleCount: samples.length,
    totalSubstepsDelta: Math.max(0, (lastStats?.totalSubsteps ?? 0) - (firstStats?.totalSubsteps ?? 0)),
    waterFrameDelta: Math.max(0, lastWater - firstWater),
  };
}

function rendererFailures(sample: FrameLoopSample | null): string[] {
  if (!sample) return ["frame-loop report did not collect samples"];
  const failures: string[] = [];
  if (sample.renderMode !== "webgpu") failures.push(`expected WebGPU render mode, got ${sample.renderMode}`);
  if (sample.renderer !== "webgpu-grid-primary-v1") failures.push(`expected WebGPU grid renderer, got ${sample.renderer}`);
  if (sample.waterContext !== "webgpu") failures.push(`expected webgpu canvas context, got ${sample.waterContext}`);
  return failures;
}

function maxOf(values: number[]): number {
  return values.length > 0 ? Math.max(...values) : 0;
}
