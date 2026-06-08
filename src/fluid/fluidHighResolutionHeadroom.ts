import type { FluidGridBenchmarkReport } from "./fluidGridGpu";
import type { ParticleSplashBenchmarkReport } from "./fluidParticleSplash";
import type { ShallowWaterBenchmarkReport } from "./fluidShallowWater";
import { gridForTier, type FluidCapabilityReport } from "./webgpuCapability";

export type FluidHighResolutionHeadroomGate = "G-FG-38";

export type FluidHighResolutionCandidateId = "headroom-1024x576" | "headroom-1280x720";

export type FluidHighResolutionCandidateSpec = {
  cellsX: number;
  cellsY: number;
  id: FluidHighResolutionCandidateId;
};

export type FluidHighResolutionCandidateEvidence = {
  grid: FluidGridBenchmarkReport;
  particles: ParticleSplashBenchmarkReport;
  pressure: ShallowWaterBenchmarkReport;
  spec: FluidHighResolutionCandidateSpec;
};

export type FluidHighResolutionCandidateSummary = {
  cellCount: number;
  cellsX: number;
  cellsY: number;
  estimatedStorageBytes: number;
  gridGpuP95StepMs: number | null;
  gridPass: boolean;
  gridTimestampQueryEnabled: boolean;
  gridWallAverageStepMs: number;
  id: FluidHighResolutionCandidateId;
  noFullGridReadbackPerFrame: boolean;
  particleCapacity: number;
  particleGpuP95StepMs: number | null;
  particlesPass: boolean;
  particlesTimestampQueryEnabled: boolean;
  particlesWallAverageStepMs: number;
  pressureGpuP95StepMs: number | null;
  pressurePass: boolean;
  pressureSolver: "bounded-pressure-gradient-v1" | "conservative-shallow-water-v1";
  pressureTimestampQueryEnabled: boolean;
  pressureWallAverageStepMs: number;
  scaleVsUltra: number;
  solver: "localized-particle-splash-v1";
};

export type FluidHighResolutionHeadroomThresholds = {
  maxCandidateEstimatedStorageBytes: number;
  maxGridGpuP95StepMs: number;
  maxGridWallAverageStepMs: number;
  maxParticleGpuP95StepMs: number;
  maxParticleWallAverageStepMs: number;
  maxPressureGpuP95StepMs: number;
  maxPressureWallAverageStepMs: number;
  minCandidateCount: number;
  minLargestScaleVsUltra: number;
  requireGpuTimestamps: boolean;
};

export type FluidHighResolutionHeadroomReport = {
  candidates: FluidHighResolutionCandidateSummary[];
  capability: Pick<FluidCapabilityReport, "adapterName" | "features" | "grid" | "limits" | "selectedTier" | "status"> | null;
  failures: string[];
  gate: FluidHighResolutionHeadroomGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  productionTierUnchanged: {
    maxRuntimeTier: "ultra";
    runtimeGrid: string;
  };
  summary: {
    candidateCount: number;
    largestCellCount: number;
    largestGrid: string;
    largestScaleVsUltra: number;
    maxEstimatedStorageBytes: number;
    maxGridGpuP95StepMs: number | null;
    maxParticleGpuP95StepMs: number | null;
    maxPressureGpuP95StepMs: number | null;
  };
  thresholds: FluidHighResolutionHeadroomThresholds;
};

export type FluidHighResolutionHeadroomOptions = {
  capability: FluidHighResolutionHeadroomReport["capability"];
  candidates: FluidHighResolutionCandidateEvidence[];
  generatedAt?: string;
  launchMode: FluidHighResolutionHeadroomReport["launchMode"];
  thresholds?: Partial<FluidHighResolutionHeadroomThresholds>;
};

export const highResolutionHeadroomCandidates: FluidHighResolutionCandidateSpec[] = [
  { cellsX: 1024, cellsY: 576, id: "headroom-1024x576" },
  { cellsX: 1280, cellsY: 720, id: "headroom-1280x720" },
];

