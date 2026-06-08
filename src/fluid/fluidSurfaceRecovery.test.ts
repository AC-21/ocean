import { describe, expect, it } from "vitest";
import { createFluidSurfaceRecoveryReport, type SurfaceRecoverySample } from "./fluidSurfaceRecovery";

describe("fluid surface recovery gate", () => {
  it("passes when live WebGPU surface agitation decays after impact", () => {
    const report = createFluidSurfaceRecoveryReport({
      generatedAt: "2026-06-08T00:00:00.000Z",
      launchMode: "packaged-app",
      samples: recoverySamples(),
      scenario: {
        dropHeightM: 8,
        objectPresetId: "concrete-cube",
        waterDepthM: 22,
      },
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-32");
    expect(report.summary.visualRecovery).toBe("recovered");
    expect(report.summary.lumaStdDevLateToInitialRatio).toBeLessThan(0.75);
    expect(report.summary.visualBucketsLateToInitialRatio).toBeLessThan(0.65);
    expect(report.summary.pressureWorkLateToInitialRatio).toBeLessThan(0.2);
    expect(report.summary.waterFrameDelta).toBeGreaterThan(240);
  });

  it("rejects a recovery window whose rendered surface stays visually turbulent", () => {
    const samples = recoverySamples();
    samples[samples.length - 1] = {
      ...samples[samples.length - 1],
      visual: {
        ...samples[samples.length - 1].visual,
        colorBuckets: 52,
        lumaStdDev: 28,
      },
    };
    const report = createFluidSurfaceRecoveryReport({
      launchMode: "packaged-app",
      samples,
      scenario: {
        dropHeightM: 8,
        objectPresetId: "concrete-cube",
        waterDepthM: 22,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("luma stddev recovery ratio");
    expect(report.failures.join(" ")).toContain("visual bucket recovery ratio");
  });

  it("rejects lost WebGPU or no-readback telemetry", () => {
    const samples = recoverySamples();
    samples[2] = {
      ...samples[2],
      telemetry: {
        ...samples[2].telemetry,
        noFullGridReadbackPerFrame: false,
        renderer: "legacy-canvas-diagnostic-v1",
        waterContext: "2d",
      },
    };
    const report = createFluidSurfaceRecoveryReport({
      launchMode: "packaged-app",
      samples,
      scenario: {
        dropHeightM: 8,
        objectPresetId: "concrete-cube",
        waterDepthM: 22,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("renderer was legacy-canvas-diagnostic-v1");
    expect(report.failures.join(" ")).toContain("lost no-full-grid-readback telemetry");
  });
});

function recoverySamples(): SurfaceRecoverySample[] {
  return [
    sample(0.12, 1.6917, 217, 30.9238, 57, 0.00213, 107.4996, 5378.7847, -1.94, -3.02),
    sample(0.6, 2.175, 264, 22.0886, 42, 0, 51.0158, 4542.9856, -3.16, -2.08),
    sample(1.2, 2.7417, 323, 19.2327, 24, 0, 8.6848, 3692.375, -4.1, -1.4),
    sample(2.4, 3.9833, 462, 19.2597, 21, 0, 8.6848, 3626.0818, -5.74, -1.33),
    sample(4.2, 5.75, 663, 19.2458, 25, 0, 8.6848, 3626.1291, -8.1, -1.33),
  ];
}

function sample(
  offsetAfterImpactS: number,
  timeS: number,
  frames: number,
  lumaStdDev: number,
  colorBuckets: number,
  brightFraction: number,
  pressureWorkEstimateJ: number,
  foamEnergyJ: number,
  objectCenterYM: number,
  objectVelocityYMps: number
): SurfaceRecoverySample {
  return {
    frameLoop: {
      accumulatedSimS: 0,
      droppedDebtS: 0,
      fixedStepS: 1 / 120,
      frameCount: frames,
      interpolationAlpha: 0,
      lastSubsteps: 1,
      maxAccumulatedS: 0.25,
      maxSubstepsObserved: 1,
      maxSubstepsPerFrame: 24,
      simulatedS: 1 / 120,
      snapshotIntervalMs: 80,
      totalSubsteps: frames,
    },
    objectDepthM: Math.abs(objectCenterYM),
    objectVelocityYMps,
    offsetAfterImpactS,
    phase: "sinking",
    telemetry: {
      couplingActive: true,
      foamEnergyJ,
      frames,
      grid: "768x432",
      noFullGridReadbackPerFrame: true,
      particleFoam: 0.043,
      particlesActive: true,
      pressureActive: true,
      pressureImpulseEnergyJ: 9914.2426,
      pressureWorkEstimateJ,
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      splashActive: true,
      splashGridEnergyJ: 7161.6,
      tier: "ultra",
      waterContext: "webgpu",
    },
    timeS,
    visual: {
      averageLuma: 72,
      brightFraction,
      colorBuckets,
      height: 1412,
      lumaStdDev,
      sampleCount: 6566,
      waterishFraction: 0.74,
      width: 1364,
    },
  };
}
