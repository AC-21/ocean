import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_FLUID_GRID_TIMEOUT_MS || 30_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_FLUID_GRID_OUT || "reports/fluid-grid-benchmark-latest.json";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-fluid-grid-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the fluid grid benchmark. Original error: ${error instanceof Error ? error.message : String(error)}`);
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
  await page.waitForFunction(() => typeof window.__runFluidGridBenchmark === "function", undefined, { timeout: timeoutMs });

  const capability = await page.evaluate(() => window.__fluidGridCapabilityReport ?? null);
  assert.equal(capability?.status, "webgpu-ready", "FG-02 requires a WebGPU-ready Electron runtime");

  const standard = await page.evaluate(() =>
    window.__runFluidGridBenchmark?.({ tier: "standard", steps: 120, capability: window.__fluidGridCapabilityReport, requestGpuTimestamps: true })
  );
  const high = await page.evaluate(() =>
    window.__runFluidGridBenchmark?.({ tier: "high", steps: 80, capability: window.__fluidGridCapabilityReport, requestGpuTimestamps: true })
  );
  assert.ok(standard, "standard tier benchmark should return a report");
  assert.ok(high, "high tier benchmark should return a report");
  assert.equal(standard.pass, true, `standard grid benchmark failed: ${JSON.stringify(standard, null, 2)}`);
  assert.equal(high.pass, true, `high grid benchmark failed: ${JSON.stringify(high, null, 2)}`);
  assert.equal(standard.noFullGridReadbackPerFrame, true, "benchmark must not rely on full-grid readback per frame");
  assert.ok(standard.plan.bufferRoles.includes("height"), "height buffer should be allocated");
  assert.ok(standard.plan.bufferRoles.includes("velocity"), "velocity buffer should be allocated");
  assert.ok(standard.plan.bufferRoles.includes("foam"), "foam buffer should be allocated");
  assert.ok(standard.plan.bufferRoles.includes("obstacle"), "obstacle buffer should be allocated");
  assert.ok(standard.plan.bufferRoles.includes("depth"), "depth buffer should be allocated");
  assert.ok(standard.plan.bufferRoles.includes("impulse"), "impulse buffer should be allocated");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-02",
    pass: standard.pass && high.pass,
    capability,
    tiers: {
      standard,
      high,
    },
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid grid benchmark written to ${outPath}`);
  console.log(
    `- standard: ${standard.plan.cellsX}x${standard.plan.cellsY}, ${standard.stepTiming.averageStepMs.toFixed(4)} ms/step wall, ${formatGpuTiming(standard)}, CFL ${standard.plan.cfl.toFixed(3)}`
  );
  console.log(
    `- high: ${high.plan.cellsX}x${high.plan.cellsY}, ${high.stepTiming.averageStepMs.toFixed(4)} ms/step wall, ${formatGpuTiming(high)}, CFL ${high.plan.cfl.toFixed(3)}`
  );
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

function formatGpuTiming(report) {
  if (!report.gpuTiming?.timestampQueryEnabled || report.gpuTiming.averageStepMs === null) return "GPU timestamp unavailable";
  return `${report.gpuTiming.averageStepMs.toFixed(4)} ms/step GPU`;
}
