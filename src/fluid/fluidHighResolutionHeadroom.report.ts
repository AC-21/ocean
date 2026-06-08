import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import {
  createFluidHighResolutionHeadroomReport,
  highResolutionHeadroomCandidates,
  type FluidHighResolutionCandidateEvidence,
  type FluidHighResolutionCandidateSpec,
} from "./fluidHighResolutionHeadroom";

const timeoutMs = Number(process.env.OCEAN_LAB_HIGH_RESOLUTION_HEADROOM_TIMEOUT_MS || 120_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_HIGH_RESOLUTION_HEADROOM_OUT || "reports/fluid-high-resolution-headroom-latest.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_HIGH_RESOLUTION_HEADROOM_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-high-resolution-headroom-"));
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
      OCEAN_LAB_FLUID_TIER: "ultra",
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
      window.__fluidGridCapabilityReport?.selectedTier === "ultra" &&
      window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
      window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
      window.__runFluidGridBenchmark &&
      window.__runShallowWaterBenchmark &&
      window.__runParticleSplashBenchmark &&
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
      canvas?.getAttribute("data-water-context") === "webgpu"
    );
  }, undefined, { timeout: timeoutMs });

  const capability = await page.evaluate(() => window.__fluidGridCapabilityReport ?? null);
  const candidates: FluidHighResolutionCandidateEvidence[] = [];
  for (const spec of highResolutionHeadroomCandidates) {
    candidates.push(await runCandidate(page, spec));
  }

  const report = createFluidHighResolutionHeadroomReport({
    capability,
    candidates,
    generatedAt: new Date().toISOString(),
    launchMode,
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid high-resolution headroom report written to ${outPath}`);
  console.log(`- runtime: ${launchMode}, production tier ${report.productionTierUnchanged.maxRuntimeTier} (${report.productionTierUnchanged.runtimeGrid})`);
  for (const candidate of report.candidates) {
    console.log(
      `- ${candidate.id}: ${candidate.cellsX}x${candidate.cellsY}, ${candidate.scaleVsUltra.toFixed(2)}x ultra, grid p95 ${formatMs(candidate.gridGpuP95StepMs)}, pressure p95 ${formatMs(candidate.pressureGpuP95StepMs)}, particles p95 ${formatMs(candidate.particleGpuP95StepMs)}, storage ${(candidate.estimatedStorageBytes / (1024 * 1024)).toFixed(2)} MiB`
    );
  }
  assert.equal(launchMode, "packaged-app", "FG-38 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-38", "FG-38 evidence must use the high-resolution headroom gate id");
  assert.deepEqual(report.failures, [], `FG-38 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function runCandidate(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  spec: FluidHighResolutionCandidateSpec
): Promise<FluidHighResolutionCandidateEvidence> {
  const gridDimensions = { cellsX: spec.cellsX, cellsY: spec.cellsY };
  const grid = await page.evaluate(
    ({ dimensions }) =>
      window.__runFluidGridBenchmark?.({
        capability: window.__fluidGridCapabilityReport,
        gridDimensions: dimensions,
        maxAverageStepMs: 8,
        requestGpuTimestamps: true,
        steps: 36,
        tier: "ultra",
      }),
    { dimensions: gridDimensions }
  );
  const pressure = await page.evaluate(
    ({ dimensions }) =>
      window.__runShallowWaterBenchmark?.({
        capability: window.__fluidGridCapabilityReport,
        gridDimensions: dimensions,
        maxAverageStepMs: 8,
        maxP95GpuStepMs: 4,
        pressureGradient: true,
        requestGpuTimestamps: true,
        steps: 28,
        tier: "ultra",
      }),
    { dimensions: gridDimensions }
  );
  const particles = await page.evaluate(
    ({ dimensions }) =>
      window.__runParticleSplashBenchmark?.({
        capability: window.__fluidGridCapabilityReport,
        gridDimensions: dimensions,
        maxAverageStepMs: 8,
        maxP95GpuStepMs: 4,
        requestGpuTimestamps: true,
        steps: 96,
        tier: "ultra",
      }),
    { dimensions: gridDimensions }
  );
  assert.ok(grid, `${spec.id} grid benchmark returned no report`);
  assert.ok(pressure, `${spec.id} pressure benchmark returned no report`);
  assert.ok(particles, `${spec.id} particle benchmark returned no report`);
  return { grid, particles, pressure, spec };
}

function formatMs(value: number | null) {
  return value === null ? "n/a" : `${value.toFixed(4)} ms`;
}
