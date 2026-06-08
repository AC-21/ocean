import type { FluidFrameLoopStats } from "./fluidFrameLoop";

export type FluidSurfaceRecoveryGate = "G-FG-32";

export type SurfaceRecoveryVisualMetrics = {
  averageLuma: number;
  brightFraction: number;
  colorBuckets: number;
  height: number;
  lumaStdDev: number;
  sampleCount: number;
  waterishFraction: number;
  width: number;
};

export type SurfaceRecoveryTelemetry = {
  couplingActive: boolean;
  foamEnergyJ: number;
  frames: number;
  grid: string | null;
  noFullGridReadbackPerFrame: boolean;
  particleFoam: number;
  particlesActive: boolean;
  pressureActive: boolean;
  pressureImpulseEnergyJ: number;
  pressureWorkEstimateJ: number;
  renderMode: string | null;
  renderer: string | null;
  splashActive: boolean;
  splashGridEnergyJ: number;
  tier: string | null;
  waterContext: string | null;
};

export type SurfaceRecoverySample = {
  frameLoop: FluidFrameLoopStats | null;
  objectDepthM: number;
  objectVelocityYMps: number;
  offsetAfterImpactS: number;
  phase: string;
  telemetry: SurfaceRecoveryTelemetry;
  timeS: number;
  visual: SurfaceRecoveryVisualMetrics;
};

export type SurfaceRecoveryThresholds = {
  maxBrightFractionLate: number;
  maxDroppedDebtS: number;
  maxFoamEnergyLateToInitialRatio: number;
  maxLumaStdDevLateToInitialRatio: number;
  maxPressureWorkLateToInitialRatio: number;
  maxVisualBucketsLateToInitialRatio: number;
  minInitialColorBuckets: number;
  minInitialLumaStdDev: number;
  minOffsetSpanS: number;
  minSampleCount: number;
  minWaterFrameDelta: number;
};

export type FluidSurfaceRecoveryReport = {
  failures: string[];
  gate: FluidSurfaceRecoveryGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  samples: SurfaceRecoverySample[];
  scenario: {
    dropHeightM: number;
    objectPresetId: string;
    waterDepthM: number;
  };
  summary: {
    foamEnergyLateToInitialRatio: number;
    initialColorBuckets: number;
    initialLumaStdDev: number;
    lateBrightFraction: number;
    lateColorBuckets: number;
    lateLumaStdDev: number;
    lumaStdDevLateToInitialRatio: number;
    offsetSpanS: number;
    pressureWorkLateToInitialRatio: number;
    visualBucketsLateToInitialRatio: number;
    visualRecovery: "recovered" | "not-recovered";
    waterFrameDelta: number;
  };
  thresholds: SurfaceRecoveryThresholds;
};

export type FluidSurfaceRecoveryOptions = {
  generatedAt?: string;
  launchMode: FluidSurfaceRecoveryReport["launchMode"];
  samples: SurfaceRecoverySample[];
  scenario: FluidSurfaceRecoveryReport["scenario"];
  thresholds?: Partial<SurfaceRecoveryThresholds>;
};

export const defaultSurfaceRecoveryThresholds: SurfaceRecoveryThresholds = {
  maxBrightFractionLate: 0.001,
  maxDroppedDebtS: 1e-9,
  maxFoamEnergyLateToInitialRatio: 0.85,
  maxLumaStdDevLateToInitialRatio: 0.75,
  maxPressureWorkLateToInitialRatio: 0.2,
  maxVisualBucketsLateToInitialRatio: 0.65,
  minInitialColorBuckets: 40,
  minInitialLumaStdDev: 24,
  minOffsetSpanS: 4,
  minSampleCount: 5,
  minWaterFrameDelta: 240,
};

