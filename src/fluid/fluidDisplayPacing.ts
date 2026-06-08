export type FluidDisplayPacingGate = "G-FG-19";

export type DisplayPacingSample = {
  atMs: number;
  couplingActive: boolean;
  dtMs: number;
  droppedDebtS: number;
  longTaskCount: number;
  longTaskDurationMs: number;
  maxSubstepsObserved: number;
  phase: string | null;
  physicsTimeS: number | null;
  particlesActive: boolean;
  pressureActive: boolean;
  renderMode: string | null;
  renderer: string | null;
  tier: string | null;
  totalSubsteps: number;
  waterContext: string | null;
  waterFrame: number;
};

export type DisplayPacingThresholds = {
  maxDroppedDebtS: number;
  maxDroppedFrameRatio: number;
  maxDuplicateWaterFrameRatio: number;
  maxLongTaskDurationMs: number;
  maxP95FrameMs: number;
  maxP99FrameMs: number;
  maxSimTimeRatio: number;
  minActiveSimTimeRatio: number;
  minAverageFps: number;
  minSamples: number;
  minWaterFrameDelta: number;
  targetFrameMs: number;
};

export type DisplayPacingSummary = {
  averageFps: number;
  averageFrameMs: number;
  displayRefreshEstimateHz: number;
  droppedFrameCount: number;
  droppedFrameRatio: number;
  duplicateWaterFrameCount: number;
  duplicateWaterFrameRatio: number;
  durationMs: number;
  longTaskCount: number;
  longTaskDurationMs: number;
  maxDroppedDebtS: number;
  maxFrameMs: number;
  maxSubstepsObserved: number;
  minFrameMs: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  pass: boolean;
  sampleCount: number;
  simulatedTimeRatio: number | null;
  stability: "smooth" | "marginal" | "choppy";
  thresholds: DisplayPacingThresholds;
  waterFrameDelta: number;
};

export type FluidDisplayPacingScenarioInput = {
  expectedActivePhysics: boolean;
  id: string;
  label: string;
  samples: DisplayPacingSample[];
  telemetry: {
    couplingActiveSeen: boolean;
    finalPhase: string | null;
    longTaskSupported: boolean;
    particlesActiveSeen: boolean;
    pressureActiveSeen: boolean;
    renderMode: string | null;
    renderer: string | null;
    timeScale: number;
    waterContext: string | null;
  };
};

export type FluidDisplayPacingScenario = FluidDisplayPacingScenarioInput & {
  framePacing: DisplayPacingSummary;
};

export type FluidDisplayPacingReport = {
  failures: string[];
  gate: FluidDisplayPacingGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  scenarios: FluidDisplayPacingScenario[];
  summary: {
    maxDroppedDebtS: number;
    maxP95FrameMs: number;
    maxP99FrameMs: number;
    scenarioCount: number;
    worstDroppedFrameRatio: number;
    worstDuplicateWaterFrameRatio: number;
  };
  thresholds: DisplayPacingThresholds;
};

export type FluidDisplayPacingOptions = {
  generatedAt?: string;
  launchMode: FluidDisplayPacingReport["launchMode"];
  scenarios: FluidDisplayPacingScenarioInput[];
  thresholds?: Partial<DisplayPacingThresholds>;
};

export const defaultDisplayPacingThresholds: DisplayPacingThresholds = {
  maxDroppedDebtS: 1e-9,
  maxDroppedFrameRatio: 0.06,
  maxDuplicateWaterFrameRatio: 0.12,
  maxLongTaskDurationMs: 120,
  maxP95FrameMs: 24,
  maxP99FrameMs: 36,
  maxSimTimeRatio: 1.25,
  minActiveSimTimeRatio: 0.72,
  minAverageFps: 55,
  minSamples: 120,
  minWaterFrameDelta: 30,
  targetFrameMs: 1000 / 60,
};

export function createFluidDisplayPacingReport(options: FluidDisplayPacingOptions): FluidDisplayPacingReport {
  const thresholds = { ...defaultDisplayPacingThresholds, ...options.thresholds };
  const scenarios = options.scenarios.map((scenario) => ({
    ...scenario,
    framePacing: summarizeDisplayPacing(scenario.samples, scenario.expectedActivePhysics, thresholds),
  }));
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...scenarios.flatMap((scenario) => (scenario.framePacing.pass ? [] : [`${scenario.id} display pacing missed the smoothness threshold.`])),
    ...scenarios.flatMap((scenario) =>
      scenario.telemetry.renderer === "webgpu-grid-primary-v1" && scenario.telemetry.waterContext === "webgpu" && scenario.telemetry.renderMode === "webgpu"
        ? []
        : [`${scenario.id} did not run through the primary WebGPU renderer.`]
    ),
    ...scenarios.flatMap((scenario) => (scenario.telemetry.timeScale === 1 ? [] : [`${scenario.id} did not run at normal 1x time scale.`])),
    ...scenarios.flatMap((scenario) => (scenario.telemetry.pressureActiveSeen ? [] : [`${scenario.id} never observed active pressure telemetry.`])),
    ...scenarios
      .filter((scenario) => scenario.expectedActivePhysics)
      .flatMap((scenario) => (scenario.telemetry.couplingActiveSeen ? [] : [`${scenario.id} never observed active object-grid coupling.`])),
  ];

  return {
    failures,
    gate: "G-FG-19",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    scenarios,
    summary: {
      maxDroppedDebtS: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.maxDroppedDebtS)),
      maxP95FrameMs: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.p95FrameMs)),
      maxP99FrameMs: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.p99FrameMs)),
      scenarioCount: scenarios.length,
      worstDroppedFrameRatio: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.droppedFrameRatio)),
      worstDuplicateWaterFrameRatio: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.duplicateWaterFrameRatio)),
    },
    thresholds,
  };
}

