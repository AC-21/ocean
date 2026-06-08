import { describe, expect, it } from "vitest";
import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import { createFluidCalibrationProvenanceReport } from "./fluidCalibrationProvenance";
import { calibrationProfileForAdaptiveReport, type FluidCalibrationProfile } from "./fluidPersistedCalibration";
import type { FluidCapabilityReport } from "./webgpuCapability";

describe("fluid calibration provenance gate", () => {
  it("passes when valid profiles are reused, mismatched profiles downgrade, and tampered profiles are rejected", () => {
    const adaptive = adaptiveReport();
    const validProfile = profileFor(adaptive, capabilityReport("apple / metal-3"));
    const mismatchedProfile = profileFor(adaptive, capabilityReport("external / copied-profile"));
    const tamperedProfile = { ...validProfile, capability: { ...validProfile.capability, fingerprint: "tampered" } };
    const report = createFluidCalibrationProvenanceReport({
      adaptiveSource: adaptive,
      capabilitySource: capabilityReport("apple / metal-3"),
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      expectedAppVersion: "0.1.0",
      fileName: "fluid-calibration.v1.json",
      generatedAt: "2026-06-08T00:00:00.000Z",
      launchMode: "packaged-app",
      mismatchedProfile,
      mismatchedProfileProbe: mismatchedProbe(),
      tamperedProfile,
      tamperedProfileProbe: defaultHighProbe(),
      validProfile,
      validProfileProbe: validProbe(),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-28");
    expect(report.storage.validProfileReusedByMainProcess).toBe(true);
    expect(report.storage.mismatchedProfileDowngradedByRenderer).toBe(true);
    expect(report.storage.tamperedProfileRejectedByMainProcess).toBe(true);
    expect(report.profiles.tampered.validationFailures.join(" ")).toContain("capability fingerprint");
  });

  it("rejects a mismatched profile that still reaches calibrated-auto ultra", () => {
    const adaptive = adaptiveReport();
    const validProfile = profileFor(adaptive, capabilityReport("apple / metal-3"));
    const mismatchedProfile = profileFor(adaptive, capabilityReport("external / copied-profile"));
    const tamperedProfile = { ...validProfile, capability: { ...validProfile.capability, fingerprint: "tampered" } };
    const report = createFluidCalibrationProvenanceReport({
      adaptiveSource: adaptive,
      capabilitySource: capabilityReport("apple / metal-3"),
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      expectedAppVersion: "0.1.0",
      fileName: "fluid-calibration.v1.json",
      launchMode: "packaged-app",
      mismatchedProfile,
      mismatchedProfileProbe: validProbe(),
      tamperedProfile,
      tamperedProfileProbe: defaultHighProbe(),
      validProfile,
      validProfileProbe: validProbe(),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("mismatched profile selection mode");
    expect(report.failures.join(" ")).toContain("mismatched profile selected tier");
  });
});

function profileFor(adaptive: FluidAdaptiveTierReport, capability: FluidCapabilityReport): FluidCalibrationProfile {
  return calibrationProfileForAdaptiveReport(adaptive, "2026-06-08T00:00:00.000Z", {
    appVersion: "0.1.0",
    capabilityReport: capability,
  });
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

function mismatchedProbe(): FluidAdaptiveTierRuntimeProbe {
  return {
    grid: "512x288",
    launchMode: "packaged-app",
    renderer: "webgpu-grid-primary-v1",
    requestedTier: "auto",
    selectedGrid: { cellsX: 512, cellsY: 288 },
    selectedTier: "high",
    selection: {
      calibratedTier: "ultra",
      mode: "calibration-provenance-fallback-high",
      preferredTier: "high",
      reason: "local calibration profile WebGPU capability provenance did not match this runtime",
      requestedTier: "auto",
    },
    tier: "high",
    waterContext: "webgpu",
    waterFrames: 20,
  };
}

function defaultHighProbe(): FluidAdaptiveTierRuntimeProbe {
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

function capabilityReport(adapterInfo: string): FluidCapabilityReport {
  return {
    adapterInfo,
    adapterName: adapterInfo,
    backend: "webgpu-compute",
    fallbackReason: null,
    features: ["timestamp-query", "shader-f16"],
    forbiddenProductionRenderers: ["canvas-2d", "per-pixel-cpu-water-draw", "visual-only-water"],
    generatedAt: "2026-06-07T19:51:23.844Z",
    grid: { cellsX: 512, cellsY: 288, estimatedBytes: 4_718_592, tier: "high" },
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
