import type { FluidGridBenchmarkReport } from "./fluidGridGpu";
import type { FluidGridTierId } from "./fluidGridContract";
import type { ParticleSplashBenchmarkReport } from "./fluidParticleSplash";
import type { ShallowWaterBenchmarkReport } from "./fluidShallowWater";
import { gridForTier, selectFluidGridTier, type FluidCapabilityReport } from "./webgpuCapability";

export type FluidResolutionScalingGate = "G-FG-20";
export type FluidResolutionScalingTierId = Extract<FluidGridTierId, "standard" | "high" | "ultra">;

export type FluidResolutionScalingThresholds = {
  maxGridUltraGpuP95StepMs: number;
  maxParticleUltraGpuP95StepMs: number;
  maxPressureUltraGpuP95StepMs: number;
  maxUltraToHighGpuP95Ratio: number;
  requireGpuTimestamps: boolean;
};

export type FluidResolutionScalingTierEvidence = {
  grid: FluidGridBenchmarkReport;
  particles: ParticleSplashBenchmarkReport;
  pressure: ShallowWaterBenchmarkReport;
  tier: FluidResolutionScalingTierId;
};

export type FluidResolutionScalingTierSummary = {
  cellCount: number;
  estimatedStorageBytes: number;
  gridGpuP95StepMs: number | null;
  gridPass: boolean;
  gridWallAverageStepMs: number;
  particleCapacity: number;
  particleGpuP95StepMs: number | null;
  particlesPass: boolean;
  particlesWallAverageStepMs: number;
  pressureGpuP95StepMs: number | null;
  pressurePass: boolean;
  pressureWallAverageStepMs: number;
  tier: FluidResolutionScalingTierId;
};

export type FluidResolutionScalingReport = {
  capability: Pick<FluidCapabilityReport, "adapterName" | "features" | "grid" | "limits" | "selectedTier" | "status"> | null;
  failures: string[];
  gate: FluidResolutionScalingGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  summary: {
    maxEstimatedStorageBytes: number;
    maxGridGpuP95StepMs: number | null;
    maxParticleGpuP95StepMs: number | null;
    maxPressureGpuP95StepMs: number | null;
    tierCount: number;
    ultraToHighRatios: {
      gridGpuP95: number | null;
      particlesGpuP95: number | null;
      pressureGpuP95: number | null;
    };
  };
  thresholds: FluidResolutionScalingThresholds;
  tiers: FluidResolutionScalingTierSummary[];
};

export type FluidResolutionScalingOptions = {
  capability: FluidResolutionScalingReport["capability"];
  generatedAt?: string;
  launchMode: FluidResolutionScalingReport["launchMode"];
  thresholds?: Partial<FluidResolutionScalingThresholds>;
  tiers: FluidResolutionScalingTierEvidence[];
};

export const resolutionScalingTiers: FluidResolutionScalingTierId[] = ["standard", "high", "ultra"];

export const defaultResolutionScalingThresholds: FluidResolutionScalingThresholds = {
  maxGridUltraGpuP95StepMs: 2,
  maxParticleUltraGpuP95StepMs: 2.5,
  maxPressureUltraGpuP95StepMs: 2.5,
  maxUltraToHighGpuP95Ratio: 5,
  requireGpuTimestamps: true,
};

export function createFluidResolutionScalingReport(options: FluidResolutionScalingOptions): FluidResolutionScalingReport {
  const thresholds = { ...defaultResolutionScalingThresholds, ...options.thresholds };
  const tierMap = new Map(options.tiers.map((entry) => [entry.tier, entry]));
  const tierSummaries = resolutionScalingTiers
    .map((tier) => tierMap.get(tier))
    .filter((entry): entry is FluidResolutionScalingTierEvidence => entry !== undefined)
    .map(summaryForTier);
  const standard = tierSummaries.find((entry) => entry.tier === "standard");
  const high = tierSummaries.find((entry) => entry.tier === "high");
  const ultra = tierSummaries.find((entry) => entry.tier === "ultra");
  const ultraToHighRatios = {
    gridGpuP95: ratio(ultra?.gridGpuP95StepMs, high?.gridGpuP95StepMs),
    particlesGpuP95: ratio(ultra?.particleGpuP95StepMs, high?.particleGpuP95StepMs),
    pressureGpuP95: ratio(ultra?.pressureGpuP95StepMs, high?.pressureGpuP95StepMs),
  };
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.capability?.status === "webgpu-ready" ? [] : ["WebGPU capability must be ready for resolution scaling."]),
    ...(options.capability && selectFluidGridTier(options.capability.limits, "ultra") === "ultra"
      ? []
      : ["local GPU limits and memory budget must admit the ultra tier."]),
    ...resolutionScalingTiers.flatMap((tier) => (tierMap.has(tier) ? [] : [`missing ${tier} tier evidence.`])),
    ...(standard && high && high.cellCount > standard.cellCount ? [] : ["high tier must increase cell count above standard."]),
    ...(high && ultra && ultra.cellCount > high.cellCount ? [] : ["ultra tier must increase cell count above high."]),
    ...(standard && high && high.estimatedStorageBytes > standard.estimatedStorageBytes ? [] : ["high tier storage must exceed standard storage."]),
    ...(high && ultra && ultra.estimatedStorageBytes > high.estimatedStorageBytes ? [] : ["ultra tier storage must exceed high storage."]),
    ...options.tiers.flatMap((entry) => failuresForTier(entry, thresholds)),
    ...ratioFailures(ultraToHighRatios, thresholds),
    ...(ultra && ultra.gridGpuP95StepMs !== null && ultra.gridGpuP95StepMs > thresholds.maxGridUltraGpuP95StepMs
      ? [`ultra grid GPU p95 ${ultra.gridGpuP95StepMs} ms exceeded ${thresholds.maxGridUltraGpuP95StepMs} ms.`]
      : []),
    ...(ultra && ultra.pressureGpuP95StepMs !== null && ultra.pressureGpuP95StepMs > thresholds.maxPressureUltraGpuP95StepMs
      ? [`ultra pressure GPU p95 ${ultra.pressureGpuP95StepMs} ms exceeded ${thresholds.maxPressureUltraGpuP95StepMs} ms.`]
      : []),
    ...(ultra && ultra.particleGpuP95StepMs !== null && ultra.particleGpuP95StepMs > thresholds.maxParticleUltraGpuP95StepMs
      ? [`ultra particle GPU p95 ${ultra.particleGpuP95StepMs} ms exceeded ${thresholds.maxParticleUltraGpuP95StepMs} ms.`]
      : []),
  ];

  return {
    capability: options.capability,
    failures,
    gate: "G-FG-20",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    summary: {
      maxEstimatedStorageBytes: Math.max(0, ...tierSummaries.map((entry) => entry.estimatedStorageBytes)),
      maxGridGpuP95StepMs: maxNullable(tierSummaries.map((entry) => entry.gridGpuP95StepMs)),
      maxParticleGpuP95StepMs: maxNullable(tierSummaries.map((entry) => entry.particleGpuP95StepMs)),
      maxPressureGpuP95StepMs: maxNullable(tierSummaries.map((entry) => entry.pressureGpuP95StepMs)),
      tierCount: tierSummaries.length,
      ultraToHighRatios,
    },
    thresholds,
    tiers: tierSummaries,
  };
}