export function summarizeDisplayPacing(
  samples: DisplayPacingSample[],
  expectedActivePhysics: boolean,
  thresholds: DisplayPacingThresholds = defaultDisplayPacingThresholds
): DisplayPacingSummary {
  const intervals = samples
    .map((sample) => sample.dtMs)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  const sampleCount = intervals.length;
  const durationMs = samples.length > 0 ? Math.max(...samples.map((sample) => sample.atMs)) - Math.min(...samples.map((sample) => sample.atMs)) : 0;
  const totalMs = intervals.reduce((sum, value) => sum + value, 0);
  const averageFrameMs = sampleCount > 0 ? totalMs / sampleCount : Infinity;
  const averageFps = Number.isFinite(averageFrameMs) && averageFrameMs > 0 ? 1000 / averageFrameMs : 0;
  const p50FrameMs = percentileSorted(intervals, 0.5);
  const p95FrameMs = percentileSorted(intervals, 0.95);
  const p99FrameMs = percentileSorted(intervals, 0.99);
  const droppedFrameCount = intervals.filter((value) => value > thresholds.targetFrameMs * 1.5).length;
  const duplicateWaterFrameCount = duplicateWaterFrames(samples);
  const droppedFrameRatio = sampleCount > 0 ? droppedFrameCount / sampleCount : 1;
  const duplicateWaterFrameRatio = sampleCount > 0 ? duplicateWaterFrameCount / sampleCount : 1;
  const waterFrameDelta = samples.length > 1 ? Math.max(0, samples[samples.length - 1].waterFrame - samples[0].waterFrame) : 0;
  const maxDroppedDebtS = Math.max(0, ...samples.map((sample) => sample.droppedDebtS).filter(Number.isFinite));
  const maxSubstepsObserved = Math.max(0, ...samples.map((sample) => sample.maxSubstepsObserved).filter(Number.isFinite));
  const longTaskCount = Math.max(0, ...samples.map((sample) => sample.longTaskCount).filter(Number.isFinite));
  const longTaskDurationMs = Math.max(0, ...samples.map((sample) => sample.longTaskDurationMs).filter(Number.isFinite));
  const simulatedTimeRatio = simulatedTimeRatioFor(samples, expectedActivePhysics ? activePhysicsDurationMsFor(samples) : durationMs);
  const activePhysicsPass =
    !expectedActivePhysics ||
    (simulatedTimeRatio !== null &&
      simulatedTimeRatio >= thresholds.minActiveSimTimeRatio &&
      simulatedTimeRatio <= thresholds.maxSimTimeRatio);
  const pass =
    sampleCount >= thresholds.minSamples &&
    averageFps >= thresholds.minAverageFps &&
    p95FrameMs <= thresholds.maxP95FrameMs &&
    p99FrameMs <= thresholds.maxP99FrameMs &&
    droppedFrameRatio <= thresholds.maxDroppedFrameRatio &&
    duplicateWaterFrameRatio <= thresholds.maxDuplicateWaterFrameRatio &&
    waterFrameDelta >= thresholds.minWaterFrameDelta &&
    maxDroppedDebtS <= thresholds.maxDroppedDebtS &&
    longTaskDurationMs <= thresholds.maxLongTaskDurationMs &&
    activePhysicsPass;

  return {
    averageFps,
    averageFrameMs,
    displayRefreshEstimateHz: p50FrameMs > 0 ? 1000 / p50FrameMs : 0,
    droppedFrameCount,
    droppedFrameRatio,
    duplicateWaterFrameCount,
    duplicateWaterFrameRatio,
    durationMs,
    longTaskCount,
    longTaskDurationMs,
    maxDroppedDebtS,
    maxFrameMs: intervals[sampleCount - 1] ?? 0,
    maxSubstepsObserved,
    minFrameMs: intervals[0] ?? 0,
    p50FrameMs,
    p95FrameMs,
    p99FrameMs,
    pass,
    sampleCount,
    simulatedTimeRatio,
    stability: pass ? "smooth" : droppedFrameRatio <= thresholds.maxDroppedFrameRatio * 2 && averageFps >= thresholds.minAverageFps * 0.88 ? "marginal" : "choppy",
    thresholds,
    waterFrameDelta,
  };
}

function duplicateWaterFrames(samples: DisplayPacingSample[]): number {
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

function simulatedTimeRatioFor(samples: DisplayPacingSample[], durationMs: number): number | null {
  const physicsTimes = samples
    .map((sample) => sample.physicsTimeS)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (physicsTimes.length < 2 || durationMs <= 0) return null;
  const deltaS = Math.max(0, Math.max(...physicsTimes) - Math.min(...physicsTimes));
  return deltaS / (durationMs / 1000);
}

function activePhysicsDurationMsFor(samples: DisplayPacingSample[]): number {
  const activeSamples = samples.filter((sample) => sample.phase !== null && sample.phase !== "ready" && sample.phase !== "sank");
  if (activeSamples.length < 2) {
    return samples.length > 0 ? Math.max(...samples.map((sample) => sample.atMs)) - Math.min(...samples.map((sample) => sample.atMs)) : 0;
  }
  return Math.max(...activeSamples.map((sample) => sample.atMs)) - Math.min(...activeSamples.map((sample) => sample.atMs));
}
