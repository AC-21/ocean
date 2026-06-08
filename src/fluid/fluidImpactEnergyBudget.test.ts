import { describe, expect, it } from "vitest";
import type { FluidReferenceDataset } from "./fluidReferenceDataset";
import { createFluidImpactEnergyBudgetReport } from "./fluidImpactEnergyBudget";
import type { FluidReferenceCanvasTelemetry, FluidReferenceOutcomeCase, FluidUltraReferenceOutcomesReport } from "./fluidUltraReferenceOutcomes";
import type { FluidWaterRenderStats } from "./fluidWaterRenderer";

describe("fluid impact energy budget gate", () => {
  it("passes when live impact energy channels are positive, bounded, and source traced", () => {
    const report = createFluidImpactEnergyBudgetReport({
      referenceDataset: referenceDataset(),
      ultraReference: ultraReference(),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-31");
    expect(report.budget.impactKineticEnergyJ).toBeGreaterThan(60_000);
    expect(report.budget.accountedEnergyRatio).toBeGreaterThan(0.25);
    expect(report.sourceTrace.sourceIds).toContain("nist-standard-gravity");
    expect(report.telemetry.noFullGridReadbackPerFrame).toBe(true);
  });

  it("rejects an impact that creates too much accounted water energy", () => {
    const reference = ultraReference();
    const impactCase = reference.cases[0];
    const impactStats = impactCase.stats!;
    reference.cases[0] = {
      ...impactCase,
      stats: {
        ...impactStats,
        lastPressure: {
          ...impactStats.lastPressure!,
          impulseEnergyEstimateJ: 70_000,
        },
      },
    };
    const report = createFluidImpactEnergyBudgetReport({
      referenceDataset: referenceDataset(),
      ultraReference: reference,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("accounted energy ratio");
    expect(report.failures.join(" ")).toContain("pressure impulse energy ratio");
  });

  it("rejects missing source trace and lost live WebGPU telemetry", () => {
    const dataset = referenceDataset();
    dataset.cases = dataset.cases.filter((entry) => entry.id !== "high-weber-splash-height");
    const reference = ultraReference();
    reference.noFullGridReadbackPerFrame = false;
    const impactStats = reference.cases[0].stats!;
    reference.cases[0] = {
      ...reference.cases[0],
      stats: {
        ...impactStats,
        lastParticleSplash: {
          ...impactStats.lastParticleSplash!,
          active: false,
        },
      },
    };
    const report = createFluidImpactEnergyBudgetReport({
      referenceDataset: dataset,
      ultraReference: reference,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("missing source trace fg09-solver-architecture");
    expect(report.failures.join(" ")).toContain("particle splash telemetry never became active");
    expect(report.failures.join(" ")).toContain("no-full-grid-readback");
  });
});

function ultraReference(): FluidUltraReferenceOutcomesReport {
  const selectedGrid = { cellsX: 768, cellsY: 432 };
  return {
    capability: { grid: selectedGrid, selectedTier: "ultra" },
    cases: [impactCase()],
    comparisons: [],
    consumedCoupling: {
      active: true,
      gridVelocityMps: 0.02,
      horizontalForceDeltaN: -0.7,
      pressureHorizontalForceDeltaN: -0.4,
      pressureVerticalForceDeltaN: 348,
      sampleTimeS: 1.4,
      verticalForceDeltaN: 1442,
    },
    failures: [],
    finalStats: stats(),
    frameLoop: null,
    gate: "G-FG-22",
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
    noFullGridReadbackPerFrame: true,
    pass: true,
    preferredTier: "ultra",
    selectedGrid,
    selectedTier: "ultra",
    summary: {
      caseCount: 1,
      categories: ["drop", "splash"],
      comparisonCount: 0,
      liveGrid: "768x432",
      pressureForceBoundN: 1581,
    },
    telemetry: telemetry(),
  };
}

function impactCase(): FluidReferenceOutcomeCase {
  return {
    category: "drop+splash",
    consumedCoupling: null,
    frameLoop: null,
    id: "live-concrete-drop-splash-pressure",
    pass: true,
    snapshot: {
      diagnostics: {
        buoyancyErrorRatio: 0.86,
        buoyancyN: 1231,
        displacedVolumeM3: 0.27,
        effectiveDensityKgM3: 2400,
        equilibriumSubmergedFraction: 2.34,
        massKg: 895.7952,
        netForceN: 10787,
        submergedDepthM: 0.63,
        submergedFraction: 0.73,
        terminalVelocityMps: 8.4,
        weightN: 8784,
      },
      dropHeightM: 8,
      equilibrium: {
        angleErrorRad: null,
        angularSpeedRadps: 3.9,
        buoyancyErrorRatio: 0.86,
        draftErrorM: null,
        verticalSpeedMps: 6,
        withinTolerance: false,
      },
      impact: {
        atS: 1.27,
        ejectedWaterKg: 248.7,
        impactSpeedMps: 12.3,
        splashHeightM: 2.12,
      },
      liveFloatDurationS: 0.13,
      object: {
        centerYM: -0.86,
        velocityYMps: -6,
        waterFillFraction: 0,
      },
      phase: "floating",
      prediction: {
        criticalWaterFillFraction: 0,
        initialSubmergedDepthM: null,
        outcome: "sinks-immediately",
        secondsUntilSink: 0,
      },
      releaseAngleRad: 0,
      selectedPresetId: "concrete-cube",
      settledAtS: null,
      settings: {
        currentSpeedMps: 0,
        gravity: 9.80665,
        waterDensityKgM3: 1025,
        waterDepthM: 5,
        waveHeightM: 0,
      },
      sankAtS: null,
      spec: {
        densityKgM3: 2400,
        id: "concrete-cube",
        maxWaterFillFraction: 0,
        name: "Concrete cube",
        waterFillRatePerMinute: 0,
      },
      timeS: 1.4,
      version: "ocean-physics-live-v1",
      waterRenderMode: "webgpu",
    },
    stats: stats(),
    telemetry: telemetry(),
  };
}

function stats(): FluidWaterRenderStats {
  return {
    context: "webgpu",
    frameCount: 180,
    gridCellsX: 768,
    gridCellsY: 432,
    lastCoupling: {
      active: true,
      appliedImpulseNs: 12.4,
      boundedDiagnostics: true,
      bounds: { xEnd: 353, xStart: 327, yEnd: 229, yStart: 209 },
      buoyancyDeltaN: 135,
      coupling: "object-grid-v1",
      dragDeltaN: -0.3,
      footprintAreaM2: 0.99,
      footprintCells: 399,
      forceDeltaN: 1093,
      gridSampleCount: 399,
      gridVelocityMps: 0.59,
      horizontalForceDeltaN: -0.3,
      impulseCells: 399,
      impulseMagnitude: 1.45,
      liftDeltaN: 17,
      sampleTimeS: 1.4,
      slamDeltaN: 940,
      surfaceOffsetM: 0.91,
      verticalForceDeltaN: 1093,
    },
    lastParticleSplash: {
      active: true,
      boundedDiagnostics: true,
      coupling: "localized-particle-splash-live-v1",
      displacedWaterMassKg: 307.4,
      dropletDensity: 0.56,
      gridFeedback: {
        bounds: { xEnd: 387, xStart: 381, yEnd: 210, yStart: 204 },
        energyJ: 58.4,
        foamInjection: 0.04,
        impulseNs: 87.3,
        massKg: 25.4,
        sampleCount: 28,
      },
      impactMomentumNs: 11017,
      massFractionOfDisplaced: 0.34,
      maxLaunchSpeedMps: 6.3,
      momentumFractionOfImpact: 0.028,
      noFullGridReadbackPerFrame: true,
      particleCount: 1267,
      predictedCrownHeightM: 2.03,
      referenceSplashBand: {
        formula: "0.045..0.19 * impactSpeedMps^2 / gravityMps2 + 0.18..0.9 * objectDiameterM",
        maxM: 3.58,
        minM: 0.82,
      },
      reenteredMassKg: 25.4,
      reentryEnergyJ: 58.4,
      renderIntensity: 0.73,
      sampleTimeS: 1.4,
      sprayMassKg: 104.5,
    },
    lastPressure: {
      active: true,
      bufferRoles: ["height", "momentumX", "momentumY", "foam", "impulse"],
      cfl: 0.565,
      coupling: "bounded-pressure-gradient-live-v1",
      estimatedStorageBytes: 13_271_040,
      forceBoundN: 1581,
      gridVelocityMps: 0.015,
      horizontalForceDeltaN: -0.4,
      impulseEnergyEstimateJ: 10_742,
      maxMomentumPerDepthMps: 1.15,
      noFullGridReadbackPerFrame: true,
      pressureGain: 0.06,
      pressureWorkEstimateJ: 140,
      sampleTimeS: 1.4,
      slopeLimit: 0.34,
      verticalForceDeltaN: 348,
    },
    lastSplash: {
      active: true,
      accumulatedReentryEnergyJ: 0,
      accumulatedReentryMassKg: 0,
      boundedDiagnostics: true,
      bounds: { xEnd: 389, xStart: 291, yEnd: 249, yStart: 189 },
      coupling: "grid-splash-v1",
      crownHeightM: 1.51,
      crownRadiusM: 2.4,
      entrainedAirFraction: 0.75,
      foamCells: 5627,
      foamEnergyJ: 6086,
      foamInjection: 1,
      froudeNumber: 4.62,
      gridEnergyJ: 8453,
      gridSampleCount: 5627,
      peakFoamEnergyJ: 6523,
      reentryCoupledEnergyJ: 0,
      sampleTimeS: 1.4,
      secondaryImpulseMagnitude: 0,
      sprayDropletCount: 182,
      sprayMassKg: 133.5,
      surfaceBreakupFactor: 1.23,
      weberNumber: 1_529_166,
    },
    renderer: "webgpu-grid-primary-v1",
    tier: "ultra",
  };
}

function telemetry(): FluidReferenceCanvasTelemetry {
  return {
    forceBoundN: 1581,
    frames: 180,
    grid: "768x432",
    noFullGridReadbackPerFrame: true,
    particles: "localized-particle-splash-live-v1",
    particlesActive: true,
    pressure: "bounded-pressure-gradient-live-v1",
    pressureActive: true,
    renderer: "webgpu-grid-primary-v1",
    status: "rendered",
    tier: "ultra",
    verticalPressureForceN: 348,
    waterContext: "webgpu",
  };
}

function referenceDataset(): FluidReferenceDataset {
  return {
    cases: [
      {
        category: "drop",
        id: "drop-speed-concrete-8m",
        measurements: [
          {
            expected: { formula: "sqrt(2 * gravity * dropHeightM)", kind: "formula-band", lowerFactor: 0.88, upperFactor: 1 },
            id: "water-entry-speed",
            method: "impact-speed-vacuum-freefall-band",
            metric: "water entry speed",
            sourceIds: ["nist-standard-gravity", "fg06-calibration-evidence"],
            uncertainty: "test",
            unit: "m/s",
          },
        ],
        scenario: { dropHeightM: 8, objectPresetId: "concrete-cube", oceanPresetId: "calm-seawater-tank", releaseAngleRad: 0, timeStepS: 0.01 },
        title: "Concrete cube water-entry speed from 8 m",
      },
      {
        category: "splash",
        id: "high-weber-splash-height",
        measurements: [
          {
            expected: {
              formula: "lower = 0.045 * (impactSpeedMps^2 / gravity) + 0.18 * objectHeightM; upper = 0.19 * (impactSpeedMps^2 / gravity) + 0.9 * objectHeightM",
              kind: "formula-band",
            },
            id: "splash-crown-height",
            method: "splash-ballistic-head-band",
            metric: "splash crown height",
            sourceIds: ["fg06-calibration-evidence", "fg09-solver-architecture"],
            uncertainty: "test",
            unit: "m",
          },
        ],
        scenario: { dropHeightM: 8, objectPresetId: "concrete-cube", oceanPresetId: "calm-seawater-tank", releaseAngleRad: 0, timeStepS: 0.01 },
        title: "Concrete cube high-Weber splash crown band",
      },
    ],
    datasetId: "ocean-impact-reference-v1",
    description: "test",
    schemaVersion: 1,
    sources: [],
    title: "test",
  };
}
