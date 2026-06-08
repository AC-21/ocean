import { describe, expect, it } from "vitest";
import {
  calibratedFluidCalibrationFromProfile,
  calibrationProfileFailures,
  validCalibrationRuntimeGrid,
} from "./fluid-calibration.cjs";

describe("Electron fluid calibration profile parsing", () => {
  it("accepts a calibrated default profile that does not yet have a high-resolution runtime grid", () => {
    const profile = calibrationProfile();

    expect(calibrationProfileFailures(profile, "0.1.0")).toEqual([]);
    expect(validCalibrationRuntimeGrid(profile.runtimeGrid)).toBeUndefined();
    expect(calibratedFluidCalibrationFromProfile(profile, "0.1.0")).toMatchObject({
      fingerprint: profile.capability.fingerprint,
      runtimeGrid: undefined,
      tier: "ultra",
    });
  });

  it("returns the persisted runtime grid only when FG-40 provenance is valid", () => {
    const runtimeGrid = {
      capabilityGrid: "768x432",
      cellsX: 1024,
      cellsY: 576,
      liveGrid: "1024x576",
      sourceGate: "G-FG-40",
      sourceGeneratedAt: "2026-06-08T00:00:00.000Z",
    };

    expect(validCalibrationRuntimeGrid(runtimeGrid)).toBe("1024x576");
    expect(validCalibrationRuntimeGrid({ ...runtimeGrid, liveGrid: "1280x720" })).toBeUndefined();
  });
});

function calibrationProfile() {
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
