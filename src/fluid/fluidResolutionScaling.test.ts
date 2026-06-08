import { describe, expect, it } from "vitest";
import type { FluidGridBenchmarkReport } from "./fluidGridGpu";
import type { FluidGridTierId } from "./fluidGridContract";
import type { ParticleSplashBenchmarkReport } from "./fluidParticleSplash";
import {
  createFluidResolutionScalingReport,
  resolutionScalingTiers,
  type FluidResolutionScalingTierEvidence,
} from "./fluidResolutionScaling";
import type { ShallowWaterBenchmarkReport } from "./fluidShallowWater";
import type { FluidCapabilityReport } from "./webgpuCapability";
import { gridForTier } from "./webgpuCapability";

describe("fluid resolution scaling gate", () => {
  it("passes when standard, high, and ultra tiers all scale with bounded GPU timings", () => {
    const report = createFluidResolutionScalingReport({
      capability: capability(),
      launchMode: "packaged-app",
      tiers: resolutionScalingTiers.map((tier, index) => tierEvidence(tier, 0.12 + index * 0.13)),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-20");
    expect(report.summary.tierCount).toBe(3);
    expect(report.summary.ultraToHighRatios.gridGpuP95).toBeLessThan(5);
    expect(report.tiers.map((entry) => entry.tier)).toEqual(["standard", "high", "ultra"]);
    expect(report.tiers[2].cellCount).toBeGreaterThan(report.tiers[1].cellCount);
  });

  it("rejects missing ultra evidence and non-packaged launch evidence", () => {
    const report = createFluidResolutionScalingReport({
      capability: capability(),
      launchMode: "electron-source",
      tiers: [tierEvidence("standard", 0.1), tierEvidence("high", 0.2)],
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("packaged-app");
    expect(report.failures.join(" ")).toContain("missing ultra");
  });

  it("rejects unavailable GPU timestamps and excessive ultra/high scaling ratios", () => {
    const report = createFluidResolutionScalingReport({
      capability: capability(),
      launchMode: "packaged-app",
      tiers: [
        tierEvidence("standard", 0.1),
        tierEvidence("high", 0.2),
        {
          ...tierEvidence("ultra", 2.2),
          grid: { ...gridReport("ultra", 2.2), gpuTiming: { ...gpuTiming(2.2), timestampQueryEnabled: false } },
        },
      ],
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("GPU timestamps");
    expect(report.failures.join(" ")).toContain("ultra/high gridGpuP95");
    expect(report.failures.join(" ")).toContain("ultra grid GPU p95");
  });
});

function tierEvidence(tier: FluidGridTierId, gpuP95StepMs: number): FluidResolutionScalingTierEvidence {
  return {
    grid: gridReport(tier, gpuP95StepMs),
    particles: particleReport(tier, gpuP95StepMs * 1.1),
    pressure: pressureReport(tier, gpuP95StepMs * 1.05),
    tier: tier as FluidResolutionScalingTierEvidence["tier"],
  };
}

function gridReport(tier: FluidGridTierId, gpuP95StepMs: number): FluidGridBenchmarkReport {
  const grid = gridForTier(tier);
  return {
    backend: "webgpu-compute",
    capability: capability(),
    generatedAt: "2026-06-08T00:00:00.000Z",
    gpuTiming: gpuTiming(gpuP95StepMs),
    noFullGridReadbackPerFrame: true,
    pass: true,
    plan: {
      bytesPerField: grid.cellsX * grid.cellsY * 4,
      bufferRoles: ["height", "heightScratch", "velocity", "foam", "obstacle", "depth", "impulse"],
      cellCount: grid.cellsX * grid.cellsY,
      cellSizeM: 0.05,
      cellsX: grid.cellsX,
      cellsY: grid.cellsY,
      cfl: 0.56,
      dispatchX: Math.ceil(grid.cellsX / 8),
      dispatchY: Math.ceil(grid.cellsY / 8),
      dtS: 1 / 120,
      estimatedStorageBytes: grid.estimatedBytes,
      steps: 64,
      tier,
      waveSpeedMps: 2.4,
      workgroupSizeX: 8,
      workgroupSizeY: 8,
    },
    readback: {
      maxAbsFoam: 0.1,
      maxAbsHeightM: 0.01,
      maxAbsVelocityMps: 0.1,
      meanAbsHeightM: 0.001,
      sampledAfterSteps: 64,
    },
    stepTiming: { averageStepMs: gpuP95StepMs * 1.2, totalMs: gpuP95StepMs * 64 },
    threshold: { maxAverageStepMs: 4, maxCfl: 0.7, minNonzeroHeightM: 0.0001 },
  };
}

function pressureReport(tier: FluidGridTierId, gpuP95StepMs: number): ShallowWaterBenchmarkReport {
  const grid = gridForTier(tier);
  return {
    backend: "webgpu-compute",
    capability: capability(),
    diagnostics: {
      dryCellsWithWater: 0,
      finalDryCellCount: 12,
      finalMassM3: 100,
      finalMomentumAbsM3ps: 0.5,
      initialDryCellCount: 12,
      initialMassM3: 100,
      initialMomentumAbsM3ps: 1,
      massRelativeDrift: 0,
      maxDepthM: 1,
      minDepthM: 0,
      momentumDampingRatio: 0.5,
      negativeDepthCells: 0,
      pressure: {
        active: true,
        energyRelativeDrift: 0.01,
        finalEnergyJ: 10,
        finalKineticEnergyJ: 2,
        finalPotentialEnergyJ: 8,
        initialEnergyJ: 10,
        initialKineticEnergyJ: 3,
        initialPotentialEnergyJ: 7,
        maxSurfaceSlope: 0.2,
        meanSurfaceSlope: 0.04,
        momentumGrowthRatio: 1.1,
        pressureGain: 0.06,
        pressureWorkEstimateJ: 1,
        slopeLimit: 0.34,
        slopeLimitedCells: 4,
      },
      wetCellCount: grid.cellsX * grid.cellsY - 12,
    },
    generatedAt: "2026-06-08T00:00:00.000Z",
    gpuTiming: gpuTiming(gpuP95StepMs),
    noFullGridReadbackPerFrame: true,
    pass: true,
    plan: {
      bytesPerField: grid.cellsX * grid.cellsY * 4,
      bufferRoles: ["height", "heightScratch", "momentumX", "momentumXScratch", "momentumY", "momentumYScratch", "dryMask"],
      cellAreaM2: 0.0064,
      cellCount: grid.cellsX * grid.cellsY,
      cellSizeM: 0.08,
      cellsX: grid.cellsX,
      cellsY: grid.cellsY,
      cfl: 0.5,
      damping: 0.992,
      dispatchX: Math.ceil(grid.cellsX / 8),
      dispatchY: Math.ceil(grid.cellsY / 8),
      dtS: 1 / 120,
      estimatedStorageBytes: grid.estimatedBytes,
      gravityMps2: 9.80665,
      maxDepthM: 1.15,
      maxMomentumPerDepthMps: 1.15,
      minDepthM: 0.001,
      pressureGain: 0.06,
      pressureGradient: true,
      slopeLimit: 0.34,
      solver: "bounded-pressure-gradient-v1",
      steps: 48,
      tier,
      waveSpeedMps: 3.36,
      workgroupSizeX: 8,
      workgroupSizeY: 8,
    },
    solver: "bounded-pressure-gradient-v1",
    stepTiming: { averageStepMs: gpuP95StepMs * 1.2, totalMs: gpuP95StepMs * 48 },
    threshold: {
      maxAverageStepMs: 6,
      maxCfl: 0.58,
      maxDryCellsWithWater: 0,
      maxMassRelativeDrift: 0.004,
      maxNegativeDepthCells: 0,
      maxPressureEnergyRelativeDrift: 0.08,
      maxPressureMomentumGrowthRatio: 2.1,
      maxP95GpuStepMs: 2.5,
      maxWetDryCellDelta: 0,
      minMomentumDampingRatio: 0.08,
      minPressureSlopeLimitedCells: 1,
      minPressureWorkEstimateJ: 0.05,
    },
  };
}

function particleReport(tier: FluidGridTierId, gpuP95StepMs: number): ParticleSplashBenchmarkReport {
  const grid = gridForTier(tier);
  const particleCapacity = tier === "ultra" ? 8192 : tier === "high" ? 4096 : tier === "standard" ? 2048 : 1024;
  return {
    backend: "webgpu-compute",
    capability: capability(),
    diagnostics: {
      activeFinalParticleCount: particleCapacity,
      boundedDiagnostics: true,
      displacedWaterMassKg: 120,
      entrainedAirMassKg: 3,
      finalAliveMassKg: 20,
      foamContribution: 0.4,
      gridFeedback: {
        bounds: { xEnd: 10, xStart: 1, yEnd: 10, yStart: 1 },
        energyJ: 4,
        foamInjection: 0.3,
        impulseNs: 2,
        massKg: 1,
        sampleCount: 4,
      },
      impactEnergyJ: 1000,
      impactMomentumNs: 500,
      initialMomentumAbsNs: 20,
      initialParticleMassKg: 20,
      massAccountedKg: 20,
      massFractionOfDisplaced: 0.2,
      massRelativeDrift: 0,
      maxBallisticHeightM: 2,
      maxLaunchSpeedMps: 4,
      momentumFractionOfImpact: 0.04,
      outsideLocalBoundsCount: 0,
      particleCount: particleCapacity,
      predictedCrownHeightM: 1.8,
      referenceSplashBand: { formula: "test", maxM: 3, minM: 1 },
      reenteredMassKg: 1,
      reentryEnergyJ: 2,
      reentryImpulseNs: 3,
    },
    generatedAt: "2026-06-08T00:00:00.000Z",
    gpuTiming: gpuTiming(gpuP95StepMs),
    noFullGridReadbackPerFrame: true,
    pass: true,
    plan: {
      bytesPerParticle: 64,
      bufferRoles: ["particles"],
      dispatchX: Math.ceil(particleCapacity / 64),
      dtS: 1 / 120,
      estimatedStorageBytes: particleCapacity * 64,
      gridCellsX: grid.cellsX,
      gridCellsY: grid.cellsY,
      localBoundsM: { xMax: 4.5, xMin: -4.5, yMax: 4.6, yMin: 0 },
      localGridFeedbackLimit: 4096,
      particleCapacity,
      particleStride: 16,
      steps: 144,
      tier,
      workgroupSize: 64,
    },
    scenario: {
      displacedVolumeM3: 0.2,
      froudeNumber: 2,
      gravityMps2: 9.80665,
      impactSpeedMps: 8,
      objectDiameterM: 0.7,
      objectMassKg: 100,
      surfaceTensionNpm: 0.073,
      waterDensityKgM3: 997,
      weberNumber: 1200,
    },
    solver: "localized-particle-splash-v1",
    stepTiming: { averageStepMs: gpuP95StepMs * 1.2, totalMs: gpuP95StepMs * 144 },
    threshold: {
      maxAverageStepMs: 5,
      maxMassFractionOfDisplaced: 0.35,
      maxMassRelativeDrift: 0.00001,
      maxMomentumFractionOfImpact: 0.1,
      maxOutsideLocalBoundsCount: 0,
      maxP95GpuStepMs: 2.5,
      minFeedbackSampleCount: 1,
      minReentryEnergyJ: 0.5,
    },
  };
}

function gpuTiming(p95StepMs: number) {
  return {
    averageStepMs: p95StepMs * 0.8,
    maxStepMs: p95StepMs * 1.1,
    minStepMs: p95StepMs * 0.5,
    p95StepMs,
    sampleCount: 20,
    timestampQueryEnabled: true,
  };
}

function capability(): Pick<FluidCapabilityReport, "adapterName" | "features" | "grid" | "limits" | "selectedTier" | "status"> {
  return {
    adapterName: "apple / metal-3",
    features: ["timestamp-query"],
    grid: gridForTier("high"),
    limits: {
      maxBufferSize: 268_435_456,
      maxComputeInvocationsPerWorkgroup: 256,
      maxComputeWorkgroupSizeX: 256,
      maxComputeWorkgroupSizeY: 256,
      maxComputeWorkgroupsPerDimension: 65_535,
      maxStorageBufferBindingSize: 134_217_728,
    },
    selectedTier: "high",
    status: "webgpu-ready",
  };
}
