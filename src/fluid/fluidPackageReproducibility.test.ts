import { describe, expect, it } from "vitest";
import { createFluidPackageReproducibilityReport } from "./fluidPackageReproducibility";
import type { FluidSustainedInteractionPacingReport } from "./fluidSustainedInteractionPacing";

describe("fluid package reproducibility gate", () => {
  it("passes when cached Electron packaging is followed by smooth sustained calibrated interaction evidence", () => {
    const compactSustained = sustainedReport();
    compactSustained.workload = {
      ...compactSustained.workload,
      representativeSamples: compactSustained.workload.samples,
      samples: undefined,
    } as never;
    const report = createFluidPackageReproducibilityReport({
      appBundlePath: "release/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
      cache: cacheProof(true),
      productName: "Ocean Impact Lab",
      sustainedInteraction: compactSustained,
      version: "0.1.0",
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-30");
    expect(report.package.cache.cacheHit).toBe(true);
    expect(report.sustainedInteraction.summary.stability).toBe("smooth");
  });

  it("rejects packaging evidence that misses the local Electron cache or loses ultra smoothness", () => {
    const report = createFluidPackageReproducibilityReport({
      appBundlePath: "release/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
      cache: cacheProof(false),
      productName: "Ocean Impact Lab",
      sustainedInteraction: {
        ...sustainedReport(),
        runtime: { ...sustainedReport().runtime, selectedTier: "high" },
        summary: { ...sustainedReport().summary, maxDroppedDebtS: 0.2, stability: "choppy" },
      },
      version: "0.1.0",
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("local cached Electron zip");
    expect(report.failures.join(" ")).toContain("selected tier was high");
    expect(report.failures.join(" ")).toContain("stability was choppy");
    expect(report.failures.join(" ")).toContain("dropped debt");
  });
});

function cacheProof(cacheHit: boolean) {
  return {
    arch: "arm64",
    cacheDirectory: cacheHit ? "/Users/sasha/Library/Caches/electron/hash" : null,
    cacheHit,
    electronVersion: "42.3.3",
    platform: "darwin" as const,
    zipFileName: "electron-v42.3.3-darwin-arm64.zip",
    zipPath: cacheHit ? "/Users/sasha/Library/Caches/electron/hash/electron-v42.3.3-darwin-arm64.zip" : null,
  };
}

function sustainedReport(): FluidSustainedInteractionPacingReport {
  return {
    adaptiveSource: {
      gate: "G-FG-23",
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
    },
    failures: [],
    gate: "G-FG-29",
    generatedAt: "2026-06-08T00:00:00.000Z",
    install: {
      fileName: "fluid-calibration.v1.json",
      installedAt: "2026-06-08T00:00:00.000Z",
      installedProfile: {
        appVersion: "0.1.0",
        capability: {
          adapterInfo: "apple / metal-3",
          backend: "webgpu-compute",
          features: ["timestamp-query"],
          fingerprint:
            "adapter:apple / metal-3|backend:webgpu-compute|features:timestamp-query|limits:maxBufferSize:268435456,maxComputeInvocationsPerWorkgroup:256,maxComputeWorkgroupSizeX:256,maxComputeWorkgroupSizeY:256,maxComputeWorkgroupsPerDimension:65535,maxStorageBufferBindingSize:134217728|status:webgpu-ready",
          limits: {
            maxBufferSize: 268_435_456,
            maxComputeInvocationsPerWorkgroup: 256,
            maxComputeWorkgroupSizeX: 256,
            maxComputeWorkgroupSizeY: 256,
            maxComputeWorkgroupsPerDimension: 65_535,
            maxStorageBufferBindingSize: 134_217_728,
          },
          sourceGate: "G-FG-01",
          status: "webgpu-ready",
        },
        generatedAt: "2026-06-08T00:00:00.000Z",
        pass: true,
        schema: "ocean-fluid-calibration-profile-v1",
        selectedTier: "ultra",
        source: {
          adaptiveGeneratedAt: "2026-06-08T00:00:00.000Z",
          adaptiveGate: "G-FG-23",
          selectedTier: "ultra",
        },
        sourceGate: "G-FG-23",
        summary: {
          maxLiveP95FrameMs: 9.3,
          maxUltraGpuP95StepMs: 0.09025,
          maxUltraToHighGpuP95Ratio: 2.0688,
        },
      },
      persistedRawBytes: 2000,
      storageBasePath: "/tmp/Ocean Impact Lab/harborline-game",
      verificationReadMatched: true,
    },
    launchMode: "packaged-app",
    pass: true,
    runtime: {
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      selectedGrid: { cellsX: 768, cellsY: 432 },
      selectedTier: "ultra",
      selection: {
        calibratedTier: "ultra",
        mode: "calibrated-auto",
        preferredTier: "ultra",
        reason: "local calibration selected tier",
        requestedTier: "auto",
      },
    },
    storage: {
      fileName: "fluid-calibration.v1.json",
      installedTier: "ultra",
      reusedByMainProcess: true,
      verificationReadMatched: true,
    },
    summary: {
      actionCount: 4,
      durationMs: 12_800,
      maxDroppedDebtS: 0,
      p95FrameMs: 9.3,
      p99FrameMs: 9.4,
      sampleCount: 1536,
      stability: "smooth",
      waterFrameDelta: 1560,
      worstDroppedFrameRatio: 0,
      worstDuplicateWaterFrameRatio: 0.001,
    },
    thresholds: {
      maxDroppedDebtS: 1e-9,
      maxDroppedFrameRatio: 0.08,
      maxDuplicateWaterFrameRatio: 0.16,
      maxLongTaskDurationMs: 160,
      maxP95FrameMs: 24,
      maxP99FrameMs: 36,
      maxSimTimeRatio: 1.25,
      minActiveSimTimeRatio: 0.72,
      minAverageFps: 55,
      minSamples: 600,
      minWaterFrameDelta: 240,
      targetFrameMs: 1000 / 60,
    },
    workload: {
      actions: [],
      durationMs: 12_800,
      expectedActivePhysics: true,
      framePacing: {
        averageFps: 120,
        averageFrameMs: 8.33,
        displayRefreshEstimateHz: 120,
        droppedFrameCount: 0,
        droppedFrameRatio: 0,
        duplicateWaterFrameCount: 1,
        duplicateWaterFrameRatio: 0.001,
        durationMs: 12_800,
        longTaskCount: 0,
        longTaskDurationMs: 0,
        maxDroppedDebtS: 0,
        maxFrameMs: 16.7,
        maxSubstepsObserved: 12,
        minFrameMs: 7.2,
        p50FrameMs: 8.3,
        p95FrameMs: 9.3,
        p99FrameMs: 9.4,
        pass: true,
        sampleCount: 1536,
        simulatedTimeRatio: 1,
        stability: "smooth",
        thresholds: {
          maxDroppedDebtS: 1e-9,
          maxDroppedFrameRatio: 0.08,
          maxDuplicateWaterFrameRatio: 0.16,
          maxLongTaskDurationMs: 160,
          maxP95FrameMs: 24,
          maxP99FrameMs: 36,
          maxSimTimeRatio: 1.25,
          minActiveSimTimeRatio: 0.72,
          minAverageFps: 55,
          minSamples: 600,
          minWaterFrameDelta: 240,
          targetFrameMs: 1000 / 60,
        },
        waterFrameDelta: 1560,
      },
      id: "sustained-calibrated-mixed-drops",
      label: "Sustained calibrated mixed object drops",
      samples: [{ capabilityGrid: "768x432" } as never],
      telemetry: {
        couplingActiveSeen: true,
        finalPhase: "ready",
        firedActionCount: 4,
        longTaskSupported: true,
        particlesActiveSeen: true,
        pressureActiveSeen: true,
        renderMode: "webgpu",
        renderer: "webgpu-grid-primary-v1",
        timeScale: 1,
        waterContext: "webgpu",
      },
    },
  };
}
