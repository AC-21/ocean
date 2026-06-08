import type { FluidCapabilityReport } from "./webgpuCapability";
import type { FluidGridBenchmarkReport } from "./fluidGridGpu";

export type FluidLocalCalibrationGate = "G-FG-07";

export type FramePacingSample = {
  atMs: number;
  dtMs: number;
  phase: string | null;
  renderMode: string | null;
  renderer: string | null;
  tier: string | null;
  waterContext: string | null;
  waterFrame: number;
};

export type FramePacingThresholds = {
  maxDroppedFrameRatio: number;
  maxDuplicateWaterFrameRatio: number;
  maxP95FrameMs: number;
  maxP99FrameMs: number;
  minAverageFps: number;
  minSamples: number;
  targetFrameMs: number;
};

export type FramePacingSummary = {
  averageFps: number;
  averageFrameMs: number;
  droppedFrameCount: number;
  droppedFrameRatio: number;
  duplicateWaterFrameCount: number;
  duplicateWaterFrameRatio: number;
  durationMs: number;
  maxFrameMs: number;
  minFrameMs: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  pass: boolean;
  sampleCount: number;
  stability: "smooth" | "marginal" | "choppy";
  stdDevFrameMs: number;
  thresholds: FramePacingThresholds;
  waterFrameDelta: number;
};

export type FluidLocalCalibrationScenarioInput = {
  id: string;
  label: string;
  samples: FramePacingSample[];
  telemetry: {
    finalPhase: string | null;
    fluidCapability: string | null;
    renderMode: string | null;
    renderer: string | null;
    tier: string | null;
    waterContext: string | null;
  };
};

export type FluidLocalCalibrationScenario = FluidLocalCalibrationScenarioInput & {
  framePacing: FramePacingSummary;
};

export type FluidLocalCalibrationReport = {
  capability: Pick<FluidCapabilityReport, "adapterName" | "features" | "grid" | "limits" | "selectedTier" | "status"> | null;
  failures: string[];
  gate: FluidLocalCalibrationGate;
  generatedAt: string;
  gpuEvidence: {
    highTierAverageStepMs: number | null;
    highTierGpuAverageStepMs: number | null;
    highTierGpuP95StepMs: number | null;
    highTierGpuSampleCount: number;
    highTierPass: boolean;
    timestampQueryAvailable: boolean;
    timestampQueryUsed: boolean;
  };
  pass: boolean;
  runtime: {
    executablePath: string | null;
    launchMode: "electron-source" | "packaged-app";
  };
  scenarios: FluidLocalCalibrationScenario[];
  thresholds: {
    framePacing: FramePacingThresholds;
    maxHighTierGpuAverageStepMs: number;
  };
};

export type FluidLocalCalibrationOptions = {
  capability: FluidCapabilityReport | null;
  generatedAt?: string;
  gridBenchmark: FluidGridBenchmarkReport | null;
  runtime?: FluidLocalCalibrationReport["runtime"];
  scenarios: FluidLocalCalibrationScenarioInput[];
  thresholds?: Partial<FramePacingThresholds> & {
    maxHighTierGpuAverageStepMs?: number;
  };
};

export const defaultFramePacingThresholds: FramePacingThresholds = {
  maxDroppedFrameRatio: 0.06,
  maxDuplicateWaterFrameRatio: 0.12,
  maxP95FrameMs: 24,
  maxP99FrameMs: 36,
  minAverageFps: 55,
  minSamples: 120,
  targetFrameMs: 1000 / 60,
};

