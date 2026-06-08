import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_PRESSURE_GRADIENT_TIMEOUT_MS || 30_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_PRESSURE_GRADIENT_OUT || "reports/fluid-pressure-gradient-latest.json";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-pressure-gradient-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the pressure-gradient benchmark. Original error: ${error instanceof Error ? error.message : String(error)}`);
}

let electronApp;
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
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: timeoutMs });
  await page.waitForFunction(
    () => window.__fluidGridCapabilityReport && window.__fluidGridCapabilityReport.status !== "checking",
    undefined,
    { timeout: timeoutMs }
  );
  await page.waitForFunction(() => typeof window.__runShallowWaterBenchmark === "function", undefined, { timeout: timeoutMs });

  const capability = await page.evaluate(() => window.__fluidGridCapabilityReport ?? null);
  assert.equal(capability?.status, "webgpu-ready", "FG-15 requires a WebGPU-ready Electron runtime");

  const standard = await page.evaluate(() =>
    window.__runShallowWaterBenchmark?.({
      tier: "standard",
      steps: 120,
      capability: window.__fluidGridCapabilityReport,
      pressureGradient: true,
      requestGpuTimestamps: true,
    })
  );
  const high = await page.evaluate(() =>
    window.__runShallowWaterBenchmark?.({
      tier: "high",
      steps: 96,
      capability: window.__fluidGridCapabilityReport,
      pressureGradient: true,
      requestGpuTimestamps: true,
    })
  );

  assertPressureTier("standard", standard);
  assertPressureTier("high", high);
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-15",
    pass: standard.pass && high.pass,
    capability,
    tiers: {
      standard,
      high,
    },
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid pressure-gradient report written to ${outPath}`);
  console.log(
    `- standard: ${standard.plan.cellsX}x${standard.plan.cellsY}, pressure ${standard.plan.pressureGain.toFixed(3)}, mass drift ${standard.diagnostics.massRelativeDrift.toExponential(3)}, energy drift ${standard.diagnostics.pressure.energyRelativeDrift.toFixed(4)}, ${formatGpuTiming(standard)}`
  );
  console.log(
    `- high: ${high.plan.cellsX}x${high.plan.cellsY}, pressure ${high.plan.pressureGain.toFixed(3)}, mass drift ${high.diagnostics.massRelativeDrift.toExponential(3)}, energy drift ${high.diagnostics.pressure.energyRelativeDrift.toFixed(4)}, ${formatGpuTiming(high)}`
  );
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

function assertPressureTier(name, report) {
  assert.ok(report, `${name} pressure-gradient benchmark should return a report`);
  assert.equal(report.pass, true, `${name} pressure-gradient benchmark failed: ${JSON.stringify(report, null, 2)}`);
  assert.equal(report.solver, "bounded-pressure-gradient-v1", "FG-15 requires the bounded pressure-gradient solver");
  assert.equal(report.noFullGridReadbackPerFrame, true, "benchmark must not rely on full-grid readback per frame");
  assert.equal(report.plan.pressureGradient, true, `${name} tier must enable pressure-gradient acceleration`);
  assert.ok(report.plan.pressureGain > 0, `${name} tier must use nonzero pressure gain`);
  assert.equal(report.diagnostics.negativeDepthCells, 0, `${name} tier must not generate negative depths`);
  assert.equal(report.diagnostics.dryCellsWithWater, 0, `${name} tier must not leak water or momentum into dry cells`);
  assert.ok(report.diagnostics.massRelativeDrift <= report.threshold.maxMassRelativeDrift, `${name} mass drift exceeded threshold`);
  assert.equal(report.diagnostics.pressure.active, true, `${name} pressure diagnostics must be active`);
  assert.ok(report.diagnostics.pressure.pressureWorkEstimateJ > 0, `${name} pressure work estimate must be nonzero`);
  assert.ok(report.diagnostics.pressure.slopeLimitedCells > 0, `${name} slope limiter must report active cells`);
  assert.ok(
    report.diagnostics.pressure.energyRelativeDrift <= report.threshold.maxPressureEnergyRelativeDrift,
    `${name} pressure energy drift exceeded threshold`
  );
  assert.ok(
    report.diagnostics.pressure.momentumGrowthRatio <= report.threshold.maxPressureMomentumGrowthRatio,
    `${name} pressure momentum growth exceeded threshold`
  );
  assert.equal(report.gpuTiming.timestampQueryEnabled, true, `${name} tier should use timestamp-query timing on this local GPU`);
  assert.ok(report.gpuTiming.sampleCount > 0, `${name} tier must report GPU timestamp samples`);
}

function formatGpuTiming(report) {
  if (!report.gpuTiming?.timestampQueryEnabled || report.gpuTiming.averageStepMs === null) return "GPU timestamp unavailable";
  return `${report.gpuTiming.averageStepMs.toFixed(4)} ms/step GPU`;
}
