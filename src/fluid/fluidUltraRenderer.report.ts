import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import { type DisplayPacingSample, type FluidDisplayPacingScenarioInput } from "./fluidDisplayPacing";
import { createFluidUltraRendererReport } from "./fluidUltraRenderer";

const timeoutMs = Number(process.env.OCEAN_LAB_ULTRA_RENDERER_TIMEOUT_MS || 90_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_ULTRA_RENDERER_OUT || "reports/fluid-ultra-renderer-latest.json";
const idleDurationMs = Number(process.env.OCEAN_LAB_ULTRA_RENDERER_IDLE_MS || 2_800);
const impactDurationMs = Number(process.env.OCEAN_LAB_ULTRA_RENDERER_IMPACT_MS || 5_500);
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_ULTRA_RENDERER_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-ultra-renderer-"));
const userDataPath = await realpath(userDataRoot);

const calmSeawater = {
  currentSpeedMps: 0,
  waterDensityKgM3: 1025,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

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
      window.__fluidGridPreferredTier === "ultra" &&
      window.__fluidGridCapabilityReport?.selectedTier === "ultra" &&
      window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
      window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
      canvas?.getAttribute("data-water-context") === "webgpu" &&
      canvas?.getAttribute("data-water-tier") === "ultra" &&
      canvas?.getAttribute("data-water-grid") === "768x432" &&
      Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  const scenarios: FluidDisplayPacingScenarioInput[] = [];
  await configureScenario(page, {
    dropHeightM: 8,
    ocean: calmSeawater,
    presetId: "concrete-cube",
    releaseAngleRad: 0,
    timeScale: 1,
  });
  scenarios.push(await measureScenario(page, "idle-ultra-display-pacing", "Idle ultra-tier display pacing", idleDurationMs, false));

  await configureScenario(page, {
    dropHeightM: 8,
    ocean: calmSeawater,
    presetId: "concrete-cube",
    releaseAngleRad: 0,
    timeScale: 1,
  });
  await page.evaluate(() => window.__oceanPhysicsScenarioControls?.drop());
  scenarios.push(await measureScenario(page, "concrete-ultra-impact-display-pacing", "Concrete impact ultra-tier display pacing", impactDurationMs, true));

  const capability = await page.evaluate(() => window.__fluidGridCapabilityReport ?? null);
  const preferredTier = await page.evaluate(() => window.__fluidGridPreferredTier ?? "auto");
  const report = createFluidUltraRendererReport({
    generatedAt: new Date().toISOString(),
    launchMode,
    preferredTier,
    scenarios,
    selectedGrid: {
      cellsX: capability?.grid?.cellsX ?? 0,
      cellsY: capability?.grid?.cellsY ?? 0,
    },
    selectedTier: capability?.selectedTier ?? "low",
  });

  if (consoleErrors.length > 0) report.failures.push(`Electron console errors: ${consoleErrors.join(" | ")}`);
  if (pageErrors.length > 0) report.failures.push(`Electron page errors: ${pageErrors.join(" | ")}`);
  report.pass = report.failures.length === 0;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid ultra renderer report written to ${outPath}`);
  console.log(`- runtime: ${launchMode}`);
  console.log(`- selected tier: ${report.selectedTier} (${report.selectedGrid.cellsX}x${report.selectedGrid.cellsY})`);
  for (const scenario of report.displayPacing.scenarios) {
    console.log(
      `- ${scenario.id}: ${scenario.framePacing.averageFps.toFixed(1)} FPS, p95 ${scenario.framePacing.p95FrameMs.toFixed(2)} ms, p99 ${scenario.framePacing.p99FrameMs.toFixed(2)} ms, dropped ${(scenario.framePacing.droppedFrameRatio * 100).toFixed(1)}%, debt ${scenario.framePacing.maxDroppedDebtS.toFixed(6)} s`
    );
  }
  assert.equal(launchMode, "packaged-app", "FG-21 evidence must use the packaged app by default");
  assert.equal(report.gate, "G-FG-21", "FG-21 evidence must use the ultra renderer gate id");
  assert.deepEqual(report.failures, [], `FG-21 failures:\n${report.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function configureScenario(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  config: Record<string, unknown>
) {
  await page.evaluate((nextConfig) => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.configure(nextConfig);
  }, config);
  await page.waitForFunction(
    (expected) => {
      const snapshot = window.__oceanPhysicsSnapshot;
      return (
        snapshot?.phase === "ready" &&
        snapshot.spec.id === expected.presetId &&
        Math.abs(snapshot.dropHeightM - Number(expected.dropHeightM)) < 1e-6 &&
        Math.abs(snapshot.settings.currentSpeedMps - Number((expected.ocean as { currentSpeedMps: number }).currentSpeedMps)) < 1e-6 &&
        Math.abs(snapshot.settings.waveHeightM - Number((expected.ocean as { waveHeightM: number }).waveHeightM)) < 1e-6
      );
    },
    config,
    { timeout: timeoutMs }
  );
}

async function measureScenario(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>,
  id: string,
  label: string,
  durationMs: number,
  expectedActivePhysics: boolean
): Promise<FluidDisplayPacingScenarioInput> {
  const samples = await page.evaluate(collectDisplaySamples, durationMs) as DisplayPacingSample[];
  const telemetry = await page.evaluate(() => {
    const stage = document.querySelector(".simulation-stage");
    const canvas = document.querySelector(".ocean-canvas");
    const snapshot = window.__oceanPhysicsSnapshot;
    return {
      couplingActiveSeen: Boolean(window.__displayPacingObserved?.couplingActiveSeen),
      finalPhase: snapshot?.phase ?? null,
      longTaskSupported: Boolean(window.__displayPacingObserved?.longTaskSupported),
      particlesActiveSeen: Boolean(window.__displayPacingObserved?.particlesActiveSeen),
      pressureActiveSeen: Boolean(window.__displayPacingObserved?.pressureActiveSeen),
      renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
      renderer: canvas?.getAttribute("data-water-renderer") ?? null,
      timeScale: 1,
      waterContext: canvas?.getAttribute("data-water-context") ?? null,
    };
  });
  return { expectedActivePhysics, id, label, samples, telemetry };
}

function collectDisplaySamples(durationMs: number): Promise<DisplayPacingSample[]> {
  return new Promise((resolve) => {
    const samples: DisplayPacingSample[] = [];
    let start = 0;
    let last = 0;
    let longTaskCount = 0;
    let longTaskDurationMs = 0;
    let longTaskSupported = false;
    let observer: PerformanceObserver | null = null;

    try {
      longTaskSupported = PerformanceObserver.supportedEntryTypes?.includes("longtask") ?? false;
      if (longTaskSupported) {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskCount += 1;
            longTaskDurationMs += entry.duration;
          }
        });
        observer.observe({ entryTypes: ["longtask"] });
      }
    } catch {
      longTaskSupported = false;
      observer = null;
    }

    window.__displayPacingObserved = {
      couplingActiveSeen: false,
      longTaskSupported,
      particlesActiveSeen: false,
      pressureActiveSeen: false,
    };

    const sample = (now: number) => {
      if (start === 0) {
        start = now;
        last = now;
      }
      const stage = document.querySelector(".simulation-stage");
      const canvas = document.querySelector(".ocean-canvas");
      const snapshot = window.__oceanPhysicsSnapshot;
      const frameLoop = window.__fluidFrameLoopStats;
      const coupling = window.__fluidGridCouplingForces;
      const pressureActive = canvas?.getAttribute("data-water-pressure-active") === "true";
      const particlesActive = canvas?.getAttribute("data-water-particles-active") === "true";
      const couplingActive = coupling?.active === true;
      window.__displayPacingObserved = {
        couplingActiveSeen: Boolean(window.__displayPacingObserved?.couplingActiveSeen || couplingActive),
        longTaskSupported,
        particlesActiveSeen: Boolean(window.__displayPacingObserved?.particlesActiveSeen || particlesActive),
        pressureActiveSeen: Boolean(window.__displayPacingObserved?.pressureActiveSeen || pressureActive),
      };
      samples.push({
        atMs: now - start,
        couplingActive,
        droppedDebtS: Number(frameLoop?.droppedDebtS ?? 0),
        dtMs: now - last,
        longTaskCount,
        longTaskDurationMs,
        maxSubstepsObserved: Number(frameLoop?.maxSubstepsObserved ?? 0),
        particlesActive,
        phase: snapshot?.phase ?? null,
        physicsTimeS: typeof snapshot?.timeS === "number" ? snapshot.timeS : null,
        pressureActive,
        renderMode: stage?.getAttribute("data-water-render-mode") ?? null,
        renderer: canvas?.getAttribute("data-water-renderer") ?? null,
        tier: canvas?.getAttribute("data-water-tier") ?? null,
        totalSubsteps: Number(frameLoop?.totalSubsteps ?? 0),
        waterContext: canvas?.getAttribute("data-water-context") ?? null,
        waterFrame: Number(canvas?.getAttribute("data-water-frames") ?? 0),
      });
      last = now;
      if (now - start >= durationMs) {
        observer?.disconnect();
        resolve(samples);
        return;
      }
      window.requestAnimationFrame(sample);
    };

    window.requestAnimationFrame(sample);
  });
}