export function createFluidLocalCalibrationReport(options: FluidLocalCalibrationOptions): FluidLocalCalibrationReport {
  const frameThresholds = { ...defaultFramePacingThresholds, ...options.thresholds };
  const maxHighTierGpuAverageStepMs = options.thresholds?.maxHighTierGpuAverageStepMs ?? 1;
  const scenarios = options.scenarios.map((scenario) => ({
    ...scenario,
    framePacing: summarizeFramePacing(scenario.samples, frameThresholds),
  }));
  const highTierGpuAverageStepMs = options.gridBenchmark?.gpuTiming.averageStepMs ?? null;
  const highTierPass = Boolean(options.gridBenchmark?.pass) && (highTierGpuAverageStepMs === null || highTierGpuAverageStepMs <= maxHighTierGpuAverageStepMs);
  const timestampQueryAvailable = options.capability?.features.includes("timestamp-query") ?? false;
  const timestampQueryUsed = Boolean(options.gridBenchmark?.gpuTiming.timestampQueryEnabled && options.gridBenchmark.gpuTiming.sampleCount > 0);
  const failures = [
    ...(options.capability?.status === "webgpu-ready" ? [] : ["WebGPU capability is not ready in the local desktop runtime."]),
    ...(timestampQueryAvailable && !timestampQueryUsed ? ["Local adapter exposes timestamp-query, but the calibration run did not record GPU timestamp samples."] : []),
    ...(highTierPass ? [] : ["High-tier GPU grid benchmark did not meet the local calibration budget."]),
    ...scenarios.flatMap((scenario) => (scenario.framePacing.pass ? [] : [`${scenario.id} frame pacing missed the local smoothness threshold.`])),
    ...scenarios.flatMap((scenario) =>
      scenario.telemetry.renderer === "webgpu-grid-primary-v1" && scenario.telemetry.waterContext === "webgpu" && scenario.telemetry.renderMode === "webgpu"
        ? []
        : [`${scenario.id} did not run through the primary WebGPU water renderer.`]
    ),
  ];

  return {
    capability: options.capability
      ? {
          adapterName: options.capability.adapterName,
          features: options.capability.features,
          grid: options.capability.grid,
          limits: options.capability.limits,
          selectedTier: options.capability.selectedTier,
          status: options.capability.status,
        }
      : null,
    failures,
    gate: "G-FG-07",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    gpuEvidence: {
      highTierAverageStepMs: options.gridBenchmark?.stepTiming.averageStepMs ?? null,
      highTierGpuAverageStepMs,
      highTierGpuP95StepMs: options.gridBenchmark?.gpuTiming.p95StepMs ?? null,
      highTierGpuSampleCount: options.gridBenchmark?.gpuTiming.sampleCount ?? 0,
      highTierPass,
      timestampQueryAvailable,
      timestampQueryUsed,
    },
    pass: failures.length === 0,
    runtime: options.runtime ?? { executablePath: null, launchMode: "electron-source" },
    scenarios,
    thresholds: {
      framePacing: frameThresholds,
      maxHighTierGpuAverageStepMs,
    },
  };
}

export function summarizeFramePacing(samples: FramePacingSample[], thresholds: FramePacingThresholds = defaultFramePacingThresholds): FramePacingSummary {
  const intervals = samples
    .map((sample) => sample.dtMs)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  const sampleCount = intervals.length;
  const durationMs = samples.length > 0 ? Math.max(...samples.map((sample) => sample.atMs)) - Math.min(...samples.map((sample) => sample.atMs)) : 0;
  const totalMs = intervals.reduce((sum, value) => sum + value, 0);
  const averageFrameMs = sampleCount > 0 ? totalMs / sampleCount : Infinity;
  const averageFps = Number.isFinite(averageFrameMs) && averageFrameMs > 0 ? 1000 / averageFrameMs : 0;
  const droppedFrameCount = intervals.filter((value) => value > thresholds.targetFrameMs * 1.5).length;
  const duplicateWaterFrameCount = duplicateWaterFrames(samples);
  const duplicateWaterFrameRatio = sampleCount > 0 ? duplicateWaterFrameCount / sampleCount : 1;
  const droppedFrameRatio = sampleCount > 0 ? droppedFrameCount / sampleCount : 1;
  const stdDevFrameMs = stdDev(intervals, averageFrameMs);
  const waterFrameDelta = samples.length > 1 ? Math.max(0, samples[samples.length - 1].waterFrame - samples[0].waterFrame) : 0;
  const pass =
    sampleCount >= thresholds.minSamples &&
    averageFps >= thresholds.minAverageFps &&
    percentileSorted(intervals, 0.95) <= thresholds.maxP95FrameMs &&
    percentileSorted(intervals, 0.99) <= thresholds.maxP99FrameMs &&
    droppedFrameRatio <= thresholds.maxDroppedFrameRatio &&
    duplicateWaterFrameRatio <= thresholds.maxDuplicateWaterFrameRatio;

  return {
    averageFps,
    averageFrameMs,
    droppedFrameCount,
    droppedFrameRatio,
    duplicateWaterFrameCount,
    duplicateWaterFrameRatio,
    durationMs,
    maxFrameMs: intervals[sampleCount - 1] ?? 0,
    minFrameMs: intervals[0] ?? 0,
    p50FrameMs: percentileSorted(intervals, 0.5),
    p95FrameMs: percentileSorted(intervals, 0.95),
    p99FrameMs: percentileSorted(intervals, 0.99),
    pass,
    sampleCount,
    stability: pass ? "smooth" : droppedFrameRatio <= thresholds.maxDroppedFrameRatio * 2 && averageFps >= thresholds.minAverageFps * 0.88 ? "marginal" : "choppy",
    stdDevFrameMs,
    thresholds,
    waterFrameDelta,
  };
}

function duplicateWaterFrames(samples: FramePacingSample[]): number {
  let duplicates = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index].waterFrame <= samples[index - 1].waterFrame) duplicates += 1;
  }
  return duplicates;
}

function percentileSorted(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * percentile) - 1));
  return values[index];
}

function stdDev(values: number[], mean: number): number {
  if (values.length === 0 || !Number.isFinite(mean)) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