export function createFluidSurfaceRecoveryReport(options: FluidSurfaceRecoveryOptions): FluidSurfaceRecoveryReport {
  const thresholds = { ...defaultSurfaceRecoveryThresholds, ...options.thresholds };
  const samples = [...options.samples].sort((left, right) => left.offsetAfterImpactS - right.offsetAfterImpactS);
  const first = samples[0] ?? null;
  const last = samples[samples.length - 1] ?? null;
  const summary = summarizeSurfaceRecovery(samples);
  const rendererFailures = samples.flatMap((sample) => {
    const label = `sample ${sample.offsetAfterImpactS.toFixed(2)}s`;
    return [
      ...(sample.telemetry.renderer === "webgpu-grid-primary-v1" ? [] : [`${label} renderer was ${sample.telemetry.renderer ?? "missing"}`]),
      ...(sample.telemetry.waterContext === "webgpu" ? [] : [`${label} water context was ${sample.telemetry.waterContext ?? "missing"}`]),
      ...(sample.telemetry.renderMode === "webgpu" ? [] : [`${label} render mode was ${sample.telemetry.renderMode ?? "missing"}`]),
      ...(sample.telemetry.tier === "ultra" ? [] : [`${label} tier was ${sample.telemetry.tier ?? "missing"}`]),
      ...(sample.telemetry.grid === "768x432" ? [] : [`${label} grid was ${sample.telemetry.grid ?? "missing"}`]),
      ...(sample.telemetry.noFullGridReadbackPerFrame ? [] : [`${label} lost no-full-grid-readback telemetry`]),
    ];
  });
  const maxDroppedDebtS = Math.max(0, ...samples.map((sample) => sample.frameLoop?.droppedDebtS ?? 0).filter(Number.isFinite));
  const pressureSeen = samples.some((sample) => sample.telemetry.pressureActive);
  const particlesSeen = samples.some((sample) => sample.telemetry.particlesActive);
  const splashSeen = samples.some((sample) => sample.telemetry.splashActive);
  const couplingSeen = samples.some((sample) => sample.telemetry.couplingActive);
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(samples.length >= thresholds.minSampleCount ? [] : [`sample count ${samples.length} was below ${thresholds.minSampleCount}`]),
    ...(summary.offsetSpanS >= thresholds.minOffsetSpanS ? [] : [`offset span ${summary.offsetSpanS} s was below ${thresholds.minOffsetSpanS} s`]),
    ...(summary.waterFrameDelta >= thresholds.minWaterFrameDelta ? [] : [`water frame delta ${summary.waterFrameDelta} was below ${thresholds.minWaterFrameDelta}`]),
    ...(summary.initialLumaStdDev >= thresholds.minInitialLumaStdDev
      ? []
      : [`initial luma stddev ${summary.initialLumaStdDev} was below ${thresholds.minInitialLumaStdDev}`]),
    ...(summary.initialColorBuckets >= thresholds.minInitialColorBuckets
      ? []
      : [`initial color buckets ${summary.initialColorBuckets} was below ${thresholds.minInitialColorBuckets}`]),
    ...(summary.lumaStdDevLateToInitialRatio <= thresholds.maxLumaStdDevLateToInitialRatio
      ? []
      : [`luma stddev recovery ratio ${summary.lumaStdDevLateToInitialRatio} exceeded ${thresholds.maxLumaStdDevLateToInitialRatio}`]),
    ...(summary.visualBucketsLateToInitialRatio <= thresholds.maxVisualBucketsLateToInitialRatio
      ? []
      : [`visual bucket recovery ratio ${summary.visualBucketsLateToInitialRatio} exceeded ${thresholds.maxVisualBucketsLateToInitialRatio}`]),
    ...(summary.pressureWorkLateToInitialRatio <= thresholds.maxPressureWorkLateToInitialRatio
      ? []
      : [`pressure work recovery ratio ${summary.pressureWorkLateToInitialRatio} exceeded ${thresholds.maxPressureWorkLateToInitialRatio}`]),
    ...(summary.foamEnergyLateToInitialRatio <= thresholds.maxFoamEnergyLateToInitialRatio
      ? []
      : [`foam energy recovery ratio ${summary.foamEnergyLateToInitialRatio} exceeded ${thresholds.maxFoamEnergyLateToInitialRatio}`]),
    ...(summary.lateBrightFraction <= thresholds.maxBrightFractionLate
      ? []
      : [`late bright foam fraction ${summary.lateBrightFraction} exceeded ${thresholds.maxBrightFractionLate}`]),
    ...(maxDroppedDebtS <= thresholds.maxDroppedDebtS ? [] : [`frame loop dropped debt ${maxDroppedDebtS}`]),
    ...(pressureSeen ? [] : ["pressure telemetry never became active"]),
    ...(particlesSeen ? [] : ["particle telemetry never became active"]),
    ...(splashSeen ? [] : ["splash telemetry never became active"]),
    ...(couplingSeen ? [] : ["object-grid coupling telemetry never became active"]),
    ...(first && last && last.timeS > first.timeS ? [] : ["sample times did not advance"]),
    ...rendererFailures,
  ];

  return {
    failures,
    gate: "G-FG-32",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    samples,
    scenario: options.scenario,
    summary: {
      ...summary,
      visualRecovery: failures.length === 0 ? "recovered" : "not-recovered",
    },
    thresholds,
  };
}

function summarizeSurfaceRecovery(samples: SurfaceRecoverySample[]): Omit<FluidSurfaceRecoveryReport["summary"], "visualRecovery"> {
  const first = samples[0] ?? null;
  const last = samples[samples.length - 1] ?? first;
  return {
    foamEnergyLateToInitialRatio: ratio(last?.telemetry.foamEnergyJ ?? 0, first?.telemetry.foamEnergyJ ?? 0),
    initialColorBuckets: first?.visual.colorBuckets ?? 0,
    initialLumaStdDev: first?.visual.lumaStdDev ?? 0,
    lateBrightFraction: last?.visual.brightFraction ?? 0,
    lateColorBuckets: last?.visual.colorBuckets ?? 0,
    lateLumaStdDev: last?.visual.lumaStdDev ?? 0,
    lumaStdDevLateToInitialRatio: ratio(last?.visual.lumaStdDev ?? 0, first?.visual.lumaStdDev ?? 0),
    offsetSpanS: Math.max(0, (last?.offsetAfterImpactS ?? 0) - (first?.offsetAfterImpactS ?? 0)),
    pressureWorkLateToInitialRatio: ratio(last?.telemetry.pressureWorkEstimateJ ?? 0, first?.telemetry.pressureWorkEstimateJ ?? 0),
    visualBucketsLateToInitialRatio: ratio(last?.visual.colorBuckets ?? 0, first?.visual.colorBuckets ?? 0),
    waterFrameDelta: Math.max(0, (last?.telemetry.frames ?? 0) - (first?.telemetry.frames ?? 0)),
  };
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : numerator === 0 ? 0 : Number.POSITIVE_INFINITY;
}