export const defaultHighResolutionHeadroomThresholds: FluidHighResolutionHeadroomThresholds = {
  maxCandidateEstimatedStorageBytes: 128 * 1024 * 1024,
  maxGridGpuP95StepMs: 4,
  maxGridWallAverageStepMs: 8,
  maxParticleGpuP95StepMs: 4,
  maxParticleWallAverageStepMs: 8,
  maxPressureGpuP95StepMs: 4,
  maxPressureWallAverageStepMs: 8,
  minCandidateCount: 2,
  minLargestScaleVsUltra: 2.5,
  requireGpuTimestamps: true,
};

const expectedCandidateIds = new Set(highResolutionHeadroomCandidates.map((candidate) => candidate.id));

export function createFluidHighResolutionHeadroomReport(
  options: FluidHighResolutionHeadroomOptions
): FluidHighResolutionHeadroomReport {
  const thresholds = { ...defaultHighResolutionHeadroomThresholds, ...options.thresholds };
  const ultraGrid = gridForTier("ultra");
  const ultraCellCount = ultraGrid.cellsX * ultraGrid.cellsY;
  const candidates = options.candidates.map((entry) => summaryForCandidate(entry, ultraCellCount));
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const largest = candidates.reduce<FluidHighResolutionCandidateSummary | null>(
    (current, candidate) => (!current || candidate.cellCount > current.cellCount ? candidate : current),
    null
  );
  const maxEstimatedStorageBytes = Math.max(0, ...candidates.map((candidate) => candidate.estimatedStorageBytes));
  const maxGridGpuP95StepMs = maxNullable(candidates.map((candidate) => candidate.gridGpuP95StepMs));
  const maxPressureGpuP95StepMs = maxNullable(candidates.map((candidate) => candidate.pressureGpuP95StepMs));
  const maxParticleGpuP95StepMs = maxNullable(candidates.map((candidate) => candidate.particleGpuP95StepMs));
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.capability?.status === "webgpu-ready" ? [] : ["WebGPU capability must be ready for high-resolution headroom."]),
    ...(options.capability?.selectedTier === "ultra" ? [] : [`runtime selected tier was ${options.capability?.selectedTier ?? "missing"}, expected ultra.`]),
    ...(options.capability?.grid.cellsX === ultraGrid.cellsX && options.capability.grid.cellsY === ultraGrid.cellsY
      ? []
      : [`runtime grid was ${options.capability?.grid.cellsX ?? 0} x ${options.capability?.grid.cellsY ?? 0}, expected ${ultraGrid.cellsX} x ${ultraGrid.cellsY}.`]),
    ...(candidates.length >= thresholds.minCandidateCount
      ? []
      : [`candidate count was ${candidates.length}, expected at least ${thresholds.minCandidateCount}.`]),
    ...Array.from(expectedCandidateIds).flatMap((id) => (candidateIds.has(id) ? [] : [`missing high-resolution candidate ${id}`])),
    ...(largest && largest.scaleVsUltra >= thresholds.minLargestScaleVsUltra
      ? []
      : [`largest high-resolution grid scale was ${largest?.scaleVsUltra ?? 0}, expected at least ${thresholds.minLargestScaleVsUltra}.`]),
    ...(maxEstimatedStorageBytes <= thresholds.maxCandidateEstimatedStorageBytes
      ? []
      : [`candidate storage ${maxEstimatedStorageBytes} exceeded ${thresholds.maxCandidateEstimatedStorageBytes}.`]),
    ...options.candidates.flatMap((entry) => failuresForCandidate(entry, thresholds, ultraCellCount)),
    ...monotonicGrowthFailures(candidates),
  ];

  return {
    candidates,
    capability: options.capability,
    failures,
    gate: "G-FG-38",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    productionTierUnchanged: {
      maxRuntimeTier: "ultra",
      runtimeGrid: `${ultraGrid.cellsX}x${ultraGrid.cellsY}`,
    },
    summary: {
      candidateCount: candidates.length,
      largestCellCount: largest?.cellCount ?? 0,
      largestGrid: largest ? `${largest.cellsX}x${largest.cellsY}` : "missing",
      largestScaleVsUltra: largest?.scaleVsUltra ?? 0,
      maxEstimatedStorageBytes,
      maxGridGpuP95StepMs,
      maxParticleGpuP95StepMs,
      maxPressureGpuP95StepMs,
    },
    thresholds,
  };
}

