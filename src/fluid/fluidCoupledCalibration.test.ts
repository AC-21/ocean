import { describe, expect, it } from "vitest";
import { createFluidCoupledCalibrationReport } from "./fluidCoupledCalibration";
import { createFluidReferenceDatasetReport } from "./fluidReferenceDataset";

describe("coupled packaged-app calibration gate", () => {
  it("passes when packaged runtime, references, shallow-water, and particles agree", () => {
    const report = createFluidCoupledCalibrationReport({
      localCalibration: packagedCalibrationFixture(),
      particleSplash: particleSplashFixture(),
      referenceDataset: createFluidReferenceDatasetReport({ generatedAt: "2026-06-08T00:00:00.000Z" }),
      shallowWater: shallowWaterFixture(),
    });

    expect(report.gate).toBe("G-FG-13");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.packagedRuntime.launchMode).toBe("packaged-app");
    expect(report.referenceReplay.categories).toEqual(["damping", "drop", "float", "sink", "splash"]);
    expect(report.solverEvidence.shallowWater.massRelativeDrift).toBeLessThan(0.004);
    expect(report.solverEvidence.particleSplash.massFractionOfDisplaced).toBeLessThan(0.35);
    expect(report.comparisons.map((entry) => entry.id)).toContain("splash-crown-cpu-particle-agreement");
    expect(report.comparisons.every((entry) => entry.pass)).toBe(true);
  });

  it("fails if the runtime evidence is not from the packaged app", () => {
    const runtime = packagedCalibrationFixture();
    runtime.runtime.launchMode = "electron-source";
    const report = createFluidCoupledCalibrationReport({
      localCalibration: runtime,
      particleSplash: particleSplashFixture(),
      referenceDataset: createFluidReferenceDatasetReport({ generatedAt: "2026-06-08T00:00:00.000Z" }),
      shallowWater: shallowWaterFixture(),
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("runtime launchMode must be packaged-app, got electron-source");
  });
});

function packagedCalibrationFixture() {
  return {
    gate: "G-FG-07",
    pass: true,
    runtime: {
      executablePath: "/tmp/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      launchMode: "packaged-app",
    },
    scenarios: [
      scenario("idle-high-tier", 118),
      scenario("concrete-cube-drop", 112),
    ],
  };
}

function scenario(id: string, averageFps: number) {
  return {
    id,
    framePacing: {
      averageFps,
      pass: true,
    },
    telemetry: {
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      waterContext: "webgpu",
    },
  };
}

function shallowWaterFixture() {
  return {
    gate: "G-FG-11",
    pass: true,
    tiers: {
      high: {
        diagnostics: {
          dryCellsWithWater: 0,
          massRelativeDrift: 0.000001,
          momentumDampingRatio: 0.56,
          negativeDepthCells: 0,
        },
        gpuTiming: {
          timestampQueryEnabled: true,
        },
        noFullGridReadbackPerFrame: true,
        pass: true,
        threshold: {
          maxMassRelativeDrift: 0.004,
        },
      },
    },
  };
}

function particleSplashFixture() {
  return {
    gate: "G-FG-12",
    pass: true,
    tiers: {
      high: {
        diagnostics: {
          massFractionOfDisplaced: 0.21,
          momentumFractionOfImpact: 0.007,
          particleCount: 4096,
          predictedCrownHeightM: 1.96,
          reentryEnergyJ: 179,
          referenceSplashBand: {
            maxM: 3.52,
            minM: 0.8,
          },
        },
        gpuTiming: {
          timestampQueryEnabled: true,
        },
        noFullGridReadbackPerFrame: true,
        pass: true,
        threshold: {
          maxMassFractionOfDisplaced: 0.35,
          maxMomentumFractionOfImpact: 0.1,
          minReentryEnergyJ: 0.5,
        },
      },
    },
  };
}
