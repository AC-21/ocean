import { describe, expect, it } from "vitest";
import { createFluidHighResolutionCalibrationReport, type FluidHighResolutionCalibrationOptions } from "./fluidHighResolutionCalibration";

describe("persisted high-resolution runtime-grid calibration gate", () => {
  it("passes when a stored FG-40 runtime grid launches the live 1024x576 renderer without a grid env flag", () => {
    const report = createFluidHighResolutionCalibrationReport(baseOptions());

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-41");
    expect(report.summary.capabilityGrid).toBe("768x432");
    expect(report.summary.liveGrid).toBe("1024x576");
  });

  it("rejects a manual env override or runtime that stays on the default ultra grid", () => {
    const report = createFluidHighResolutionCalibrationReport({
      ...baseOptions(),
      launchEnv: {
        ...baseOptions().launchEnv,
        envExperimentalGridPresent: true,
      },
      runtimeProbe: {
        ...baseOptions().runtimeProbe,
        grid: "768x432",
        runtimeGridOverride: null,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("OCEAN_LAB_EXPERIMENTAL_FLUID_GRID must be absent");
    expect(report.failures).toContain("runtime grid override global did not report 1024 x 576");
    expect(report.failures).toContain("canvas grid was 768x432");
  });

  it("rejects stale source evidence or a profile without FG-40 runtime-grid provenance", () => {
    const report = createFluidHighResolutionCalibrationReport({
      ...baseOptions(),
      profile: {
        ...baseOptions().profile,
        runtimeGrid: undefined,
      },
      sourceEvidence: {
        ...baseOptions().sourceEvidence,
        gate: "G-FG-39",
        pass: false,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("source evidence gate was G-FG-39");
    expect(report.failures).toContain("source evidence did not pass");
    expect(report.failures).toContain("profile runtime grid did not record source gate G-FG-40");
  });
});

function baseOptions(): FluidHighResolutionCalibrationOptions {
  return {
    launchEnv: {
      envCalibratedTierPresent: false,
      envExperimentalGridPresent: false,
      envRequestedTierPresent: false,
      envUserDataOverridePresent: true,
    },
    launchMode: "packaged-app",
    profile: {
      pass: true,
      runtimeGrid: {
        capabilityGrid: "768x432",
        cellsX: 1024,
        cellsY: 576,
        liveGrid: "1024x576",
        sourceGate: "G-FG-40",
        sourceGeneratedAt: "2026-06-08T00:00:00.000Z",
      },
      schema: "ocean-fluid-calibration-profile-v1",
      selectedTier: "ultra",
      sourceGate: "G-FG-23",
    },
    runtimeProbe: {
      capabilityGrid: { cellsX: 768, cellsY: 432 },
      grid: "1024x576",
      renderer: "webgpu-grid-primary-v1",
      runtimeGridOverride: { cellsX: 1024, cellsY: 576 },
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
      waterFrames: 24,
    },
    sourceEvidence: {
      caseCount: 5,
      comparisonCount: 10,
      gate: "G-FG-40",
      liveGrid: "1024x576",
      pass: true,
    },
    storage: {
      fileName: "fluid-calibration.v1.json",
      persistedRawBytes: 1024,
      readByMainProcess: true,
      storageBasePath: "/tmp/ocean-lab/high-res-profile/harborline-game",
      verificationReadMatched: true,
    },
  };
}
