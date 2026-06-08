import { describe, expect, it } from "vitest";
import { createFluidInstalledReferenceOutcomesReport, type FluidInstalledReferenceOutcomesOptions } from "./fluidInstalledReferenceOutcomes";
import type { FluidUltraReferenceOutcomesReport } from "./fluidUltraReferenceOutcomes";

describe("installed calibrated reference outcomes gate", () => {
  it("passes when the default-profile calibrated Desktop app preserves every reference outcome", () => {
    const report = createFluidInstalledReferenceOutcomesReport(validOptions());

    expect(report.gate).toBe("G-FG-36");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.summary.categories).toEqual(["damping", "drop", "float", "sink", "splash"]);
  });

  it("rejects a runtime that only reached the conservative high fallback", () => {
    const report = createFluidInstalledReferenceOutcomesReport({
      ...validOptions(),
      runtimeSelection: {
        ...validOptions().runtimeSelection,
        selectedTier: "high",
        selection: {
          mode: "default-high",
          requestedTier: "auto",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("runtime selection mode was default-high");
    expect(report.failures.join(" ")).toContain("runtime selected tier was high");
  });

  it("rejects explicit tier or userData environment overrides", () => {
    const report = createFluidInstalledReferenceOutcomesReport({
      ...validOptions(),
      launchEnv: {
        envCalibratedTierPresent: true,
        envRequestedTierPresent: true,
        envUserDataOverridePresent: true,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent");
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_FLUID_TIER must be absent");
    expect(report.failures.join(" ")).toContain("HARBORLINE_USER_DATA_DIR must be absent");
  });

  it("rejects a core reference packet that no longer covers every required physics category", () => {
    const report = createFluidInstalledReferenceOutcomesReport({
      ...validOptions(),
      coreReference: {
        ...coreReference(),
        summary: {
          ...coreReference().summary,
          categories: ["drop", "splash"],
          caseCount: 2,
          comparisonCount: 4,
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("core reference missing damping category");
    expect(report.failures.join(" ")).toContain("core reference case count was 2");
  });

  it("rejects a reference run without active pressure, particles, or consumed coupling", () => {
    const reference = coreReference();
    reference.cases = reference.cases.map((entry) =>
      entry.id === "live-concrete-drop-splash-pressure"
        ? {
            ...entry,
            consumedCoupling: { active: false } as FluidUltraReferenceOutcomesReport["consumedCoupling"],
            telemetry: {
              ...entry.telemetry,
              particlesActive: false,
              pressureActive: false,
            },
          }
        : entry
    );
    const report = createFluidInstalledReferenceOutcomesReport({
      ...validOptions(),
      coreReference: reference,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("core reference pressure was not active during concrete drop");
    expect(report.failures.join(" ")).toContain("core reference particles were not active during concrete drop");
    expect(report.failures.join(" ")).toContain("core reference consumed coupling was not active during concrete drop");
  });
});

function validOptions(): FluidInstalledReferenceOutcomesOptions {
  return {
    coreReference: coreReference(),
    defaultProfileEvidence: {
      gate: "G-FG-34",
      grid: "768x432",
      mode: "calibrated-auto",
      pass: true,
      selectedTier: "ultra",
      sourcePath: "reports/fluid-default-profile-calibration-latest.json",
    },
    launchEnv: {
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      envUserDataOverridePresent: false,
    },
    launcher: {
      executablePath: "/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      resolvesToInstalledBundle: true,
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    runtimeSelection: {
      capabilitySelectedTier: "ultra",
      grid: "768x432",
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
    },
  };
}

function coreReference(): FluidUltraReferenceOutcomesReport {
  return {
    capability: {
      grid: {
        cellsX: 768,
        cellsY: 432,
      },
      selectedTier: "ultra",
    },
    cases: [
      {
        category: "drop+splash",
        consumedCoupling: {
          active: true,
          gridVelocityMps: 0.02,
          horizontalForceDeltaN: 1,
          sampleTimeS: 1,
          verticalForceDeltaN: 2,
        },
        id: "live-concrete-drop-splash-pressure",
        pass: true,
        snapshot: {} as FluidUltraReferenceOutcomesReport["cases"][number]["snapshot"],
        telemetry: {
          forceBoundN: 1500,
          frames: 240,
          grid: "768x432",
          noFullGridReadbackPerFrame: true,
          particles: "localized-particle-splash-live-v1",
          particlesActive: true,
          pressure: "bounded-pressure-gradient-live-v1",
          pressureActive: true,
          renderer: "webgpu-grid-primary-v1",
          status: "rendered",
          tier: "ultra",
          verticalPressureForceN: 300,
          waterContext: "webgpu",
        },
      },
    ],
    comparisons: [],
    consumedCoupling: {
      active: true,
      gridVelocityMps: 0.02,
      horizontalForceDeltaN: 1,
      sampleTimeS: 1,
      verticalForceDeltaN: 2,
    },
    failures: [],
    finalStats: null,
    frameLoop: null,
    gate: "G-FG-22",
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
    noFullGridReadbackPerFrame: true,
    pass: true,
    preferredTier: "ultra",
    selectedGrid: {
      cellsX: 768,
      cellsY: 432,
    },
    selectedTier: "ultra",
    summary: {
      caseCount: 5,
      categories: ["damping", "drop", "float", "sink", "splash"],
      comparisonCount: 10,
      liveGrid: "768x432",
      pressureForceBoundN: 1500,
    },
    telemetry: {
      forceBoundN: 1500,
      frames: 240,
      grid: "768x432",
      noFullGridReadbackPerFrame: true,
      particles: "localized-particle-splash-live-v1",
      particlesActive: true,
      pressure: "bounded-pressure-gradient-live-v1",
      pressureActive: true,
      renderer: "webgpu-grid-primary-v1",
      status: "rendered",
      tier: "ultra",
      verticalPressureForceN: 300,
      waterContext: "webgpu",
    },
  };
}
