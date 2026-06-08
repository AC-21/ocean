import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_LIVE_REFERENCE_TIMEOUT_MS || 90_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_LIVE_REFERENCE_OUT || "reports/fluid-live-reference-outcomes-latest.json";
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_LIVE_REFERENCE_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-live-reference-"));
const userDataPath = await realpath(userDataRoot);

const calmSeawater = {
  currentSpeedMps: 0,
  waterDensityKgM3: 1025,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the live reference outcomes report. Original error: ${error instanceof Error ? error.message : String(error)}`);
}

let electronApp;
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
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return (
      window.__oceanPhysicsScenarioControls &&
      window.__oceanPhysicsSnapshot?.version === "ocean-physics-live-v1" &&
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
      canvas?.getAttribute("data-water-context") === "webgpu" &&
      canvas?.getAttribute("data-water-pressure") === "bounded-pressure-gradient-live-v1" &&
      Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 12
    );
  }, undefined, { timeout: timeoutMs });

  const comparisons = [];
  const cases = [];

  const dropCase = await runDropCase(page, {
    id: "live-concrete-drop-splash-pressure",
    category: "drop+splash",
    config: {
      dropHeightM: 8,
      ocean: calmSeawater,
      presetId: "concrete-cube",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    waitFor: (snapshot) => snapshot.impact !== null && snapshot.timeS >= snapshot.impact.atS + 0.08,
  });
  const dropSpeedBand = freeFallSpeedBand(dropCase.snapshot.dropHeightM, dropCase.snapshot.settings.gravity);
  const splashBand = splashHeightBand(
    dropCase.snapshot.impact.impactSpeedMps,
    dropCase.snapshot.settings.gravity,
    0.72
  );
  comparisons.push(
    comparison("live-drop-speed-reference", "drop", dropCase.snapshot.impact.impactSpeedMps, dropSpeedBand.min, dropSpeedBand.max, "m/s"),
    comparison("live-splash-height-reference", "splash", dropCase.snapshot.impact.splashHeightM, splashBand.min, splashBand.max, "m")
  );
  cases.push(dropCase);

  const iceCase = await runDropCase(page, {
    id: "live-ice-static-draft",
    category: "float",
    config: {
      dropHeightM: 1,
      ocean: calmSeawater,
      presetId: "ice-block",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    waitFor: (snapshot) => snapshot.phase === "floating" && Math.abs(snapshot.equilibrium.draftErrorM ?? Number.POSITIVE_INFINITY) <= 0.055,
  });
  const iceExpected = 917 / calmSeawater.waterDensityKgM3;
  comparisons.push(
    comparison(
      "live-ice-equilibrium-submerged-fraction-reference",
      "float",
      iceCase.snapshot.diagnostics.equilibriumSubmergedFraction,
      iceExpected - 0.035,
      iceExpected + 0.035,
      "fraction"
    ),
    comparison(
      "live-ice-hydrostatic-draft-error",
      "float",
      Math.abs(iceCase.snapshot.equilibrium.draftErrorM ?? Number.POSITIVE_INFINITY),
      0,
      0.055,
      "m"
    )
  );
  cases.push(iceCase);

  const foamCase = await runDropCase(page, {
    id: "live-foam-damped-settling",
    category: "damping",
    config: {
      dropHeightM: 1.35,
      ocean: calmSeawater,
      presetId: "foam-rescue-block",
      releaseAngleRad: 0.18,
      timeScale: 1,
    },
    waitFor: (snapshot) => snapshot.phase === "floating" && snapshot.equilibrium.withinTolerance,
  });
  comparisons.push(
    comparison("live-foam-settled-draft-error", "damping", Math.abs(foamCase.snapshot.equilibrium.draftErrorM ?? Number.POSITIVE_INFINITY), 0, 0.055, "m"),
    comparison("live-foam-settled-buoyancy-error", "damping", foamCase.snapshot.equilibrium.buoyancyErrorRatio, 0, 0.08, "ratio"),
    comparison("live-foam-equilibrium-window", "damping", foamCase.snapshot.equilibrium.withinTolerance ? 1 : 0, 1, 1, "boolean")
  );
  cases.push(foamCase);

  const terminalCase = await runDropCase(page, {
    id: "live-concrete-sink-terminal-band",
    category: "sink",
    config: {
      dropHeightM: 1,
      ocean: { ...calmSeawater, waterDepthM: 22 },
      presetId: "concrete-cube",
      releaseAngleRad: 0,
      timeScale: 1,
    },
    waitFor: (snapshot) => (snapshot.phase === "sinking" || snapshot.phase === "sank") && snapshot.timeS >= 2.2,
  });
  comparisons.push(
    comparison(
      "live-concrete-terminal-speed-reference",
      "sink",
      terminalCase.snapshot.diagnostics.terminalVelocityMps ?? Number.NaN,
      1,
      8,
      "m/s"
    ),
    comparison("live-concrete-sink-phase", "sink", terminalCase.snapshot.phase === "sinking" || terminalCase.snapshot.phase === "sank" ? 1 : 0, 1, 1, "boolean")
  );
  cases.push(terminalCase);

  const smallLeak = await configureScenario(page, {
    dropHeightM: 1,
    ocean: calmSeawater,
    presetId: "leaky-steel-drum",
    releaseAngleRad: 0,
    specPatch: {
      airReliefCoefficient: 0.992,
      leakAreaM2: 0.000006,
      leakDischargeCoefficient: 0.62,
      vented: false,
    },
    timeScale: 1,
  });
  const largeLeak = await configureScenario(page, {
    dropHeightM: 1,
    ocean: calmSeawater,
    presetId: "leaky-steel-drum",
    releaseAngleRad: 0,
    specPatch: {
      airReliefCoefficient: 0.992,
      leakAreaM2: 0.00003,
      leakDischargeCoefficient: 0.62,
      vented: false,
    },
    timeScale: 1,
  });
  const leakRatio = (largeLeak.prediction.secondsUntilSink ?? Number.POSITIVE_INFINITY) / Math.max(1, smallLeak.prediction.secondsUntilSink ?? Number.POSITIVE_INFINITY);
  comparisons.push(comparison("live-leaky-drum-sink-time-ratio-reference", "sink", leakRatio, 0, 0.55, "ratio"));
  cases.push({
    category: "sink",
    id: "live-leaky-drum-sink-time-prediction",
    pass: leakRatio >= 0 && leakRatio <= 0.55,
    snapshot: largeLeak,
    smallLeakSecondsUntilSink: smallLeak.prediction.secondsUntilSink,
    largeLeakSecondsUntilSink: largeLeak.prediction.secondsUntilSink,
    telemetry: await readCanvasTelemetry(page),
  });

  const finalTelemetry = await readCanvasTelemetry(page);
  const finalStats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null);
  const frameLoop = await page.evaluate(() => window.__fluidFrameLoopStats ?? null);
  const consumedCoupling = await page.evaluate(() => window.__fluidGridCouplingForces ?? null);
  const activeFrameLoops = cases.map((entry) => entry.frameLoop).filter(Boolean);
  const failures = [
    ...comparisons.filter((entry) => !entry.pass).map((entry) => `${entry.id} expected ${entry.expected.min}..${entry.expected.max} ${entry.unit}, got ${entry.actual}`),
    ...cases.filter((entry) => entry.pass === false).map((entry) => `${entry.id} failed`),
    ...(finalTelemetry.renderer === "webgpu-grid-primary-v1" ? [] : [`renderer was ${finalTelemetry.renderer}`]),
    ...(finalTelemetry.waterContext === "webgpu" ? [] : [`water context was ${finalTelemetry.waterContext}`]),
    ...(dropCase.telemetry.pressureActive ? [] : ["pressure feedback never became active during concrete drop"]),
    ...(dropCase.telemetry.particlesActive ? [] : ["particle splash feedback never became active during concrete drop"]),
    ...(dropCase.consumedCoupling?.active ? [] : ["combined grid coupling never became active during concrete drop"]),
    ...(dropCase.stats?.lastPressure?.noFullGridReadbackPerFrame ? [] : ["pressure path used full-grid readback"]),
    ...(activeFrameLoops.length >= 4 ? [] : ["active drop cases did not record frame-loop stats"]),
    ...activeFrameLoops.flatMap((entry) => {
      const caseFailures = [];
      if (entry.fixedStepS !== 1 / 120) caseFailures.push(`frame loop for ${entry.caseId} did not report 120 Hz fixed physics step`);
      if (entry.totalSubsteps <= 0) caseFailures.push(`frame loop for ${entry.caseId} did not advance physics substeps`);
      if (entry.maxSubstepsObserved > entry.maxSubstepsPerFrame) caseFailures.push(`frame loop for ${entry.caseId} exceeded max substeps`);
      if (entry.droppedDebtS !== 0) caseFailures.push(`frame loop for ${entry.caseId} dropped simulation debt ${entry.droppedDebtS}`);
      return caseFailures;
    }),
    ...consoleErrors.map((entry) => `console error: ${entry}`),
    ...pageErrors.map((entry) => `page error: ${entry}`),
  ];

  assert.equal(launchMode, "packaged-app", "FG-18 evidence must use the packaged app by default");
  assert.deepEqual(failures, [], `FG-18 failures:\n${failures.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-18",
    launchMode,
    pass: true,
    comparisons,
    cases,
    telemetry: finalTelemetry,
    finalStats,
    consumedCoupling,
    frameLoop,
    noFullGridReadbackPerFrame: true,
    summary: {
      caseCount: cases.length,
      comparisonCount: comparisons.length,
      categories: [...new Set(comparisons.map((entry) => entry.category))].sort(),
    },
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid live reference outcomes report written to ${outPath}`);
  console.log(`- runtime: ${launchMode}`);
  console.log(`- cases: ${cases.length}, comparisons: ${comparisons.length}`);
  console.log(`- drop speed: ${dropCase.snapshot.impact.impactSpeedMps.toFixed(3)} m/s`);
  console.log(`- splash: ${dropCase.snapshot.impact.splashHeightM.toFixed(3)} m`);
  console.log(`- ice submerged: ${iceCase.snapshot.diagnostics.submergedFraction.toFixed(4)}`);
  console.log(`- foam settled: ${foamCase.snapshot.settledAtS?.toFixed(2) ?? "not-settled"} s`);
  console.log(`- leak ratio: ${leakRatio.toFixed(4)}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function runDropCase(page, { category, config, id, waitFor }) {
  await configureScenario(page, config);
  await page.evaluate(() => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.drop();
  });
  const snapshot = await waitForSnapshot(page, waitFor, id);
  const telemetry = await readCanvasTelemetry(page);
  const stats = await page.evaluate(() => window.__fluidWaterRenderStats ?? null);
  const consumedCoupling = await page.evaluate(() => window.__fluidGridCouplingForces ?? null);
  const frameLoop = await page.evaluate((caseId) => {
    const stats = window.__fluidFrameLoopStats;
    return stats ? { ...stats, caseId } : null;
  }, id);
  return {
    category,
    id,
    pass: true,
    snapshot,
    telemetry,
    stats,
    consumedCoupling,
    frameLoop,
  };
}

async function configureScenario(page, config) {
  await page.evaluate((nextConfig) => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.configure(nextConfig);
  }, config);
  return waitForSnapshot(
    page,
    (snapshot) =>
      snapshot.phase === "ready" &&
      snapshot.spec.id === (config.specPatch?.id ?? config.presetId) &&
      Math.abs(snapshot.dropHeightM - config.dropHeightM) < 1e-6 &&
      Math.abs(snapshot.settings.waveHeightM - (config.ocean?.waveHeightM ?? snapshot.settings.waveHeightM)) < 1e-6 &&
      Math.abs(snapshot.settings.currentSpeedMps - (config.ocean?.currentSpeedMps ?? snapshot.settings.currentSpeedMps)) < 1e-6,
    `configure-${config.presetId ?? "custom"}`
  );
}