function summaryForCandidate(
  entry: FluidHighResolutionCandidateEvidence,
  ultraCellCount: number
): FluidHighResolutionCandidateSummary {
  const cellCount = entry.spec.cellsX * entry.spec.cellsY;
  return {
    cellCount,
    cellsX: entry.spec.cellsX,
    cellsY: entry.spec.cellsY,
    estimatedStorageBytes:
      entry.grid.plan.estimatedStorageBytes + entry.pressure.plan.estimatedStorageBytes + entry.particles.plan.estimatedStorageBytes,
    gridGpuP95StepMs: entry.grid.gpuTiming.p95StepMs,
    gridPass: entry.grid.pass,
    gridTimestampQueryEnabled: entry.grid.gpuTiming.timestampQueryEnabled,
    gridWallAverageStepMs: entry.grid.stepTiming.averageStepMs,
    id: entry.spec.id,
    noFullGridReadbackPerFrame:
      entry.grid.noFullGridReadbackPerFrame && entry.pressure.noFullGridReadbackPerFrame && entry.particles.noFullGridReadbackPerFrame,
    particleCapacity: entry.particles.plan.particleCapacity,
    particleGpuP95StepMs: entry.particles.gpuTiming.p95StepMs,
    particlesPass: entry.particles.pass,
    particlesTimestampQueryEnabled: entry.particles.gpuTiming.timestampQueryEnabled,
    particlesWallAverageStepMs: entry.particles.stepTiming.averageStepMs,
    pressureGpuP95StepMs: entry.pressure.gpuTiming.p95StepMs,
    pressurePass: entry.pressure.pass,
    pressureSolver: entry.pressure.solver,
    pressureTimestampQueryEnabled: entry.pressure.gpuTiming.timestampQueryEnabled,
    pressureWallAverageStepMs: entry.pressure.stepTiming.averageStepMs,
    scaleVsUltra: cellCount / ultraCellCount,
    solver: entry.particles.solver,
  };
}

