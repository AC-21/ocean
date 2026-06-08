import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import {
  createFluidAdaptiveTierReport,
  recommendAdaptiveFluidTier,
  type FluidAdaptiveTierRuntimeProbe,
} from "./fluidAdaptiveTier";
import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidResolutionScalingReport } from "./fluidResolutionScaling";
import type { FluidUltraReferenceOutcomesReport } from "./fluidUltraReferenceOutcomes";
import type { FluidUltraRendererReport } from "./fluidUltraRenderer";

const timeoutMs = Number(process.env.OCEAN_LAB_ADAPTIVE_TIER_TIMEOUT_MS || 90_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_ADAPTIVE_TIER_OUT || "reports/fluid-adaptive-tier-latest.json";
const resolutionScalingPath = process.env.OCEAN_LAB_ADAPTIVE_TIER_RESOLUTION_IN || "docs/evidence/FG-20-resolution-scaling-2026-06-08.json";
const ultraRendererPath = process.env.OCEAN_LAB_ADAPTIVE_TIER_RENDERER_IN || "docs/evidence/FG-21-ultra-renderer-2026-06-08.json";
const ultraReferencePath = process.env.OCEAN_LAB_ADAPTIVE_TIER_REFERENCE_IN || "docs/evidence/FG-22-ultra-reference-outcomes-2026-06-08.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_ADAPTIVE_TIER_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-adaptive-tier-"));
const userDataPath = await realpath(userDataRoot);

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  const resolutionScaling = await readJson<FluidResolutionScalingReport>(resolutionScalingPath);
  const ultraRenderer = await readJson<FluidUltraRendererReport>(ultraRendererPath);
  const ultraReference = await readJson<FluidUltraReferenceOutcomesReport>(ultraReferencePath);
  const recommendation = recommendAdaptiveFluidTier({ resolutionScaling, ultraReference, ultraRenderer });

  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }
  electronApp = await electron.launch({
    ...(launchMode === "packaged-app" ? { executablePath: packagedExecutablePath } : { args: [root] }),
    env: {
      ...process.env,
      HARBORLINE_USER_DATA_DIR: userDataPath,
      OCEAN_LAB_CALIBRATED_FLUID_TIER: recommendation.selectedTier,
      OCEAN_LAB_FLUID_TIER: "auto",
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
    (expectedTier) => {
      const stage = document.querySelector(".simulation-stage");
      const canvas = document.querySelector(".ocean-canvas");
      return (
        window.__fluidGridTierSelection?.mode === "calibrated-auto" &&
        window.__fluidGridTierSelection?.requestedTier === "auto" &&
        window.__fluidGridTierSelection?.preferredTier === expectedTier &&
        window.__fluidGridPreferredTier === expectedTier &&
        window.__fluidGridCapabilityReport?.selectedTier === expectedTier &&
        window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
        window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
        stage?.getAttribute("data-fluid-tier-selection-mode") === "calibrated-auto" &&
        stage?.getAttribute("data-fluid-tier-requested") === "auto" &&
        stage?.getAttribute("data-fluid-preferred-tier") === expectedTier &&
        canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
        canvas?.getAttribute("data-water-context") === "webgpu" &&
        canvas?.getAttribute("data-water-tier") === expectedTier &&
        canvas?.getAttribute("data-water-grid") === "768x432" &&
        Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
      );
    },
    recommendation.selectedTier,
    { timeout: timeoutMs }
  );

  const runtimeProbe = await page.evaluate((requestedTier) => {
    const canvas = document.querySelector(".ocean-canvas");
    return {
      grid: canvas?.getAttribute("data-water-grid") ?? null,
      launchMode: "packaged-app",
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      requestedTier,
      selectedGrid: {
        cellsX: window.__fluidGridCapabilityReport?.grid?.cellsX ?? 0,
        cellsY: window.__fluidGridCapabilityReport?.grid?.cellsY ?? 0,
      },
      selectedTier: window.__fluidGridCapabilityReport?.selectedTier ?? "low",
      selection: window.__fluidGridTierSelection ?? null,
      tier: canvas?.getAttribute("data-water-tier") ?? null,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
      waterFrames: Number(canvas?.getAttribute("data-water-frames") ?? 0),
    };
  }, "auto") as FluidAdaptiveTierRuntimeProbe;

  const report = createFluidAdaptiveTierReport({
    generatedAt: new Date().toISOString(),
    resolutionScaling,
    runtimeProbe: { ...runtimeProbe, launchMode },
    ultraReference,
    ultraRenderer,
  });
  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid adaptive tier report written to ${outPath}`);
  console.log(`- recommendation: ${report.recommendation.selectedTier} (${report.recommendation.reason})`);
  console.log(`- runtime: ${report.runtimeProbe.selection?.mode ?? "missing"} -> ${report.runtimeProbe.selectedTier} (${report.runtimeProbe.selectedGrid.cellsX}x${report.runtimeProbe.selectedGrid.cellsY})`);
  console.log(`- max ultra GPU p95: ${formatMs(report.recommendation.summary.maxUltraGpuP95StepMs)}`);
  console.log(`- max live p95: ${formatMs(report.recommendation.summary.maxLiveP95FrameMs)}`);
  assert.equal(launchMode, "packaged-app", "FG-23 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-23", "FG-23 evidence must use the adaptive tier gate id");
  assert.deepEqual(report.failures, [], `FG-23 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function formatMs(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(4)} ms`;
}
