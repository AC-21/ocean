import { describe, expect, it } from "vitest";
import { createFluidDefaultProfileCalibrationReport, type FluidDefaultProfileCalibrationOptions } from "./fluidDefaultProfileCalibration";
import type { FluidCalibrationProfile } from "./fluidPersistedCalibration";

describe("default-profile calibrated Desktop launch gate", () => {
  it("passes when the real Desktop profile selects calibrated-auto ultra", () => {
    const report = createFluidDefaultProfileCalibrationReport(validOptions());

    expect(report.gate).toBe("G-FG-34");
    expect(report.pass).toBe(true);
    expect(report.storage.readByMainProcess).toBe(true);
    expect(report.runtimeProbe.selection?.mode).toBe("calibrated-auto");
    expect(report.runtimeProbe.grid).toBe("768x432");
  });

  it("rejects a profile written outside the real default app storage", () => {
    const report = createFluidDefaultProfileCalibrationReport({
      ...validOptions(),
      install: {
        ...validOptions().install,
        defaultUserDataPath: "/private/tmp/ocean-lab-installed-calibration",
        storageBasePath: "/private/tmp/ocean-lab-installed-calibration/harborline-game",
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("default userData path");
    expect(report.failures.join(" ")).toContain("real default profile storage");
  });

  it("rejects a Desktop launch that falls back to high instead of calibrated-auto ultra", () => {
    const report = createFluidDefaultProfileCalibrationReport({
      ...validOptions(),
      runtimeProbe: {
        ...validOptions().runtimeProbe,
        capabilitySelectedTier: "high",
        grid: "512x288",
        selectedGrid: { cellsX: 512, cellsY: 288 },
        selectedTier: "high",
        selection: {
          mode: "default-high",
          preferredTier: "high",
          requestedTier: "default",
        },
      },
      storage: {
        ...validOptions().storage,
        readByMainProcess: false,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("main process did not read");
    expect(report.failures.join(" ")).toContain("runtime selection mode was default-high");
    expect(report.failures.join(" ")).toContain("runtime grid was 512 x 288");
  });

  it("rejects a calibrated launch with black or flat rendered pixels", () => {
    const report = createFluidDefaultProfileCalibrationReport({
      ...validOptions(),
      runtimeProbe: {
        ...validOptions().runtimeProbe,
        pixelProbe: {
          averageLuma: 1,
          colorBuckets: 1,
          status: "blank",
          variety: "flat",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("runtime pixel probe was blank");
    expect(report.failures.join(" ")).toContain("runtime pixel variety was flat");
  });
});

function validOptions(): FluidDefaultProfileCalibrationOptions {
  const profile = calibrationProfile();
  return {
    generatedAt: "2026-06-08T00:00:00.000Z",
    install: {
      defaultUserDataPath: "/Users/sasha/Library/Application Support/Ocean Impact Lab",
      fileName: "fluid-calibration.v1.json",
      installedProfile: profile,
      persistedRawBytes: 4096,
      preExistingProfileBytes: 0,
      storageBasePath: "/Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game",
      verificationReadMatched: true,
    },
    launcher: {
      executablePath: "/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      resolvesToInstalledBundle: true,
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    runtimeProbe: {
      capabilitySelectedTier: "ultra",
      grid: "768x432",
      launchMode: "desktop-launcher",
      pixelProbe: {
        averageLuma: 126,
        colorBuckets: 31,
        status: "nonblank",
        variety: "varied",
      },
      renderer: "webgpu-grid-primary-v1",
      selectedGrid: {
        cellsX: 768,
        cellsY: 432,
      },
      selectedTier: "ultra",
      selection: {
        calibratedTier: "ultra",
        mode: "calibrated-auto",
        preferredTier: "ultra",
        requestedTier: "auto",
      },
      waterContext: "webgpu",
      waterFrames: 24,
    },
    storage: {
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      installedTier: "ultra",
      readByMainProcess: true,
    },
  };
}

function calibrationProfile(): FluidCalibrationProfile {
  return {
    appVersion: "0.1.0",
    capability: {
      adapterInfo: "apple / metal-3",
      backend: "webgpu-compute",
      features: ["timestamp-query"],
      fingerprint:
        "adapter:apple / metal-3|backend:webgpu-compute|features:timestamp-query|limits:maxBufferSize:268435456,maxComputeInvocationsPerWorkgroup:256,maxComputeWorkgroupSizeX:256,maxComputeWorkgroupSizeY:256,maxComputeWorkgroupsPerDimension:65535,maxStorageBufferBindingSize:134217728|status:webgpu-ready",
      limits: {
        maxBufferSize: 268435456,
        maxComputeInvocationsPerWorkgroup: 256,
        maxComputeWorkgroupSizeX: 256,
        maxComputeWorkgroupSizeY: 256,
        maxComputeWorkgroupsPerDimension: 65535,
        maxStorageBufferBindingSize: 134217728,
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
      maxUltraGpuP95StepMs: 0.0903,
      maxUltraToHighGpuP95Ratio: 2.0688,
    },
  };
}
