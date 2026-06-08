import { describe, expect, it } from "vitest";
import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import {
  createFluidCalibrationFreshnessReport,
} from "./fluidCalibrationFreshness";
import {
  calibrationProfileForAdaptiveReport,
  type FluidCalibrationProfile,
} from "./fluidPersistedCalibration";

describe("fluid calibration freshness gate", () => {
  it("passes when a current profile is reused and a stale profile falls back", () => {
    const adaptive = adaptiveReport();
    const report = createFluidCalibrationFreshnessReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      expectedAppVersion: "0.1.0",
      fileName: "fluid-calibration.v1.json",
      generatedAt: "2026-06-08T00:00:00.000Z",
      launchMode: "packaged-app",
      staleProfile: profileFor(adaptive, "0.0.0-stale"),
      staleProfileProbe: staleProbe(),
      validProfile: profileFor(adaptive, "0.1.0"),
      validProfileProbe: validProbe(),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-27");
    expect(report.storage.validProfileReusedByMainProcess).toBe(true);
    expect(report.storage.staleProfileRejectedByMainProcess).toBe(true);
  });

  it("rejects freshness evidence that relies on environment tier inputs", () => {
    const adaptive = adaptiveReport();
    const report = createFluidCalibrationFreshnessReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: true,
      envRequestedTierPresent: true,
      expectedAppVersion: "0.1.0",
      fileName: "fluid-calibration.v1.json",
      launchMode: "packaged-app",
      staleProfile: profileFor(adaptive, "0.0.0-stale"),
      staleProfileProbe: staleProbe(),
      validProfile: profileFor(adaptive, "0.1.0"),
      validProfileProbe: validProbe(),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent");
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_FLUID_TIER must be absent");
  });

  it("rejects a stale profile that still reaches calibrated-auto ultra", () => {
    const adaptive = adaptiveReport();
    const report = createFluidCalibrationFreshnessReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      expectedAppVersion: "0.1.0",
      fileName: "fluid-calibration.v1.json",
      launchMode: "packaged-app",
      staleProfile: profileFor(adaptive, "0.0.0-stale"),
      staleProfileProbe: validProbe(),
      validProfile: profileFor(adaptive, "0.1.0"),
      validProfileProbe: validProbe(),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("stale profile requested tier");
    expect(report.failures.join(" ")).toContain("stale profile selection mode");
    expect(report.failures.join(" ")).toContain("stale profile selected tier");
  });
});

function profileFor(adaptive: FluidAdaptiveTierReport, appVersion: string): FluidCalibrationProfile {
  return calibrationProfileForAdaptiveReport(adaptive, "2026-06-08T00:00:00.000Z", { appVersion });
}

function adaptiveReport(): FluidAdaptiveTierReport {
  return {
    failures: [],
    gate: "G-FG-23",
    generatedAt: "2026-06-08T00:00:00.000Z",
    pass: true,
    recommendation: {
      failures: [],
      reason: "ultra has measured local headroom and live reference parity",
      selectedTier: "ultra",
      summary: {
        maxEstimatedStorageBytes: 18_841_600,
        maxLiveP95FrameMs: 9.3,
        maxLiveP99FrameMs: 9.4,
        maxUltraGpuP95StepMs: 0.09025,
        maxUltraToHighGpuP95Ratio: 2.0688,
        referenceCategories: ["damping", "drop", "float", "sink", "splash"],
      },
    },
    runtimeProbe: validProbe(),
    sources: {
      resolutionScaling: {
        gate: "G-FG-20",
        pass: true,
        summary: {
          maxEstimatedStorageBytes: 18_841_600,
          maxGridGpuP95StepMs: 0.09025,
          maxParticleGpuP95StepMs: 0.028792,
          maxPressureGpuP95StepMs: 0.07325,
          tierCount: 3,
          ultraToHighRatios: {
            gridGpuP95: 2.0688,
            particlesGpuP95: 1.9195,
            pressureGpuP95: 1.0293,
          },
        },
      },
      ultraReference: {
        gate: "G-FG-22",
        pass: true,
        selectedTier: "ultra",
        summary: {
          caseCount: 5,
          categories: ["damping", "drop", "float", "sink", "splash"],
          comparisonCount: 10,
          liveGrid: "768x432",
          pressureForceBoundN: 86,
        },
      },
      ultraRenderer: {
        gate: "G-FG-21",
        pass: true,
        selectedTier: "ultra",
        summary: {
          maxP95FrameMs: 9.3,
          maxP99FrameMs: 9.4,
          scenarioCount: 2,
          worstDroppedFrameRatio: 0,
        },
      },
    },
    thresholds: {
      maxDroppedFrameRatio: 0.01,
      maxEstimatedStorageBytes: 32 * 1024 * 1024,
      maxLiveP95FrameMs: 1000 / 60,
      maxLiveP99FrameMs: 20,
      maxUltraGpuP95StepMs: 1,
      maxUltraToHighGpuP95Ratio: 3,
    },
  };
}

function validProbe(): FluidAdaptiveTierRuntimeProbe {
  return {
    grid: "768x432",
    launchMode: "packaged-app",
    renderer: "webgpu-grid-primary-v1",
    requestedTier: "auto",
    selectedGrid: { cellsX: 768, cellsY: 432 },
    selectedTier: "ultra",
    selection: {
      calibratedTier: "ultra",
      mode: "calibrated-auto",
      preferredTier: "ultra",
      reason: "local calibration selected tier",
      requestedTier: "auto",
    },
    tier: "ultra",
    waterContext: "webgpu",
    waterFrames: 20,
  };
}

function staleProbe(): FluidAdaptiveTierRuntimeProbe {
  return {
    grid: "512x288",
    launchMode: "packaged-app",
    renderer: "webgpu-grid-primary-v1",
    requestedTier: "default",
    selectedGrid: { cellsX: 512, cellsY: 288 },
    selectedTier: "high",
    selection: {
      mode: "default-high",
      preferredTier: "high",
      reason: "default high tier until local calibration is available",
      requestedTier: "default",
    },
    tier: "high",
    waterContext: "webgpu",
    waterFrames: 20,
  };
}
