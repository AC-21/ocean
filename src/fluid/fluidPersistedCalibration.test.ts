import { describe, expect, it } from "vitest";
import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import {
  calibrationProfileForAdaptiveReport,
  createFluidPersistedCalibrationReport,
  validateFluidCalibrationProfile,
  type FluidCalibrationProfile,
} from "./fluidPersistedCalibration";
import type { FluidCapabilityReport } from "./webgpuCapability";

describe("persisted fluid calibration gate", () => {
  it("creates a strict persisted profile from passing adaptive tier evidence", () => {
    const profile = calibrationProfileForAdaptiveReport(adaptiveReport(), "2026-06-08T00:00:00.000Z", {
      capabilityReport: capabilityReport(),
    });

    expect(profile).toMatchObject({
      appVersion: "0.1.0",
      capability: {
        adapterInfo: "apple / metal-3",
        backend: "webgpu-compute",
        sourceGate: "G-FG-01",
        status: "webgpu-ready",
      },
      pass: true,
      schema: "ocean-fluid-calibration-profile-v1",
      selectedTier: "ultra",
      source: {
        adaptiveGeneratedAt: "2026-06-08T00:00:00.000Z",
        adaptiveGate: "G-FG-23",
        selectedTier: "ultra",
      },
      sourceGate: "G-FG-23",
    });
    expect(profile.summary.maxUltraGpuP95StepMs).toBe(0.09025);
  });

  it("validates app-version and source provenance before a profile can be trusted", () => {
    const profile = calibrationProfileForAdaptiveReport(adaptiveReport(), "2026-06-08T00:00:00.000Z", {
      appVersion: "0.1.0",
      capabilityReport: capabilityReport(),
    });

    expect(validateFluidCalibrationProfile(profile, { expectedAppVersion: "0.1.0" })).toEqual([]);
    expect(validateFluidCalibrationProfile({ ...profile, appVersion: "0.0.0-stale" }, { expectedAppVersion: "0.1.0" }).join(" ")).toContain(
      "did not match"
    );
    expect(
      validateFluidCalibrationProfile(
        {
          ...profile,
          source: { ...profile.source, selectedTier: "high" },
        },
        { expectedAppVersion: "0.1.0" }
      ).join(" ")
    ).toContain("source tier");
    expect(
      validateFluidCalibrationProfile(
        {
          ...profile,
          capability: { ...profile.capability, adapterInfo: "external / copied-profile" },
        },
        { expectedAppVersion: "0.1.0" }
      ).join(" ")
    ).toContain("capability fingerprint");
  });

  it("passes when packaged runtime uses the saved profile without an env calibrated tier", () => {
    const adaptive = adaptiveReport();
    const profile = calibrationProfileForAdaptiveReport(adaptive, "2026-06-08T00:00:00.000Z", {
      capabilityReport: capabilityReport(),
    });
    const report = createFluidPersistedCalibrationReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: false,
      fileName: "fluid-calibration.v1.json",
      generatedAt: "2026-06-08T00:00:00.000Z",
      launchMode: "packaged-app",
      profile,
      runtimeProbe: runtimeProbe(),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-24");
    expect(report.storage.readByMainProcess).toBe(true);
  });

  it("rejects an env-provided calibrated tier because the persisted gate must prove app-owned state", () => {
    const adaptive = adaptiveReport();
    const report = createFluidPersistedCalibrationReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: true,
      fileName: "fluid-calibration.v1.json",
      launchMode: "packaged-app",
      profile: calibrationProfileForAdaptiveReport(adaptive, undefined, { capabilityReport: capabilityReport() }),
      runtimeProbe: runtimeProbe(),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("must be absent");
  });

  it("rejects a runtime that ignores the saved profile and falls back to high", () => {
    const adaptive = adaptiveReport();
    const report = createFluidPersistedCalibrationReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: false,
      fileName: "fluid-calibration.v1.json",
      launchMode: "packaged-app",
      profile: calibrationProfileForAdaptiveReport(adaptive, undefined, { capabilityReport: capabilityReport() }),
      runtimeProbe: {
        ...runtimeProbe(),
        selectedGrid: { cellsX: 512, cellsY: 288 },
        selectedTier: "high",
        selection: {
          mode: "auto-fallback-high",
          preferredTier: "high",
          reason: "auto requested without valid calibration",
          requestedTier: "auto",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("runtime selection mode");
    expect(report.failures.join(" ")).toContain("runtime selected tier");
  });
});

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
    runtimeProbe: runtimeProbe(),
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

function runtimeProbe(): FluidAdaptiveTierRuntimeProbe {
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

function capabilityReport(): FluidCapabilityReport {
  return {
    adapterInfo: "apple / metal-3",
    adapterName: "apple / metal-3",
    backend: "webgpu-compute",
    fallbackReason: null,
    features: ["timestamp-query", "shader-f16"],
    forbiddenProductionRenderers: ["canvas-2d", "per-pixel-cpu-water-draw", "visual-only-water"],
    generatedAt: "2026-06-07T19:51:23.844Z",
    grid: {
      cellsX: 512,
      cellsY: 288,
      estimatedBytes: 4_718_592,
      tier: "high",
    },
    limits: {
      maxBufferSize: 268_435_456,
      maxComputeInvocationsPerWorkgroup: 256,
      maxComputeWorkgroupSizeX: 256,
      maxComputeWorkgroupSizeY: 256,
      maxComputeWorkgroupsPerDimension: 65_535,
      maxStorageBufferBindingSize: 134_217_728,
    },
    requiredBrowserApis: ["navigator.gpu", "GPUDevice", "GPUComputePassEncoder"],
    selectedTier: "high",
    status: "webgpu-ready",
  };
}
