import { describe, expect, it } from "vitest";
import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import {
  createFluidInstalledCalibrationReport,
  installFluidCalibrationProfile,
} from "./fluidInstalledCalibration";
import type { FluidCapabilityReport } from "./webgpuCapability";

describe("installed fluid calibration gate", () => {
  it("installs a profile through app-owned desktop storage", async () => {
    const writes = new Map<string, string>();
    const receipt = await installFluidCalibrationProfile({
      adaptiveSource: adaptiveReport(),
      capabilitySource: capabilityReport(),
      fileName: "fluid-calibration.v1.json",
      generatedAt: "2026-06-08T00:00:00.000Z",
      storage: {
        readText: async (fileName) => writes.get(fileName) ?? null,
        writeText: async (fileName, value) => {
          writes.set(fileName, value);
        },
      },
      storageBasePath: "/tmp/Ocean Impact Lab/harborline-game",
    });

    expect(receipt.installedProfile).toMatchObject({
      pass: true,
      schema: "ocean-fluid-calibration-profile-v1",
      selectedTier: "ultra",
      sourceGate: "G-FG-23",
    });
    expect(receipt.fileName).toBe("fluid-calibration.v1.json");
    expect(receipt.persistedRawBytes).toBeGreaterThan(100);
    expect(receipt.verificationReadMatched).toBe(true);
  });

  it("passes when an installed profile is reused across packaged app relaunch", async () => {
    const adaptive = adaptiveReport();
    const install = await receiptFor(adaptive);
    const report = createFluidInstalledCalibrationReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      generatedAt: "2026-06-08T00:00:00.000Z",
      install,
      launchMode: "packaged-app",
      relaunchProbe: runtimeProbe(),
      runtimeProbe: runtimeProbe(),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-25");
    expect(report.storage.reusedByMainProcess).toBe(true);
  });

  it("rejects env-provided tier evidence because FG-25 must prove installed storage reuse", async () => {
    const adaptive = adaptiveReport();
    const report = createFluidInstalledCalibrationReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: true,
      envRequestedTierPresent: true,
      install: await receiptFor(adaptive),
      launchMode: "packaged-app",
      relaunchProbe: runtimeProbe(),
      runtimeProbe: runtimeProbe(),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent");
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_FLUID_TIER must be absent");
  });

  it("rejects fallback-high launches and missing install round-trip evidence", async () => {
    const adaptive = adaptiveReport();
    const install = await receiptFor(adaptive);
    const report = createFluidInstalledCalibrationReport({
      adaptiveSource: adaptive,
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      install: { ...install, verificationReadMatched: false },
      launchMode: "packaged-app",
      relaunchProbe: fallbackHighProbe(),
      runtimeProbe: runtimeProbe(),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("did not round-trip");
    expect(report.failures.join(" ")).toContain("relaunch selection mode");
    expect(report.failures.join(" ")).toContain("relaunch selected tier");
  });
});

async function receiptFor(adaptive: FluidAdaptiveTierReport) {
  let saved = "";
  return installFluidCalibrationProfile({
    adaptiveSource: adaptive,
    capabilitySource: capabilityReport(),
    fileName: "fluid-calibration.v1.json",
    generatedAt: "2026-06-08T00:00:00.000Z",
    storage: {
      readText: async () => saved,
      writeText: async (_fileName, value) => {
        saved = value;
      },
    },
    storageBasePath: "/tmp/Ocean Impact Lab/harborline-game",
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

function fallbackHighProbe(): FluidAdaptiveTierRuntimeProbe {
  return {
    ...runtimeProbe(),
    grid: "512x288",
    selectedGrid: { cellsX: 512, cellsY: 288 },
    selectedTier: "high",
    selection: {
      mode: "auto-fallback-high",
      preferredTier: "high",
      reason: "auto requested without valid calibration",
      requestedTier: "auto",
    },
    tier: "high",
  };
}
