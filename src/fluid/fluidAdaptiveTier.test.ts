import { describe, expect, it } from "vitest";
import type { FluidResolutionScalingReport } from "./fluidResolutionScaling";
import type { FluidUltraReferenceOutcomesReport } from "./fluidUltraReferenceOutcomes";
import type { FluidUltraRendererReport } from "./fluidUltraRenderer";
import { createFluidAdaptiveTierReport, fluidRuntimeTierSelectionFromSearch, recommendAdaptiveFluidTier } from "./fluidAdaptiveTier";

describe("adaptive fluid tier calibration", () => {
  it("keeps explicit tier overrides ahead of calibrated auto recommendations", () => {
    const selection = fluidRuntimeTierSelectionFromSearch("?fluidTier=standard&calibratedFluidTier=ultra");

    expect(selection.mode).toBe("explicit");
    expect(selection.preferredTier).toBe("standard");
    expect(selection.calibratedTier).toBe("ultra");
  });

  it("uses the calibrated tier when auto tier selection is requested", () => {
    const selection = fluidRuntimeTierSelectionFromSearch("?fluidTier=auto&calibratedFluidTier=ultra");

    expect(selection.mode).toBe("calibrated-auto");
    expect(selection.preferredTier).toBe("ultra");
    expect(selection.requestedTier).toBe("auto");
  });

  it("falls back to high when auto is requested without valid calibration", () => {
    const selection = fluidRuntimeTierSelectionFromSearch("?fluidTier=auto&calibratedFluidTier=banana");

    expect(selection.mode).toBe("auto-fallback-high");
    expect(selection.preferredTier).toBe("high");
  });

  it("recommends ultra when scaling, renderer pacing, and reference outcomes all have local headroom", () => {
    const recommendation = recommendAdaptiveFluidTier({
      resolutionScaling: resolutionScaling(),
      ultraReference: ultraReference(),
      ultraRenderer: ultraRenderer(),
    });

    expect(recommendation.selectedTier).toBe("ultra");
    expect(recommendation.failures).toEqual([]);
    expect(recommendation.summary.maxUltraGpuP95StepMs).toBeCloseTo(0.09, 3);
  });

  it("rejects ultra auto promotion when live pacing loses its headroom", () => {
    const recommendation = recommendAdaptiveFluidTier({
      resolutionScaling: resolutionScaling(),
      ultraReference: ultraReference(),
      ultraRenderer: {
        ...ultraRenderer(),
        summary: {
          ...ultraRenderer().summary,
          maxP95FrameMs: 24,
        },
      },
    });

    expect(recommendation.selectedTier).toBe("high");
    expect(recommendation.failures.join(" ")).toContain("ultra live p95");
  });

  it("passes the FG-23 report when the packaged runtime selects calibrated auto ultra", () => {
    const report = createFluidAdaptiveTierReport({
      generatedAt: "2026-06-08T00:00:00.000Z",
      resolutionScaling: resolutionScaling(),
      runtimeProbe: {
        grid: "768x432",
        launchMode: "packaged-app",
        renderer: "webgpu-grid-primary-v1",
        requestedTier: "auto",
        selectedGrid: { cellsX: 768, cellsY: 432 },
        selectedTier: "ultra",
        selection: fluidRuntimeTierSelectionFromSearch("?fluidTier=auto&calibratedFluidTier=ultra"),
        tier: "ultra",
        waterContext: "webgpu",
        waterFrames: 20,
      },
      ultraReference: ultraReference(),
      ultraRenderer: ultraRenderer(),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-23");
    expect(report.recommendation.selectedTier).toBe("ultra");
  });
});

function resolutionScaling(): FluidResolutionScalingReport {
  return {
    capability: null,
    failures: [],
    gate: "G-FG-20",
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
    pass: true,
    summary: {
      maxEstimatedStorageBytes: 18_841_600,
      maxGridGpuP95StepMs: 0.09,
      maxParticleGpuP95StepMs: 0.03,
      maxPressureGpuP95StepMs: 0.08,
      tierCount: 3,
      ultraToHighRatios: {
        gridGpuP95: 2.1,
        particlesGpuP95: 1.9,
        pressureGpuP95: 1.1,
      },
    },
    thresholds: {
      maxGridUltraGpuP95StepMs: 2,
      maxParticleUltraGpuP95StepMs: 2.5,
      maxPressureUltraGpuP95StepMs: 2.5,
      maxUltraToHighGpuP95Ratio: 5,
      requireGpuTimestamps: true,
    },
    tiers: [
      tier("standard", 36_864, 0.014, 0.01, 0.02, 2_129_920),
      tier("high", 147_456, 0.044, 0.071, 0.015, 8_388_608),
      tier("ultra", 331_776, 0.09, 0.073, 0.029, 18_841_600),
    ],
  };
}

function tier(tierId: "high" | "standard" | "ultra", cellCount: number, grid: number, pressure: number, particles: number, storage: number) {
  return {
    cellCount,
    estimatedStorageBytes: storage,
    gridGpuP95StepMs: grid,
    gridPass: true,
    gridWallAverageStepMs: grid,
    particleCapacity: tierId === "ultra" ? 8192 : tierId === "high" ? 4096 : 2048,
    particleGpuP95StepMs: particles,
    particlesPass: true,
    particlesWallAverageStepMs: particles,
    pressureGpuP95StepMs: pressure,
    pressurePass: true,
    pressureWallAverageStepMs: pressure,
    tier: tierId,
  };
}

function ultraRenderer(): FluidUltraRendererReport {
  return {
    displayPacing: {
      failures: [],
      gate: "G-FG-19",
      generatedAt: "2026-06-08T00:00:00.000Z",
      launchMode: "packaged-app",
      pass: true,
      scenarios: [],
      summary: {
        maxDroppedDebtS: 0,
        maxP95FrameMs: 9.3,
        maxP99FrameMs: 9.4,
        scenarioCount: 2,
        worstDroppedFrameRatio: 0,
        worstDuplicateWaterFrameRatio: 0,
      },
      thresholds: {
        maxDroppedDebtS: 0,
        maxDroppedFrameRatio: 0.06,
        maxDuplicateWaterFrameRatio: 0.12,
        maxLongTaskDurationMs: 120,
        maxP95FrameMs: 24,
        maxP99FrameMs: 36,
        maxSimTimeRatio: 1.25,
        minActiveSimTimeRatio: 0.72,
        minAverageFps: 55,
        minSamples: 120,
        minWaterFrameDelta: 30,
        targetFrameMs: 1000 / 60,
      },
    },
    failures: [],
    gate: "G-FG-21",
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
    pass: true,
    preferredTier: "ultra",
    selectedGrid: { cellsX: 768, cellsY: 432 },
    selectedTier: "ultra",
    summary: {
      maxP95FrameMs: 9.3,
      maxP99FrameMs: 9.4,
      scenarioCount: 2,
      worstDroppedFrameRatio: 0,
    },
  };
}

function ultraReference(): FluidUltraReferenceOutcomesReport {
  return {
    capability: { grid: { cellsX: 768, cellsY: 432 }, selectedTier: "ultra" },
    cases: [],
    comparisons: [],
    consumedCoupling: null,
    failures: [],
    finalStats: null,
    frameLoop: null,
    gate: "G-FG-22",
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
    noFullGridReadbackPerFrame: true,
    pass: true,
    preferredTier: "ultra",
    selectedGrid: { cellsX: 768, cellsY: 432 },
    selectedTier: "ultra",
    summary: {
      caseCount: 5,
      categories: ["damping", "drop", "float", "sink", "splash"],
      comparisonCount: 10,
      liveGrid: "768x432",
      pressureForceBoundN: 86,
    },
    telemetry: {
      forceBoundN: 86,
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
      verticalPressureForceN: 12,
      waterContext: "webgpu",
    },
  };
}
