import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_PARTICLE_SPLASH_TIMEOUT_MS || 30_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_PARTICLE_SPLASH_OUT || "reports/fluid-particle-splash-latest.json";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-particle-splash-"));
const userDataPath = await realpath(userDataRoot);

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the particle-splash benchmark. Original error: ${error instanceof Error ? error.message : String(error)}`);
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
  await page.waitForFunction(() => typeof window.__runParticleSplashBenchmark === "function", undefined, { timeout: timeoutMs });

  const capability = await page.evaluate(() => window.__fluidGridCapabilityReport ?? null);
  assert.equal(capability?.status, "webgpu-ready", "FG-12 requires a WebGPU-ready Electron runtime");

  const standard = await page.evaluate(() =>
    window.__runParticleSplashBenchmark?.({ tier: "standard", steps: 192, capability: window.__fluidGridCapabilityReport, requestGpuTimestamps: true })
  );
  const high = await page.evaluate(() =>
    window.__runParticleSplashBenchmark?.({ tier: "high", steps: 180, capability: window.__fluidGridCapabilityReport, requestGpuTimestamps: true })
  );
  assert.ok(standard, "standard tier particle-splash benchmark should return a report");
  assert.ok(high, "high tier particle-splash benchmark should return a report");
  assert.equal(standard.pass, true, `standard particle-splash benchmark failed: ${JSON.stringify(standard, null, 2)}`);
  assert.equal(high.pass, true, `high particle-splash benchmark failed: ${JSON.stringify(high, null, 2)}`);
  assert.equal(standard.solver, "localized-particle-splash-v1", "FG-12 requires the localized particle splash solver");
  assert.equal(high.solver, "localized-particle-splash-v1", "FG-12 requires the localized particle splash solver");
  assert.equal(standard.noFullGridReadbackPerFrame, true, "benchmark must not rely on full-grid readback per frame");
  assert.equal(high.noFullGridReadbackPerFrame, true, "benchmark must not rely on full-grid readback per frame");
  assert.equal(standard.diagnostics.outsideLocalBoundsCount, 0, "standard particles must remain inside the local splash bounds");
  assert.equal(high.diagnostics.outsideLocalBoundsCount, 0, "high particles must remain inside the local splash bounds");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-12",
    pass: standard.pass && high.pass,
    capability,
    tiers: {
      standard,
      high,
    },
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid particle-splash report written to ${outPath}`);
  console.log(
    `- standard: ${standard.plan.particleCapacity} particles, crown ${standard.diagnostics.predictedCrownHeightM.toFixed(3)} m, reentry ${standard.diagnostics.reentryEnergyJ.toFixed(2)} J, ${formatGpuTiming(standard)}`
  );
  console.log(
    `- high: ${high.plan.particleCapacity} particles, crown ${high.diagnostics.predictedCrownHeightM.toFixed(3)} m, reentry ${high.diagnostics.reentryEnergyJ.toFixed(2)} J, ${formatGpuTiming(high)}`
  );
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

function formatGpuTiming(report) {
  if (!report.gpuTiming?.timestampQueryEnabled || report.gpuTiming.averageStepMs === null) return "GPU timestamp unavailable";
  return `${report.gpuTiming.averageStepMs.toFixed(4)} ms/step GPU`;
}