function failuresForCandidate(
  entry: FluidHighResolutionCandidateEvidence,
  thresholds: FluidHighResolutionHeadroomThresholds,
  ultraCellCount: number
): string[] {
  const summary = summaryForCandidate(entry, ultraCellCount);
  const expectedGrid = `${entry.spec.cellsX}x${entry.spec.cellsY}`;
  const limit = entry.grid.capability?.limits.maxStorageBufferBindingSize ?? null;
  return [
    ...(entry.grid.pass ? [] : [`${entry.spec.id} grid benchmark failed.`]),
    ...(entry.pressure.pass ? [] : [`${entry.spec.id} pressure benchmark failed.`]),
    ...(entry.particles.pass ? [] : [`${entry.spec.id} particle benchmark failed.`]),
    ...(entry.grid.plan.cellsX === entry.spec.cellsX && entry.grid.plan.cellsY === entry.spec.cellsY ? [] : [`${entry.spec.id} grid plan dimensions did not match ${expectedGrid}.`]),
    ...(entry.pressure.plan.cellsX === entry.spec.cellsX && entry.pressure.plan.cellsY === entry.spec.cellsY ? [] : [`${entry.spec.id} pressure plan dimensions did not match ${expectedGrid}.`]),
    ...(entry.particles.plan.gridCellsX === entry.spec.cellsX && entry.particles.plan.gridCellsY === entry.spec.cellsY ? [] : [`${entry.spec.id} particle plan dimensions did not match ${expectedGrid}.`]),
    ...(summary.cellCount > ultraCellCount ? [] : [`${entry.spec.id} did not exceed the ultra cell count.`]),
    ...(entry.grid.noFullGridReadbackPerFrame && entry.pressure.noFullGridReadbackPerFrame && entry.particles.noFullGridReadbackPerFrame
      ? []
      : [`${entry.spec.id} used a full-grid readback path.`]),
    ...(thresholds.requireGpuTimestamps && !entry.grid.gpuTiming.timestampQueryEnabled ? [`${entry.spec.id} grid benchmark did not use GPU timestamps.`] : []),
    ...(thresholds.requireGpuTimestamps && !entry.pressure.gpuTiming.timestampQueryEnabled ? [`${entry.spec.id} pressure benchmark did not use GPU timestamps.`] : []),
    ...(thresholds.requireGpuTimestamps && !entry.particles.gpuTiming.timestampQueryEnabled ? [`${entry.spec.id} particle benchmark did not use GPU timestamps.`] : []),
    ...(entry.pressure.solver === "bounded-pressure-gradient-v1" ? [] : [`${entry.spec.id} pressure benchmark did not use the pressure-gradient solver.`]),
    ...(entry.particles.solver === "localized-particle-splash-v1" ? [] : [`${entry.spec.id} particle benchmark did not use the localized particle solver.`]),
    ...(summary.gridGpuP95StepMs !== null && summary.gridGpuP95StepMs <= thresholds.maxGridGpuP95StepMs
      ? []
      : [`${entry.spec.id} grid GPU p95 was ${summary.gridGpuP95StepMs ?? "unavailable"} ms.`]),
    ...(summary.pressureGpuP95StepMs !== null && summary.pressureGpuP95StepMs <= thresholds.maxPressureGpuP95StepMs
      ? []
      : [`${entry.spec.id} pressure GPU p95 was ${summary.pressureGpuP95StepMs ?? "unavailable"} ms.`]),
    ...(summary.particleGpuP95StepMs !== null && summary.particleGpuP95StepMs <= thresholds.maxParticleGpuP95StepMs
      ? []
      : [`${entry.spec.id} particle GPU p95 was ${summary.particleGpuP95StepMs ?? "unavailable"} ms.`]),
    ...(summary.gridWallAverageStepMs <= thresholds.maxGridWallAverageStepMs
      ? []
      : [`${entry.spec.id} grid wall average was ${summary.gridWallAverageStepMs} ms.`]),
    ...(summary.pressureWallAverageStepMs <= thresholds.maxPressureWallAverageStepMs
      ? []
      : [`${entry.spec.id} pressure wall average was ${summary.pressureWallAverageStepMs} ms.`]),
    ...(summary.particlesWallAverageStepMs <= thresholds.maxParticleWallAverageStepMs
      ? []
      : [`${entry.spec.id} particle wall average was ${summary.particlesWallAverageStepMs} ms.`]),
    ...(limit === null || entry.grid.plan.bytesPerField <= limit ? [] : [`${entry.spec.id} grid field bytes exceeded max storage binding size.`]),
    ...(limit === null || entry.pressure.plan.bytesPerField <= limit ? [] : [`${entry.spec.id} pressure field bytes exceeded max storage binding size.`]),
  ];
}

function monotonicGrowthFailures(candidates: FluidHighResolutionCandidateSummary[]): string[] {
  const sorted = [...candidates].sort((left, right) => left.cellCount - right.cellCount);
  const failures: string[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].cellCount <= sorted[index - 1].cellCount) {
      failures.push("high-resolution candidate cell counts must increase monotonically.");
    }
    if (sorted[index].estimatedStorageBytes <= sorted[index - 1].estimatedStorageBytes) {
      failures.push("high-resolution candidate storage must increase monotonically.");
    }
  }
  return failures;
}

function maxNullable(values: Array<number | null>): number | null {
  const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finiteValues.length > 0 ? Math.max(...finiteValues) : null;
}