async function waitForSnapshot(page, predicate, label) {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot = null;
  while (Date.now() < deadline) {
    lastSnapshot = await page.evaluate(() => window.__oceanPhysicsScenarioControls?.snapshot?.() ?? window.__oceanPhysicsSnapshot ?? null);
    if (lastSnapshot && predicate(lastSnapshot)) return lastSnapshot;
    await page.waitForTimeout(80);
  }
  throw new Error(`Timed out waiting for ${label}. Last snapshot:\n${JSON.stringify(lastSnapshot, null, 2)}`);
}

async function readCanvasTelemetry(page) {
  return page.locator(".ocean-canvas").evaluate((canvas) => ({
    forceBoundN: Number(canvas.getAttribute("data-water-pressure-force-bound") ?? 0),
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    noFullGridReadbackPerFrame: canvas.getAttribute("data-water-pressure-readback") === "true",
    particles: canvas.getAttribute("data-water-particles"),
    particlesActive: canvas.getAttribute("data-water-particles-active") === "true",
    pressure: canvas.getAttribute("data-water-pressure"),
    pressureActive: canvas.getAttribute("data-water-pressure-active") === "true",
    renderer: canvas.getAttribute("data-water-renderer"),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    verticalPressureForceN: Number(canvas.getAttribute("data-water-pressure-vertical-force") ?? 0),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
}

function comparison(id, category, actual, min, max, unit) {
  return {
    actual,
    category,
    expected: { min, max },
    id,
    pass: Number.isFinite(actual) && actual >= min && actual <= max,
    unit,
  };
}

function freeFallSpeedBand(dropHeightM, gravity) {
  const max = Math.sqrt(2 * gravity * dropHeightM);
  return {
    max,
    min: max * 0.88,
  };
}

function splashHeightBand(impactSpeedMps, gravity, objectHeightM) {
  const ballisticHead = impactSpeedMps ** 2 / gravity;
  return {
    max: 0.19 * ballisticHead + 0.9 * objectHeightM,
    min: 0.045 * ballisticHead + 0.18 * objectHeightM,
  };
}
