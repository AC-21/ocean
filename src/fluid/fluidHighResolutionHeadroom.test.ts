import { describe, expect, it } from "vitest";
import { createFluidGridStepPlan, type FluidGridBenchmarkReport } from "./fluidGridGpu";
import {
  createFluidHighResolutionHeadroomReport,
  highResolutionHeadroomCandidates,
  type FluidHighResolutionCandidateEvidence,
  type FluidHighResolutionHeadroomOptions,
} from "./fluidHighResolutionHeadroom";
import { createParticleSplashPlan, type ParticleSplashBenchmarkReport } from "./fluidParticleSplash";
import { createShallowWaterStepPlan, type ShallowWaterBenchmarkReport } from "./fluidShallowWater";
import type { FluidCapabilityReport } from "./webgpuCapability";

describe("high-resolution headroom gate", () => {
  it("passes benchmark-only explicit grids larger than the production ultra tier", () => {
    const report = createFluidHighResolutionHeadroomReport(validOptions());

    expect(report.gate).toBe("G-FG-38");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.productionTierUnchanged).toEqual({ maxRuntimeTier: "ultra", runtimeGrid: "768x432" });
    expect(report.summary.largestGrid).toBe("1280x720");
    expect(report.summary.largestScaleVsUltra).toBeGreaterThan(2.5);
    expect(report.candidates.every((candidate) => candidate.noFullGridReadbackPerFrame)).toBe(true);
    expect(report.candidates.every((candidate) => candidate.gridTimestampQueryEnabled && candidate.pressureTimestampQueryEnabled && candidate.particlesTimestampQueryEnabled)).toBe(true);
    expect(report.candidates.every((candidate) => candidate.pressureSolver === "bounded-pressure-gradient-v1")).toBe(true);
    expect(report.candidates.every((candidate) => candidate.solver === "localized-particle-splash-v1")).toBe(true);
  });

  it("keeps explicit dimensions out of production tier selection", () => {
    const spec = { cellsX: 1024, cellsY: 576 };

    expect(createFluidGridStepPlan({ gridDimensions: spec, tier: "ultra" }).cellsX).toBe(1024);
    expect(createShallowWaterStepPlan({ gridDimensions: spec, tier: "ultra" }).cellsY).toBe(576);
    expect(createParticleSplashPlan({ gridDimensions: spec, tier: "ultra" }).gridCellsX).toBe(1024);
  });

  it("rejects fallback runtime capability or missing candidate evidence", () => {
    const report = createFluidHighResolutionHeadroomReport({
      ...validOptions(),
      capability: {
        ...capability(),
        grid: {
          cellsX: 512,
          cellsY: 288,
          estimatedBytes: 37_748_736,
          tier: "high",
        },
        selectedTier: "high",
      },
      candidates: validOptions().candidates.slice(0, 1),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("runtime selected tier was high");
    expect(report.failures.join(" ")).toContain("missing high-resolution candidate headroom-1280x720");
  });

  it("rejects headroom probes that are not larger than ultra", () => {
    const report = createFluidHighResolutionHeadroomReport({
      ...validOptions(),
      candidates: [
        candidateEvidence({ cellsX: 512, cellsY: 288, id: "headroom-1024x576" }),
        candidateEvidence({ cellsX: 768, cellsY: 432, id: "headroom-1280x720" }),
      ],
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("did not exceed the ultra cell count");
    expect(report.failures.join(" ")).toContain("largest high-resolution grid scale");
  });

  it("rejects missing timestamps, full-grid readback, and over-budget timing", () => {
    const bad = candidateEvidence(highResolutionHeadroomCandidates[0]);
    bad.grid.gpuTiming.timestampQueryEnabled = false;
    bad.grid.gpuTiming.p95StepMs = 9;
    bad.grid.noFullGridReadbackPerFrame = false;
    const report = createFluidHighResolutionHeadroomReport({
      ...validOptions(),
      candidates: [bad, candidateEvidence(highResolutionHeadroomCandidates[1])],
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("grid benchmark did not use GPU timestamps");
    expect(report.failures.join(" ")).toContain("used a full-grid readback path");
    expect(report.failures.join(" ")).toContain("grid GPU p95 was 9");
  });
});

function validOptions(): FluidHighResolutionHeadroomOptions {
  return {
    capability: capability(),
    candidates: highResolutionHeadroomCandidates.map(candidateEvidence),
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
  };
}

function candidateEvidence(spec: FluidHighResolutionCandidateEvidence["spec"]): FluidHighResolutionCandidateEvidence {
  const gridDimensions = { cellsX: spec.cellsX, cellsY: spec.cellsY };
  const gridPlan = createFluidGridStepPlan({ gridDimensions, tier: "ultra" });
  const pressurePlan = createShallowWaterStepPlan({ gridDimensions, pressureGradient: true, tier: "ultra" });
  const particlePlan = createParticleSplashPlan({ gridDimensions, tier: "ultra" });
  return {
    grid: {
      backend: "webgpu-compute",
      capability: capability(),
      generatedAt: "2026-06-08T00:00:00.000Z",
      gpuTiming: {
        averageStepMs: 0.22,
        maxStepMs: 0.32,
        minStepMs: 0.16,
        p95StepMs: 0.3,
        sampleCount: 36,
        timestampQueryEnabled: true,
      },
      noFullGridReadbackPerFrame: true,
      pass: true,
      plan: gridPlan,
      readback: {
        maxAbsFoam: 0.1,
        maxAbsHeightM: 0.2,
        maxAbsVelocityMps: 0.1,
        meanAbsHeightM: 0.02,
        sampledAfterSteps: 36,
      },
      stepTiming: {
        averageStepMs: 0.35,
        totalMs: 12.6,
      },
      threshold: {
        maxAverageStepMs: 8,
        maxCfl: 0.7,
        minNonzeroHeightM: 0.0001,
      },
    } satisfies FluidGridBenchmarkReport,
    particles: {
      backend: "webgpu-compute",
      capability: capability(),
      diagnostics: {
        activeFinalParticleCount: 6400,
        boundedDiagnostics: true,
        displacedWaterMassKg: 2200,
        entrainedAirMassKg: 2,
        finalAliveMassKg: 3,
        foamContribution: 0.4,
        gridFeedback: {
          bounds: { xEnd: 12, xStart: 8, yEnd: 10, yStart: 6 },
          energyJ: 400,
          foamInjection: 0.2,
          impulseNs: 200,
          massKg: 12,
          sampleCount: 640,
        },
        impactEnergyJ: 8000,
        impactMomentumNs: 1000,
        initialMomentumAbsNs: 400,
        initialParticleMassKg: 12,
        massAccountedKg: 12,
        massFractionOfDisplaced: 0.01,
        massRelativeDrift: 0.01,
        maxBallisticHeightM: 1.6,
        maxLaunchSpeedMps: 6,
        momentumFractionOfImpact: 0.2,
        outsideLocalBoundsCount: 0,
        particleCount: 6400,
        predictedCrownHeightM: 1.6,
        referenceSplashBand: { formula: "test", maxM: 2.4, minM: 0.8 },
        reenteredMassKg: 1,
        reentryEnergyJ: 12,
        reentryImpulseNs: 8,
      },
      generatedAt: "2026-06-08T00:00:00.000Z",
      gpuTiming: {
        averageStepMs: 0.11,
        maxStepMs: 0.2,
        minStepMs: 0.06,
        p95StepMs: 0.18,
        sampleCount: 96,
        timestampQueryEnabled: true,
      },
      noFullGridReadbackPerFrame: true,
      pass: true,
      plan: particlePlan,
      scenario: {
        displacedVolumeM3: 1,
        froudeNumber: 2,
        gravityMps2: 9.81,
        impactSpeedMps: 8,
        objectDiameterM: 1,
        objectMassKg: 2000,
        surfaceTensionNpm: 0.072,
        waterDensityKgM3: 1025,
        weberNumber: 1000,
      },
      solver: "localized-particle-splash-v1",
      stepTiming: {
        averageStepMs: 0.22,
        totalMs: 21.12,
      },
      threshold: {
        maxAverageStepMs: 8,
        maxMassFractionOfDisplaced: 0.25,
        maxMassRelativeDrift: 0.05,
        maxMomentumFractionOfImpact: 0.4,
        maxOutsideLocalBoundsCount: 0,
        maxP95GpuStepMs: 4,
        minFeedbackSampleCount: 96,
        minReentryEnergyJ: 1,
      },
    } satisfies ParticleSplashBenchmarkReport,
    pressure: {
      backend: "webgpu-compute",
      capability: capability(),
      diagnostics: {
        dryCellsWithWater: 0,
        finalDryCellCount: 40,
        finalMassM3: 100,
        finalMomentumAbsM3ps: 10,
        initialDryCellCount: 40,
        initialMassM3: 100,
        initialMomentumAbsM3ps: 12,
        massRelativeDrift: 0.001,
        maxDepthM: 2,
        minDepthM: 0,
        momentumDampingRatio: 0.8,
        negativeDepthCells: 0,
        pressure: {
          active: true,
          energyRelativeDrift: 0.01,
          finalEnergyJ: 1000,
          finalKineticEnergyJ: 200,
          finalPotentialEnergyJ: 800,
          initialEnergyJ: 990,
          initialKineticEnergyJ: 220,
          initialPotentialEnergyJ: 770,
          maxSurfaceSlope: 0.2,
          meanSurfaceSlope: 0.05,
          momentumGrowthRatio: 0.2,
          pressureGain: 0.06,
          pressureWorkEstimateJ: 80,
          slopeLimit: 0.34,
          slopeLimitedCells: 100,
        },
        wetCellCount: 2000,
      },
      generatedAt: "2026-06-08T00:00:00.000Z",
      gpuTiming: {
        averageStepMs: 0.24,
        maxStepMs: 0.36,
        minStepMs: 0.17,
        p95StepMs: 0.34,
        sampleCount: 28,
        timestampQueryEnabled: true,
      },
      noFullGridReadbackPerFrame: true,
      pass: true,
      plan: pressurePlan,
      solver: "bounded-pressure-gradient-v1",
      stepTiming: {
        averageStepMs: 0.4,
        totalMs: 11.2,
      },
      threshold: {
        maxAverageStepMs: 8,
        maxCfl: 0.7,
        maxDryCellsWithWater: 0,
        maxMassRelativeDrift: 0.02,
        maxNegativeDepthCells: 0,
        maxPressureEnergyRelativeDrift: 0.1,
        maxPressureMomentumGrowthRatio: 0.8,
        maxP95GpuStepMs: 4,
        maxWetDryCellDelta: 0,
        minMomentumDampingRatio: 0.1,
        minPressureSlopeLimitedCells: 1,
        minPressureWorkEstimateJ: 1,
      },
    } satisfies ShallowWaterBenchmarkReport,
    spec,
  };
}

function capability(): Pick<FluidCapabilityReport, "adapterName" | "features" | "grid" | "limits" | "selectedTier" | "status"> {
  return {
    adapterName: "apple / metal-3",
    features: ["timestamp-query"],
    grid: {
      cellsX: 768,
      cellsY: 432,
      estimatedBytes: 10_616_832,
      tier: "ultra",
    },
    limits: {
      maxBufferSize: 1_073_741_824,
      maxComputeInvocationsPerWorkgroup: 256,
      maxComputeWorkgroupSizeX: 256,
      maxComputeWorkgroupSizeY: 256,
      maxComputeWorkgroupsPerDimension: 65535,
      maxStorageBufferBindingSize: 134_217_728,
    },
    selectedTier: "ultra",
    status: "webgpu-ready",
  };
}
