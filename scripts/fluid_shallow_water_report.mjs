import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_SHALLOW_WATER_TIMEOUT_MS || 30_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_SHALLOW_WATER_OUT || "reports/fluid-shallow-water-latest.json";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-shallow-water-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the shallow-water benchmark. Original error: ${error instanceof Error ? error.message : String(error)}`);
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
  assert.equal(capability?.status, "webgpu-ready", "FG-11 requires a WebGPU-ready Electron runtime");

  const standard = await page.evaluate(() =>
    window.__runShallowWaterBenchmark?.({ tier: "standard", steps: 96, capability: window.__fluidGridCapabilityReport, requestGpuTimestamps: true })
  );
  const high = await page.evaluate(() =>
    window.__runShallowWaterBenchmark?.({ tier: "high", steps: 72, capability: window.__fluidGridCapabilityReport, requestGpuTimestamps: true })
  );
  assert.ok(standard, "standard tier shallow-water benchmark should return a report");
  assert.ok(high, "high tier shallow-water benchmark should return a report");
  assert.equal(standard.pass, true, `standard shallow-water benchmark failed: ${JSON.stringify(standard, null, 2)}`);
  assert.equal(high.pass, true, `high shallow-water benchmark failed: ${JSON.stringify(high, null, 2)}`);
  assert.equal(standard.solver, "conservative-shallow-water-v1", "FG-11 requires the conservative shallow-water solver");
  assert.equal(high.solver, "conservative-shallow-water-v1", "FG-11 requires the conservative shallow-water solver");
  assert.equal(standard.noFullGridReadbackPerFrame, true, "benchmark must not rely on full-grid readback per frame");
  assert.equal(standard.diagnostics.negativeDepthCells, 0, "standard tier must not generate negative depths");
  assert.equal(high.diagnostics.negativeDepthCells, 0, "high tier must not generate negative depths");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-11",
    pass: standard.pass && high.pass,
    capability,
    tiers: {
      standard,
      high,
    },
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid shallow-water report written to ${outPath}`);
  console.log(
    `- standard: ${standard.plan.cellsX}x${standard.plan.cellsY}, mass drift ${standard.diagnostics.massRelativeDrift.toFixed(6)}, momentum damping ${standard.diagnostics.momentumDampingRatio.toFixed(3)}, ${formatGpuTiming(standard)}`
  );
  console.log(
    `- high: ${high.plan.cellsX}x${high.plan.cellsY}, mass drift ${high.diagnostics.massRelativeDrift.toFixed(6)}, momentum damping ${high.diagnostics.momentumDampingRatio.toFixed(3)}, ${formatGpuTiming(high)}`
  );
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

function formatGpuTiming(report) {
  if (!report.gpuTiming?.timestampQueryEnabled || report.gpuTiming.averageStepMs === null) return "GPU timestamp unavailable";
  return `${report.gpuTiming.averageStepMs.toFixed(4)} ms/step GPU`;
}