function summaryForTier(entry: FluidResolutionScalingTierEvidence): FluidResolutionScalingTierSummary {
  const grid = gridForTier(entry.tier);
  return {
    cellCount: grid.cellsX * grid.cellsY,
    estimatedStorageBytes: entry.grid.plan.estimatedStorageBytes + entry.pressure.plan.estimatedStorageBytes + entry.particles.plan.estimatedStorageBytes,
    gridGpuP95StepMs: entry.grid.gpuTiming.p95StepMs,
    gridPass: entry.grid.pass,
    gridWallAverageStepMs: entry.grid.stepTiming.averageStepMs,
    particleCapacity: entry.particles.plan.particleCapacity,
    particleGpuP95StepMs: entry.particles.gpuTiming.p95StepMs,
    particlesPass: entry.particles.pass,
    particlesWallAverageStepMs: entry.particles.stepTiming.averageStepMs,
    pressureGpuP95StepMs: entry.pressure.gpuTiming.p95StepMs,
    pressurePass: entry.pressure.pass,
    pressureWallAverageStepMs: entry.pressure.stepTiming.averageStepMs,
    tier: entry.tier,
  };
}

function failuresForTier(entry: FluidResolutionScalingTierEvidence, thresholds: FluidResolutionScalingThresholds): string[] {
  return [
    ...(entry.grid.pass ? [] : [`${entry.tier} grid benchmark failed.`]),
    ...(entry.pressure.pass ? [] : [`${entry.tier} pressure benchmark failed.`]),
    ...(entry.particles.pass ? [] : [`${entry.tier} particle benchmark failed.`]),
    ...(entry.grid.noFullGridReadbackPerFrame && entry.pressure.noFullGridReadbackPerFrame && entry.particles.noFullGridReadbackPerFrame
      ? []
      : [`${entry.tier} used a full-grid readback path.`]),
    ...(thresholds.requireGpuTimestamps && !entry.grid.gpuTiming.timestampQueryEnabled ? [`${entry.tier} grid benchmark did not use GPU timestamps.`] : []),
    ...(thresholds.requireGpuTimestamps && !entry.pressure.gpuTiming.timestampQueryEnabled ? [`${entry.tier} pressure benchmark did not use GPU timestamps.`] : []),
    ...(thresholds.requireGpuTimestamps && !entry.particles.gpuTiming.timestampQueryEnabled ? [`${entry.tier} particle benchmark did not use GPU timestamps.`] : []),
    ...(entry.pressure.solver === "bounded-pressure-gradient-v1" ? [] : [`${entry.tier} pressure benchmark did not use the pressure-gradient solver.`]),
    ...(entry.particles.solver === "localized-particle-splash-v1" ? [] : [`${entry.tier} particle benchmark did not use the localized particle solver.`]),
  ];
}

function ratioFailures(
  ratios: FluidResolutionScalingReport["summary"]["ultraToHighRatios"],
  thresholds: FluidResolutionScalingThresholds
): string[] {
  return Object.entries(ratios).flatMap(([name, value]) =>
    value !== null && value <= thresholds.maxUltraToHighGpuP95Ratio ? [] : [`ultra/high ${name} ratio was ${value ?? "unavailable"}.`]
  );
}

function ratio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (typeof numerator !== "number" || typeof denominator !== "number" || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

function maxNullable(values: Array<number | null>): number | null {
  const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finiteValues.length > 0 ? Math.max(...finiteValues) : null;
}
