import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import {
  createFluidResolutionScalingReport,
  resolutionScalingTiers,
  type FluidResolutionScalingTierEvidence,
  type FluidResolutionScalingTierId,
} from "./fluidResolutionScaling";

const timeoutMs = Number(process.env.OCEAN_LAB_RESOLUTION_SCALING_TIMEOUT_MS || 120_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_RESOLUTION_SCALING_OUT || "reports/fluid-resolution-scaling-latest.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_RESOLUTION_SCALING_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-resolution-scaling-"));
const userDataPath = await realpath(userDataRoot);

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
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return (
      window.__fluidGridCapabilityReport?.status === "webgpu-ready" &&
      window.__runFluidGridBenchmark &&
      window.__runShallowWaterBenchmark &&
      window.__runParticleSplashBenchmark &&
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1"
    );
  }, undefined, { timeout: timeoutMs });

  const capability = await page.evaluate(() => window.__fluidGridCapabilityReport ?? null);
  const tiers: FluidResolutionScalingTierEvidence[] = [];
  for (const tier of resolutionScalingTiers) {
    tiers.push(await runTier(page, tier));
  }

  const report = createFluidResolutionScalingReport({
    capability,
    generatedAt: new Date().toISOString(),
    launchMode,
    tiers,
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid resolution scaling report written to ${outPath}`);
  console.log(`- runtime: ${launchMode}`);
  for (const tier of report.tiers) {
    console.log(
      `- ${tier.tier}: ${tier.cellCount} cells, grid p95 ${formatMs(tier.gridGpuP95StepMs)}, pressure p95 ${formatMs(tier.pressureGpuP95StepMs)}, particles p95 ${formatMs(tier.particleGpuP95StepMs)}, storage ${(tier.estimatedStorageBytes / (1024 * 1024)).toFixed(2)} MiB`
    );
  }
  assert.equal(launchMode, "packaged-app", "FG-20 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-20", "FG-20 evidence must use the resolution scaling gate id");
  assert.deepEqual(report.failures, [], `FG-20 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function runTier(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  tier: FluidResolutionScalingTierId
): Promise<FluidResolutionScalingTierEvidence> {
  const steps = stepCountsFor(tier);
  const grid = await page.evaluate(
    ({ nextTier, nextSteps }) =>
      window.__runFluidGridBenchmark?.({
        capability: window.__fluidGridCapabilityReport,
        maxAverageStepMs: nextTier === "ultra" ? 6 : 4,
        requestGpuTimestamps: true,
        steps: nextSteps,
        tier: nextTier,
      }),
    { nextSteps: steps.grid, nextTier: tier }
  );
  const pressure = await page.evaluate(
    ({ nextTier, nextSteps }) =>
      window.__runShallowWaterBenchmark?.({
        capability: window.__fluidGridCapabilityReport,
        maxAverageStepMs: nextTier === "ultra" ? 6 : 4,
        maxP95GpuStepMs: nextTier === "ultra" ? 2.5 : 0.65,
        pressureGradient: true,
        requestGpuTimestamps: true,
        steps: nextSteps,
        tier: nextTier,
      }),
    { nextSteps: steps.pressure, nextTier: tier }
  );
  const particles = await page.evaluate(
    ({ nextTier, nextSteps }) =>
      window.__runParticleSplashBenchmark?.({
        capability: window.__fluidGridCapabilityReport,
        maxAverageStepMs: nextTier === "ultra" ? 5 : 3,
        maxP95GpuStepMs: nextTier === "ultra" ? 2.5 : 0.65,
        requestGpuTimestamps: true,
        steps: nextSteps,
        tier: nextTier,
      }),
    { nextSteps: steps.particles, nextTier: tier }
  );
  assert.ok(grid, `${tier} grid benchmark returned no report`);
  assert.ok(pressure, `${tier} pressure benchmark returned no report`);
  assert.ok(particles, `${tier} particle benchmark returned no report`);
  return { grid, particles, pressure, tier };
}

function stepCountsFor(tier: FluidResolutionScalingTierId) {
  if (tier === "ultra") return { grid: 56, particles: 120, pressure: 40 };
  if (tier === "high") return { grid: 72, particles: 144, pressure: 56 };
  return { grid: 80, particles: 160, pressure: 64 };
}

function formatMs(value: number | null) {
  return value === null ? "n/a" : `${value.toFixed(4)} ms`;
}
