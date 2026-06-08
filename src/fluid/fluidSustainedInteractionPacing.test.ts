import { describe, expect, it } from "vitest";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidCalibrationInstallReceipt } from "./fluidInstalledCalibration";
import { calibrationProfileForAdaptiveReport } from "./fluidPersistedCalibration";
import {
  createFluidSustainedInteractionPacingReport,
  type SustainedInteractionAction,
} from "./fluidSustainedInteractionPacing";
import type { FluidCapabilityReport } from "./webgpuCapability";
import type { InstalledDisplayPacingSample } from "./fluidInstalledDisplayPacing";

describe("sustained calibrated interaction pacing gate", () => {
  it("passes when an installed calibrated-auto ultra runtime stays smooth through a mixed sustained workload", () => {
    const report = createFluidSustainedInteractionPacingReport({
      adaptiveSource: adaptiveReport(),
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      generatedAt: "2026-06-08T00:00:00.000Z",
      install: installReceipt(),
      launchMode: "packaged-app",
      runtime: runtime(),
      workload: workload(smoothSamples()),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-29");
    expect(report.storage.reusedByMainProcess).toBe(true);
    expect(report.summary.actionCount).toBe(4);
    expect(report.summary.stability).toBe("smooth");
  });

  it("rejects a sustained workload with choppy frames and lost calibrated ultra telemetry", () => {
    const report = createFluidSustainedInteractionPacingReport({
      adaptiveSource: adaptiveReport(),
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      install: installReceipt(),
      launchMode: "packaged-app",
      runtime: {
        ...runtime(),
        selectedTier: "high",
        selection: {
          mode: "calibration-provenance-fallback-high",
          preferredTier: "high",
          reason: "local calibration profile WebGPU capability provenance did not match this runtime",
          requestedTier: "auto",
        },
      },
      workload: workload(
        smoothSamples().map((sample, index) => ({
          ...sample,
          capabilityGrid: index > 10 ? "512x288" : sample.capabilityGrid,
          capabilitySelectedTier: index > 10 ? "high" : sample.capabilitySelectedTier,
          dtMs: index % 10 === 0 ? 42 : sample.dtMs,
          tier: index > 10 ? "high" : sample.tier,
          tierSelectionMode: index > 10 ? "calibration-provenance-fallback-high" : sample.tierSelectionMode,
          tierSelectionPreferredTier: index > 10 ? "high" : sample.tierSelectionPreferredTier,
        }))
      ),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("display pacing missed");
    expect(report.failures.join(" ")).toContain("runtime selection mode");
    expect(report.failures.join(" ")).toContain("samples did not all observe calibrated-auto");
    expect(report.failures.join(" ")).toContain("samples did not all use 768x432");
  });
});

function workload(samples: InstalledDisplayPacingSample[]) {
  return {
    actions: actions(),
    durationMs: 12_800,
    expectedActivePhysics: true,
    id: "sustained-calibrated-mixed-drops",
    label: "Sustained calibrated mixed object drops",
    samples,
    telemetry: {
      couplingActiveSeen: true,
      finalPhase: "settled",
      firedActionCount: actions().length,
      longTaskSupported: false,
      particlesActiveSeen: true,
      pressureActiveSeen: true,
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      timeScale: 1,
      waterContext: "webgpu",
    },
  };
}

function actions(): SustainedInteractionAction[] {
  return [
    { atMs: 0, dropHeightM: 8, label: "Concrete cube dense impact", presetId: "concrete-cube", releaseAngleRad: 0 },
    { atMs: 3_200, dropHeightM: 1.35, label: "Foam block damping", presetId: "foam-rescue-block", releaseAngleRad: 0.18 },
    { atMs: 6_400, dropHeightM: 2.2, label: "Leaky drum float/fill", presetId: "leaky-steel-drum", releaseAngleRad: -0.14 },
    { atMs: 9_600, dropHeightM: 5.2, label: "Steel sphere compact sink", presetId: "steel-sphere", releaseAngleRad: 0.06 },
  ];
}

function smoothSamples(): InstalledDisplayPacingSample[] {
  return Array.from({ length: 640 }, (_value, index) => ({
    atMs: index * 16.3,
    capabilityGrid: "768x432",
    capabilitySelectedTier: "ultra",
    couplingActive: index > 20,
    droppedDebtS: 0,
    dtMs: index === 0 ? 0 : 16.3,
    longTaskCount: 0,
    longTaskDurationMs: 0,
    maxSubstepsObserved: 1,
    particlesActive: index > 25,
    phase: index < 6 ? "ready" : index > 560 ? "settled" : "falling",
    physicsTimeS: index * 0.0163,
    pressureActive: index > 18,
    renderMode: "webgpu",
    renderer: "webgpu-grid-primary-v1",
    tier: "ultra",
    tierSelectionMode: "calibrated-auto",
    tierSelectionPreferredTier: "ultra",
    tierSelectionRequestedTier: "auto",
    totalSubsteps: index,
    waterContext: "webgpu",
    waterFrame: index,
  }));
}

function installReceipt(): FluidCalibrationInstallReceipt {
  const adaptive = adaptiveReport();
  return {
    fileName: "fluid-calibration.v1.json",
    installedAt: "2026-06-08T00:00:00.000Z",
    installedProfile: calibrationProfileForAdaptiveReport(adaptive, "2026-06-08T00:00:00.000Z", {
      capabilityReport: capabilityReport(),
    }),
    persistedRawBytes: 321,
    storageBasePath: "/tmp/Ocean Impact Lab/harborline-game",
    verificationReadMatched: true,
  };
}

function runtime() {
  return {
    envCalibratedTierPresent: false,
    envRequestedTierPresent: false,
    selectedGrid: { cellsX: 768, cellsY: 432 },
    selectedTier: "ultra",
    selection: {
      calibratedTier: "ultra" as FluidGridTierId,
      mode: "calibrated-auto" as const,
      preferredTier: "ultra" as const,
      reason: "local calibration selected tier",
      requestedTier: "auto" as const,
    },
  };
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
    runtimeProbe: {
      grid: "768x432",
      launchMode: "packaged-app",
      renderer: "webgpu-grid-primary-v1",
      requestedTier: "auto",
      selectedGrid: { cellsX: 768, cellsY: 432 },
      selectedTier: "ultra",
      selection: runtime().selection,
      tier: "ultra",
      waterContext: "webgpu",
      waterFrames: 20,
    },
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

function capabilityReport(): FluidCapabilityReport {
  return {
    adapterInfo: "apple / metal-3",
    adapterName: "apple / metal-3",
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
