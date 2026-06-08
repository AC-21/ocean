import { describe, expect, it } from "vitest";
import type { OceanPhysicsLiveSnapshot } from "../OceanPhysicsApp";
import type { GridFluidCouplingForces } from "../physicsOcean";
import type { FluidFrameLoopStats } from "./fluidFrameLoop";
import {
  createFluidExperimentalReferenceOutcomesReport,
  type FluidExperimentalReferenceOutcomesOptions,
} from "./fluidExperimentalReferenceOutcomes";
import type {
  FluidReferenceCanvasTelemetry,
  FluidReferenceOutcomeCase,
  FluidReferenceOutcomeCategory,
  FluidReferenceOutcomeComparison,
} from "./fluidUltraReferenceOutcomes";
import type { FluidWaterRenderStats } from "./fluidWaterRenderer";

describe("experimental high-resolution reference outcomes gate", () => {
  it("passes when packaged high-resolution WebGPU telemetry preserves every reference outcome", () => {
    const report = createFluidExperimentalReferenceOutcomesReport(baseOptions());

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-40");
    expect(report.summary.capabilityGrid).toBe("768x432");
    expect(report.summary.liveGrid).toBe("1024x576");
    expect(report.summary.categories).toEqual(["damping", "drop", "float", "sink", "splash"]);
    expect(report.summary.comparisonCount).toBe(10);
  });

  it("rejects missing experimental override or a live canvas that stayed at default ultra dimensions", () => {
    const report = createFluidExperimentalReferenceOutcomesReport({
      ...baseOptions(),
      finalStats: stats({ gridCellsX: 768, gridCellsY: 432 }),
      runtimeGrid: { cellsX: 768, cellsY: 432 },
      runtimeGridOverride: null,
      telemetry: telemetry({ grid: "768x432" }),
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("experimental runtime grid override was missing");
    expect(report.failures).toContain("live renderer grid must be 1024 x 576, got 768 x 432");
    expect(report.failures).toContain("final renderer stats grid must be 1024 x 576, got 768 x 432");
  });

  it("rejects reference drift, Canvas fallback, missing particles, and full-grid readback", () => {
    const options = baseOptions();
    const report = createFluidExperimentalReferenceOutcomesReport({
      ...options,
      cases: options.cases.map((entry) =>
        entry.id === "live-concrete-drop-splash-pressure"
          ? {
              ...entry,
              consumedCoupling: { ...coupling(), active: false },
              stats: stats({ pressureReadback: false }),
              telemetry: telemetry({
                noFullGridReadbackPerFrame: false,
                particlesActive: false,
                particlesNoFullGridReadbackPerFrame: false,
                renderer: "legacy-canvas-diagnostic-v1",
                waterContext: "2d",
              }),
            }
          : entry
      ),
      comparisons: options.comparisons.map((entry) =>
        entry.id === "live-splash-height-reference" ? { ...entry, actual: 99, pass: false } : entry
      ),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("live-splash-height-reference expected");
    expect(report.failures.join(" ")).toContain("particle splash feedback never became active");
    expect(report.failures.join(" ")).toContain("combined grid coupling never became active");
    expect(report.failures.join(" ")).toContain("pressure path used full-grid readback");
    expect(report.failures.join(" ")).toContain("renderer was legacy-canvas-diagnostic-v1");
  });
});

function baseOptions(): FluidExperimentalReferenceOutcomesOptions {
  const cases = [
    caseFor("live-concrete-drop-splash-pressure", "drop+splash"),
    caseFor("live-ice-static-draft", "float"),
    caseFor("live-foam-damped-settling", "damping"),
    caseFor("live-concrete-sink-terminal-band", "sink"),
    caseFor("live-leaky-drum-sink-time-prediction", "sink"),
  ];
  return {
    capability: { grid: { cellsX: 768, cellsY: 432 }, selectedTier: "ultra" },
    cases,
    comparisons: comparisons(),
    consumedCoupling: coupling(),
    finalStats: stats(),
    frameLoop: frameLoop(),
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
    noFullGridReadbackPerFrame: true,
    preferredTier: "ultra",
    runtimeGrid: { cellsX: 1024, cellsY: 576 },
    runtimeGridOverride: { cellsX: 1024, cellsY: 576 },
    selectedTier: "ultra",
    telemetry: telemetry(),
  };
}

function comparisons(): FluidReferenceOutcomeComparison[] {
  return [
    comparison("live-drop-speed-reference", "drop", 12.2, 11, 12.6, "m/s"),
    comparison("live-splash-height-reference", "splash", 2.1, 0.8, 3.6, "m"),
    comparison("live-ice-equilibrium-submerged-fraction-reference", "float", 0.895, 0.86, 0.93, "fraction"),
    comparison("live-ice-hydrostatic-draft-error", "float", 0.04, 0, 0.055, "m"),
    comparison("live-foam-settled-draft-error", "damping", 0.01, 0, 0.055, "m"),
    comparison("live-foam-settled-buoyancy-error", "damping", 0.03, 0, 0.08, "ratio"),
    comparison("live-foam-equilibrium-window", "damping", 1, 1, 1, "boolean"),
    comparison("live-concrete-terminal-speed-reference", "sink", 3.3, 1, 8, "m/s"),
    comparison("live-concrete-sink-phase", "sink", 1, 1, 1, "boolean"),
    comparison("live-leaky-drum-sink-time-ratio-reference", "sink", 0.22, 0, 0.55, "ratio"),
  ];
}

function comparison(
  id: string,
  category: FluidReferenceOutcomeCategory,
  actual: number,
  min: number,
  max: number,
  unit: string
): FluidReferenceOutcomeComparison {
  return {
    actual,
    category,
    expected: { max, min },
    id,
    pass: actual >= min && actual <= max,
    unit,
  };
}

function caseFor(id: string, category: FluidReferenceOutcomeCase["category"]): FluidReferenceOutcomeCase {
  return {
    category,
    consumedCoupling: coupling(),
    frameLoop: { ...frameLoop(), caseId: id },
    id,
    pass: true,
    snapshot: snapshot(),
    stats: stats(),
    telemetry: telemetry(),
  };
}

function telemetry(overrides: Partial<FluidReferenceCanvasTelemetry> = {}): FluidReferenceCanvasTelemetry {
  return {
    forceBoundN: 1500,
    frames: 260,
    grid: "1024x576",
    noFullGridReadbackPerFrame: true,
    particles: "localized-particle-splash-live-v1",
    particlesActive: true,
    particlesNoFullGridReadbackPerFrame: true,
    pressure: "bounded-pressure-gradient-live-v1",
    pressureActive: true,
    renderer: "webgpu-grid-primary-v1",
    status: "rendered",
    tier: "ultra",
    verticalPressureForceN: 300,
    waterContext: "webgpu",
    ...overrides,
  };
}

function coupling(): GridFluidCouplingForces {
  return {
    active: true,
    gridVelocityMps: 0.4,
    horizontalForceDeltaN: 12,
    pressureHorizontalForceDeltaN: 8,
    pressureVerticalForceDeltaN: 300,
    sampleTimeS: 1.4,
    verticalForceDeltaN: 500,
  };
}

function frameLoop(): FluidFrameLoopStats {
  return {
    accumulatedSimS: 0,
    droppedDebtS: 0,
    fixedStepS: 1 / 120,
    frameCount: 260,
    interpolationAlpha: 0,
    lastSubsteps: 1,
    maxAccumulatedS: 0.25,
    maxSubstepsObserved: 1,
    maxSubstepsPerFrame: 24,
    simulatedS: 1 / 120,
    snapshotIntervalMs: 80,
    totalSubsteps: 170,
  };
}

function stats(overrides: Partial<FluidWaterRenderStats> & { pressureReadback?: boolean } = {}): FluidWaterRenderStats {
  const { pressureReadback, ...statsOverrides } = overrides;
  return {
    context: "webgpu",
    frameCount: 260,
    gridCellsX: 1024,
    gridCellsY: 576,
    lastCoupling: null,
    lastParticleSplash: null,
    lastPressure: {
      active: true,
      bufferRoles: ["height", "momentum-x", "momentum-y"],
      cfl: 0.56,
      coupling: "bounded-pressure-gradient-live-v1",
      estimatedStorageBytes: 16515072,
      forceBoundN: 1500,
      gridVelocityMps: 0.4,
      horizontalForceDeltaN: 8,
      impulseEnergyEstimateJ: 100,
      maxMomentumPerDepthMps: 8,
      noFullGridReadbackPerFrame: pressureReadback ?? true,
      pressureGain: 0.22,
      pressureWorkEstimateJ: 20,
      sampleTimeS: 1.4,
      slopeLimit: 0.6,
      verticalForceDeltaN: 300,
    },
    lastSplash: null,
    renderer: "webgpu-grid-primary-v1",
    tier: "ultra",
    ...statsOverrides,
  };
}

function snapshot(): OceanPhysicsLiveSnapshot {
  return {
    diagnostics: {
      buoyancyErrorRatio: 0.03,
      buoyancyN: 900,
      displacedVolumeM3: 0.2,
      effectiveDensityKgM3: 900,
      equilibriumSubmergedFraction: 0.895,
      massKg: 180,
      netForceN: 0,
      submergedDepthM: 0.4,
      submergedFraction: 0.895,
      terminalVelocityMps: 3.3,
      weightN: 1765,
    },
    dropHeightM: 8,
    equilibrium: {
      angleErrorRad: 0,
      angularSpeedRadps: 0,
      buoyancyErrorRatio: 0.03,
      draftErrorM: 0.01,
      verticalSpeedMps: 0.02,
      withinTolerance: true,
    },
    impact: {
      atS: 1.25,
      ejectedWaterKg: 250,
      impactSpeedMps: 12.2,
      splashHeightM: 2.1,
    },
    liveFloatDurationS: 0.5,
    object: {
      centerYM: -0.2,
      velocityYMps: -0.02,
      waterFillFraction: 0,
    },
    phase: "floating",
    prediction: {
      criticalWaterFillFraction: 0.8,
      initialSubmergedDepthM: 0.4,
      outcome: "floats-indefinitely",
      secondsUntilSink: null,
    },
    releaseAngleRad: 0,
    sankAtS: null,
    selectedPresetId: "ice-block",
    settledAtS: 2,
    settings: {
      currentSpeedMps: 0,
      gravity: 9.80665,
      waterDensityKgM3: 1025,
      waterDepthM: 5,
      waveHeightM: 0,
    },
    spec: {
      densityKgM3: 917,
      id: "ice-block",
      maxWaterFillFraction: 0,
      name: "Fresh-water ice block",
      waterFillRatePerMinute: 0,
    },
    timeS: 2,
    version: "ocean-physics-live-v1",
    waterRenderMode: "webgpu",
  };
}
