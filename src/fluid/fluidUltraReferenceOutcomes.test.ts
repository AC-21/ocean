import { describe, expect, it } from "vitest";
import type { OceanPhysicsLiveSnapshot } from "../OceanPhysicsApp";
import type { GridFluidCouplingForces } from "../physicsOcean";
import type { FluidFrameLoopStats } from "./fluidFrameLoop";
import type { FluidWaterRenderStats } from "./fluidWaterRenderer";
import {
  createFluidUltraReferenceOutcomesReport,
  type FluidReferenceCanvasTelemetry,
  type FluidReferenceOutcomeCase,
  type FluidReferenceOutcomeCategory,
  type FluidReferenceOutcomeComparison,
  type FluidUltraReferenceOutcomesOptions,
} from "./fluidUltraReferenceOutcomes";

describe("fluid ultra reference outcomes gate", () => {
  it("passes when packaged ultra renderer telemetry also passes every live reference outcome", () => {
    const report = createFluidUltraReferenceOutcomesReport(baseOptions());

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-22");
    expect(report.selectedTier).toBe("ultra");
    expect(report.summary.categories).toEqual(["damping", "drop", "float", "sink", "splash"]);
    expect(report.summary.liveGrid).toBe("768x432");
  });

  it("rejects a high-tier live replay even if all reference values pass", () => {
    const report = createFluidUltraReferenceOutcomesReport({
      ...baseOptions(),
      capability: { grid: { cellsX: 512, cellsY: 288 }, selectedTier: "high" },
      selectedGrid: { cellsX: 512, cellsY: 288 },
      selectedTier: "high",
      telemetry: telemetry({ grid: "512x288", tier: "high" }),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("selected tier must be ultra");
    expect(report.failures.join(" ")).toContain("capability selected tier must be ultra");
  });

  it("rejects a replay that loses active particle or coupling telemetry during impact", () => {
    const options = baseOptions();
    const report = createFluidUltraReferenceOutcomesReport({
      ...options,
      cases: options.cases.map((entry) =>
        entry.id === "live-concrete-drop-splash-pressure"
          ? { ...entry, consumedCoupling: { ...coupling(), active: false }, telemetry: telemetry({ particlesActive: false }) }
          : entry
      ),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("particle splash feedback never became active");
    expect(report.failures.join(" ")).toContain("combined grid coupling never became active");
  });
});

function baseOptions(): FluidUltraReferenceOutcomesOptions {
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
    selectedGrid: { cellsX: 768, cellsY: 432 },
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
    pass: true,
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
    frames: 220,
    grid: "768x432",
    noFullGridReadbackPerFrame: true,
    particles: "localized-particle-splash-live-v1",
    particlesActive: true,
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
    frameCount: 240,
    interpolationAlpha: 0,
    lastSubsteps: 1,
    maxAccumulatedS: 0.25,
    maxSubstepsObserved: 1,
    maxSubstepsPerFrame: 24,
    simulatedS: 1 / 120,
    snapshotIntervalMs: 80,
    totalSubsteps: 160,
  };
}

function stats(): FluidWaterRenderStats {
  return {
    context: "webgpu",
    frameCount: 240,
    gridCellsX: 768,
    gridCellsY: 432,
    lastCoupling: null,
    lastParticleSplash: null,
    lastPressure: {
      active: true,
      bufferRoles: ["height", "momentum-x", "momentum-y"],
      cfl: 0.56,
      coupling: "bounded-pressure-gradient-live-v1",
      estimatedStorageBytes: 10616832,
      forceBoundN: 1500,
      gridVelocityMps: 0.4,
      horizontalForceDeltaN: 8,
      impulseEnergyEstimateJ: 100,
      maxMomentumPerDepthMps: 8,
      noFullGridReadbackPerFrame: true,
      pressureGain: 0.22,
      pressureWorkEstimateJ: 20,
      sampleTimeS: 1.4,
      slopeLimit: 0.6,
      verticalForceDeltaN: 300,
    },
    lastSplash: null,
    renderer: "webgpu-grid-primary-v1",
    tier: "ultra",
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
      name: "Ice block",
      waterFillRatePerMinute: 0,
    },
    timeS: 2.4,
    version: "ocean-physics-live-v1",
    waterRenderMode: "webgpu",
  };
}
