import { describe, expect, it } from "vitest";
import {
  createFluidHighResolutionFoamSettlingCalibrationReport,
  type FoamSettlingSnapshotSample,
  type FluidHighResolutionFoamSettlingCalibrationOptions,
} from "./fluidHighResolutionFoamSettlingCalibration";

describe("high-resolution foam settling calibration gate", () => {
  it("passes when a live settled-window sample improves the foam frontier residual", () => {
    const report = createFluidHighResolutionFoamSettlingCalibrationReport(baseOptions());

    expect(report.gate).toBe("G-FG-51");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.improvement.buoyancyImprovementRatioFromFirst).toBeGreaterThan(0.35);
    expect(report.improvement.settledTargetErrorRatio).toBeLessThan(0.6);
  });

  it("allows a transient first tolerance sample to be better than the sustained settled state", () => {
    const options = baseOptions();
    const report = createFluidHighResolutionFoamSettlingCalibrationReport({
      ...options,
      live: {
        ...options.live,
        firstWithinTolerance: {
          ...options.live.firstWithinTolerance,
          buoyancyErrorRatio: 0.021,
        },
        settledWindow: {
          ...options.live.settledWindow,
          buoyancyErrorRatio: 0.043,
        },
      },
    });

    expect(report.pass).toBe(true);
    expect(report.improvement.buoyancyImprovementRatioFromFirst).toBe(0);
    expect(report.improvement.buoyancyImprovementRatioFromSourceResidual).toBeGreaterThan(0.18);
  });

  it("rejects weak FG-50/FG-48 provenance", () => {
    const options = baseOptions();
    const report = createFluidHighResolutionFoamSettlingCalibrationReport({
      ...options,
      sourceFrontier: {
        ...options.sourceFrontier,
        gate: "G-FG-49" as "G-FG-50",
        noRegressionGuard: {
          ...options.sourceFrontier.noRegressionGuard,
          sourceVisualLiveGrid: "768x432",
        },
      },
      sourceTargetResiduals: {
        ...options.sourceTargetResiduals,
        gate: "G-FG-47" as "G-FG-48",
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("source frontier gate was G-FG-49");
    expect(report.failures.join(" ")).toContain("source frontier visual live grid was 768x432");
    expect(report.failures.join(" ")).toContain("source target residual gate was G-FG-47");
  });

  it("rejects a first tolerance sample that is already settled", () => {
    const options = baseOptions();
    const report = createFluidHighResolutionFoamSettlingCalibrationReport({
      ...options,
      live: {
        ...options.live,
        firstWithinTolerance: {
          ...options.live.firstWithinTolerance,
          settledAtS: 1.8,
          settledWindowS: 2.5,
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("first foam sample was already settled");
  });

  it("rejects a settled sample without the 2.4 second stability window", () => {
    const options = baseOptions();
    const report = createFluidHighResolutionFoamSettlingCalibrationReport({
      ...options,
      live: {
        ...options.live,
        settledWindow: {
          ...options.live.settledWindow,
          settledAtS: null,
          settledWindowS: null,
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("settled foam sample did not expose settledAtS");
    expect(report.failures.join(" ")).toContain("settled foam window 0.0000 was below 2.4");
  });

  it("rejects cosmetic sampling that does not improve buoyancy residuals", () => {
    const options = baseOptions();
    const report = createFluidHighResolutionFoamSettlingCalibrationReport({
      ...options,
      live: {
        ...options.live,
        settledWindow: {
          ...options.live.settledWindow,
          buoyancyErrorRatio: 0.052,
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("settled foam buoyancy error ratio 0.0520 exceeded 0.045");
    expect(report.failures.join(" ")).toContain("settled foam target error ratio 0.6500 exceeded 0.6");
  });

  it("rejects fallback renderer or readback telemetry", () => {
    const options = baseOptions();
    const report = createFluidHighResolutionFoamSettlingCalibrationReport({
      ...options,
      live: {
        ...options.live,
        runtime: {
          ...options.live.runtime,
          liveGrid: "768x432",
          renderer: "canvas-2d",
          waterContext: "2d",
        },
        settledWindow: {
          ...options.live.settledWindow,
          liveGrid: "768x432",
          pressureNoFullGridReadback: false,
          renderer: "canvas-2d",
          waterContext: "2d",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("live grid was 768x432");
    expect(report.failures.join(" ")).toContain("renderer was canvas-2d");
    expect(report.failures.join(" ")).toContain("settled foam sample pressure path used full-grid readback");
  });
});

function baseOptions(): FluidHighResolutionFoamSettlingCalibrationOptions {
  return {
    generatedAt: "2026-06-09T00:00:00.000Z",
    live: {
      consoleErrors: [],
      firstWithinTolerance: sample("first-within-tolerance", {
        buoyancyErrorRatio: 0.0675,
        settledAtS: null,
        settledWindowS: null,
        timeS: 1.98,
      }),
      launchMode: "packaged-app",
      pageErrors: [],
      runtime: {
        capabilityGrid: "768x432",
        liveGrid: "1024x576",
        preferredTier: "ultra",
        renderer: "webgpu-grid-primary-v1",
        runtimeGridOverride: "1024x576",
        selectedTier: "ultra",
        waterContext: "webgpu",
        waterFrames: 640,
      },
      settledWindow: sample("settled-window", {
        buoyancyErrorRatio: 0.029,
        settledAtS: 2.05,
        settledWindowS: 2.45,
        timeS: 4.5,
      }),
    },
    sourceFrontier: {
      actionSummary: {
        monitorCount: 8,
        physicsTuningCandidateIds: ["live-foam-settled-buoyancy-error"],
        referenceTargetReviewIds: ["live-drop-speed-reference"],
      },
      failures: [],
      frontier: [
        {
          actionKind: "physics-tuning-candidate",
          category: "damping",
          comparisonId: "live-foam-settled-buoyancy-error",
          objective: "lower-is-better",
          priority: 2,
          reason: "foam tuning",
          targetErrorRatio: 0.6873,
          toleranceMarginRatio: 0.3127,
        },
      ],
      gate: "G-FG-50",
      generatedAt: "2026-06-09T00:00:00.000Z",
      noRegressionGuard: {
        acceptedBandsPreserved: true,
        comparisonCount: 10,
        maxAllowedTargetErrorRatio: 0.85,
        minAllowedToleranceMarginRatio: 0.05,
        objectiveCounts: { exact: 2, "lower-is-better": 4, "target-midpoint": 4 },
        sourceGate: "G-FG-48",
        sourceVisualGate: "G-FG-47",
        sourceVisualLiveGrid: "1024x576",
      },
      pass: true,
      sourcePath: "docs/evidence/FG-48-installed-high-resolution-target-residuals-2026-06-08.json",
      thresholds: {
        frontierTargetErrorRatio: 0.65,
        minFrontierItems: 2,
        minToleranceMarginRatio: 0.3,
      },
    },
    sourceTargetResiduals: {
      comparisons: [
        comparison("live-foam-settled-buoyancy-error", "lower-is-better", 0.05498412049621974, 0.6873015062027468),
        comparison("live-drop-speed-reference", "target-midpoint", 12.1, 0.6973137466910289),
      ],
      failures: [],
      gate: "G-FG-48",
      generatedAt: "2026-06-09T00:00:00.000Z",
      pass: true,
      sourceResidualBudget: {
        closestMarginRatio: 0.37,
        comparisonCount: 10,
        failures: [],
        gate: "G-FG-46",
        pass: true,
        sourcePath: "docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json",
        worstNormalizedResidual: 0.62,
      },
      sourceVisualWatchdog: {
        blankSampleIds: [],
        flatSampleIds: [],
        gate: "G-FG-47",
        liveGrid: "1024x576",
        pass: true,
        sampleCount: 6,
        sourcePath: "docs/evidence/FG-47-installed-high-resolution-visual-watchdog-2026-06-08.json",
        waterFrameDelta: 120,
      },
      summary: {
        categories: ["damping", "drop", "float", "sink", "splash"],
        closestToleranceMarginRatio: 0.31,
        comparisonCount: 10,
        objectiveCounts: { exact: 2, "lower-is-better": 4, "target-midpoint": 4 },
        targetWatchComparisonIds: [],
        toleranceWatchComparisonIds: [],
        worstTargetErrorRatio: 0.6973,
      },
      thresholds: {
        maxTargetErrorRatio: 0.85,
        minToleranceMarginRatio: 0.05,
        watchTargetErrorRatio: 0.7,
        watchToleranceMarginRatio: 0.12,
      },
    },
  };
}

function sample(
  sampleKind: "first-within-tolerance" | "settled-window",
  patch: Partial<FoamSettlingSnapshotSample>
) {
  return {
    angularSpeedRadps: 0.03,
    buoyancyErrorRatio: 0.03,
    draftErrorM: 0.01,
    liveGrid: "1024x576",
    phase: "floating",
    pressureActive: true,
    pressureNoFullGridReadback: true,
    renderer: "webgpu-grid-primary-v1",
    sampleKind,
    settledAtS: null,
    settledWindowS: null,
    timeS: 2,
    verticalSpeedMps: 0.02,
    waterContext: "webgpu",
    waterFrames: 240,
    withinTolerance: true,
    ...patch,
  };
}

function comparison(id: string, objective: "exact" | "lower-is-better" | "target-midpoint", actual: number, targetErrorRatio: number) {
  return {
    actual,
    category: id.includes("drop") ? "drop" as const : "damping" as const,
    expected: { max: id.includes("foam") ? 0.08 : 13, min: 0 },
    halfWidth: 0.04,
    id,
    marginRatio: 0.31,
    nearestBoundMargin: 0.025,
    normalizedResidual: 0.62,
    objective,
    pass: true,
    risk: "ok" as const,
    targetErrorRatio,
    targetMidpoint: 0.04,
    targetRisk: "ok" as const,
    targetValue: 0,
    toleranceMarginRatio: 0.31,
    unit: id.includes("foam") ? "ratio" : "m/s",
  };
}
