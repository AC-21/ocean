import type { FluidHighResolutionCalibrationFrontierReport } from "./fluidHighResolutionCalibrationFrontier";
import type { FluidInstalledHighResolutionTargetResidualsReport } from "./fluidInstalledHighResolutionTargetResiduals";

export type FluidHighResolutionFoamSettlingCalibrationGate = "G-FG-51";

export type FoamSettlingSnapshotSample = {
  angularSpeedRadps: number;
  buoyancyErrorRatio: number;
  draftErrorM: number | null;
  liveGrid: string | null;
  phase: string;
  pressureActive: boolean;
  pressureNoFullGridReadback: boolean;
  renderer: string | null;
  sampleKind: "first-within-tolerance" | "settled-window";
  settledAtS: number | null;
  settledWindowS: number | null;
  timeS: number;
  verticalSpeedMps: number;
  waterContext: string | null;
  waterFrames: number;
  withinTolerance: boolean;
};

export type FoamSettlingLiveRun = {
  consoleErrors: string[];
  firstWithinTolerance: FoamSettlingSnapshotSample;
  launchMode: "electron-source" | "packaged-app";
  pageErrors: string[];
  runtime: {
    capabilityGrid: string;
    liveGrid: string | null;
    preferredTier: string;
    renderer: string | null;
    runtimeGridOverride: string | null;
    selectedTier: string;
    waterContext: string | null;
    waterFrames: number;
  };
  settledWindow: FoamSettlingSnapshotSample;
};

export type FluidHighResolutionFoamSettlingCalibrationReport = {
  failures: string[];
  gate: FluidHighResolutionFoamSettlingCalibrationGate;
  generatedAt: string;
  improvement: {
    buoyancyImprovementRatioFromFirst: number;
    buoyancyImprovementRatioFromSourceResidual: number;
    firstBuoyancyErrorRatio: number;
    settledBuoyancyErrorRatio: number;
    settledTargetErrorRatio: number;
    sourceFoamBuoyancyErrorRatio: number;
    sourceFoamTargetErrorRatio: number;
  };
  live: FoamSettlingLiveRun;
  pass: boolean;
  sourceFrontier: {
    actionKind: string | null;
    gate: string;
    pass: boolean;
    sourceGate: string;
    sourceVisualGate: string;
    sourceVisualLiveGrid: string | null;
  };
  sourceTargetResiduals: {
    acceptedBandsPreserved: boolean;
    comparisonCount: number;
    gate: string;
    pass: boolean;
    sourceVisualGate: string;
    sourceVisualLiveGrid: string | null;
  };
  thresholds: FoamSettlingCalibrationThresholds;
};

export type FoamSettlingCalibrationThresholds = {
  maxSettledAngularSpeedRadps: number;
  maxSettledBuoyancyErrorRatio: number;
  maxSettledDraftErrorM: number;
  maxSettledTargetErrorRatio: number;
  maxSettledVerticalSpeedMps: number;
  minBuoyancyImprovementRatio: number;
  minSettledWindowS: number;
  minSourceResidualImprovementRatio: number;
};

export type FluidHighResolutionFoamSettlingCalibrationOptions = {
  generatedAt?: string;
  live: FoamSettlingLiveRun;
  sourceFrontier: FluidHighResolutionCalibrationFrontierReport;
  sourceTargetResiduals: FluidInstalledHighResolutionTargetResidualsReport;
  thresholds?: Partial<FoamSettlingCalibrationThresholds>;
};

export const highResolutionFoamSettlingCalibrationThresholds: FoamSettlingCalibrationThresholds = {
  maxSettledAngularSpeedRadps: 0.05,
  maxSettledBuoyancyErrorRatio: 0.045,
  maxSettledDraftErrorM: 0.04,
  maxSettledTargetErrorRatio: 0.6,
  maxSettledVerticalSpeedMps: 0.05,
  minBuoyancyImprovementRatio: 0,
  minSettledWindowS: 2.4,
  minSourceResidualImprovementRatio: 0.18,
};

const foamComparisonId = "live-foam-settled-buoyancy-error";

export function createFluidHighResolutionFoamSettlingCalibrationReport(
  options: FluidHighResolutionFoamSettlingCalibrationOptions
): FluidHighResolutionFoamSettlingCalibrationReport {
  const thresholds = { ...highResolutionFoamSettlingCalibrationThresholds, ...options.thresholds };
  const frontierEntry = options.sourceFrontier.frontier.find((entry) => entry.comparisonId === foamComparisonId) ?? null;
  const sourceFoamResidual = options.sourceTargetResiduals.comparisons.find((entry) => entry.id === foamComparisonId) ?? null;
  const settled = options.live.settledWindow;
  const first = options.live.firstWithinTolerance;
  const sourceFoamBuoyancyErrorRatio = sourceFoamResidual?.actual ?? Number.POSITIVE_INFINITY;
  const sourceFoamTargetErrorRatio = sourceFoamResidual?.targetErrorRatio ?? Number.POSITIVE_INFINITY;
  const settledTargetErrorRatio = settled.buoyancyErrorRatio / 0.08;
  const buoyancyImprovementRatioFromFirst = improvementRatio(first.buoyancyErrorRatio, settled.buoyancyErrorRatio);
  const buoyancyImprovementRatioFromSourceResidual = improvementRatio(sourceFoamBuoyancyErrorRatio, settled.buoyancyErrorRatio);
  const acceptedBandsPreserved = options.sourceTargetResiduals.comparisons.every((comparison) => comparison.pass);

  const sourceFrontier = {
    actionKind: frontierEntry?.actionKind ?? null,
    gate: options.sourceFrontier.gate,
    pass: options.sourceFrontier.pass,
    sourceGate: options.sourceFrontier.noRegressionGuard.sourceGate,
    sourceVisualGate: options.sourceFrontier.noRegressionGuard.sourceVisualGate,
    sourceVisualLiveGrid: options.sourceFrontier.noRegressionGuard.sourceVisualLiveGrid,
  };
  const sourceTargetResiduals = {
    acceptedBandsPreserved,
    comparisonCount: options.sourceTargetResiduals.summary.comparisonCount,
    gate: options.sourceTargetResiduals.gate,
    pass: options.sourceTargetResiduals.pass,
    sourceVisualGate: options.sourceTargetResiduals.sourceVisualWatchdog.gate,
    sourceVisualLiveGrid: options.sourceTargetResiduals.sourceVisualWatchdog.liveGrid,
  };

  const failures = [
    ...(options.sourceFrontier.gate === "G-FG-50" ? [] : [`source frontier gate was ${options.sourceFrontier.gate}`]),
    ...(options.sourceFrontier.pass ? [] : options.sourceFrontier.failures.map((failure) => `source frontier ${failure}`)),
    ...(sourceFrontier.sourceGate === "G-FG-48" ? [] : [`source frontier target gate was ${sourceFrontier.sourceGate}`]),
    ...(sourceFrontier.sourceVisualGate === "G-FG-47" ? [] : [`source frontier visual gate was ${sourceFrontier.sourceVisualGate}`]),
    ...(sourceFrontier.sourceVisualLiveGrid === "1024x576"
      ? []
      : [`source frontier visual live grid was ${sourceFrontier.sourceVisualLiveGrid ?? "missing"}`]),
    ...(frontierEntry?.actionKind === "physics-tuning-candidate"
      ? []
      : ["FG-50 did not classify foam settled buoyancy as a physics-tuning-candidate"]),
    ...(options.sourceTargetResiduals.gate === "G-FG-48" ? [] : [`source target residual gate was ${options.sourceTargetResiduals.gate}`]),
    ...(options.sourceTargetResiduals.pass
      ? []
      : options.sourceTargetResiduals.failures.map((failure) => `source target residual ${failure}`)),
    ...(sourceTargetResiduals.sourceVisualGate === "G-FG-47"
      ? []
      : [`source target residual visual gate was ${sourceTargetResiduals.sourceVisualGate}`]),
    ...(sourceTargetResiduals.sourceVisualLiveGrid === "1024x576"
      ? []
      : [`source target residual visual live grid was ${sourceTargetResiduals.sourceVisualLiveGrid ?? "missing"}`]),
    ...(sourceTargetResiduals.comparisonCount >= 10
      ? []
      : [`source target residual comparison count was ${sourceTargetResiduals.comparisonCount}`]),
    ...(sourceTargetResiduals.acceptedBandsPreserved ? [] : ["source target residual did not preserve accepted bands"]),
    ...(sourceFoamResidual ? [] : [`missing source target residual ${foamComparisonId}`]),
    ...(sourceFoamResidual?.objective === "lower-is-better"
      ? []
      : [`source foam residual objective was ${sourceFoamResidual?.objective ?? "missing"}`]),
    ...(sourceFoamTargetErrorRatio >= 0.65
      ? []
      : [`source foam residual target error ratio ${sourceFoamTargetErrorRatio.toFixed(4)} was not a frontier item`]),
    ...liveRuntimeFailures(options.live),
    ...firstSampleFailures(first),
    ...settledSampleFailures(settled, thresholds),
    ...(buoyancyImprovementRatioFromFirst >= thresholds.minBuoyancyImprovementRatio
      ? []
      : [
          `settled foam buoyancy improvement ${buoyancyImprovementRatioFromFirst.toFixed(4)} from first tolerance sample was below ${thresholds.minBuoyancyImprovementRatio}`,
        ]),
    ...(buoyancyImprovementRatioFromSourceResidual >= thresholds.minSourceResidualImprovementRatio
      ? []
      : [
          `settled foam buoyancy improvement ${buoyancyImprovementRatioFromSourceResidual.toFixed(4)} from FG-48 source residual was below ${thresholds.minSourceResidualImprovementRatio}`,
        ]),
    ...(settledTargetErrorRatio <= thresholds.maxSettledTargetErrorRatio
      ? []
      : [`settled foam target error ratio ${settledTargetErrorRatio.toFixed(4)} exceeded ${thresholds.maxSettledTargetErrorRatio}`]),
    ...options.live.consoleErrors.map((entry) => `console error: ${entry}`),
    ...options.live.pageErrors.map((entry) => `page error: ${entry}`),
  ];

  return {
    failures,
    gate: "G-FG-51",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    improvement: {
      buoyancyImprovementRatioFromFirst,
      buoyancyImprovementRatioFromSourceResidual,
      firstBuoyancyErrorRatio: first.buoyancyErrorRatio,
      settledBuoyancyErrorRatio: settled.buoyancyErrorRatio,
      settledTargetErrorRatio,
      sourceFoamBuoyancyErrorRatio,
      sourceFoamTargetErrorRatio,
    },
    live: options.live,
    pass: failures.length === 0,
    sourceFrontier,
    sourceTargetResiduals,
    thresholds,
  };
}

function liveRuntimeFailures(live: FoamSettlingLiveRun): string[] {
  return [
    ...(live.launchMode === "packaged-app" ? [] : [`launch mode was ${live.launchMode}`]),
    ...(live.runtime.preferredTier === "ultra" ? [] : [`preferred tier was ${live.runtime.preferredTier}`]),
    ...(live.runtime.selectedTier === "ultra" ? [] : [`selected tier was ${live.runtime.selectedTier}`]),
    ...(live.runtime.capabilityGrid === "768x432" ? [] : [`capability grid was ${live.runtime.capabilityGrid}`]),
    ...(live.runtime.runtimeGridOverride === "1024x576"
      ? []
      : [`runtime grid override was ${live.runtime.runtimeGridOverride ?? "missing"}`]),
    ...(live.runtime.liveGrid === "1024x576" ? [] : [`live grid was ${live.runtime.liveGrid ?? "missing"}`]),
    ...(live.runtime.renderer === "webgpu-grid-primary-v1" ? [] : [`renderer was ${live.runtime.renderer ?? "missing"}`]),
    ...(live.runtime.waterContext === "webgpu" ? [] : [`water context was ${live.runtime.waterContext ?? "missing"}`]),
    ...(live.runtime.waterFrames >= 12 ? [] : [`water frames were ${live.runtime.waterFrames}`]),
  ];
}

function firstSampleFailures(sample: FoamSettlingSnapshotSample): string[] {
  return [
    ...(sample.sampleKind === "first-within-tolerance" ? [] : [`first sample kind was ${sample.sampleKind}`]),
    ...(sample.phase === "floating" ? [] : [`first sample phase was ${sample.phase}`]),
    ...(sample.withinTolerance ? [] : ["first foam sample was not within tolerance"]),
    ...(sample.settledAtS === null ? [] : [`first foam sample was already settled at ${sample.settledAtS}`]),
    ...(sample.buoyancyErrorRatio <= 0.08
      ? []
      : [`first foam buoyancy error ratio ${sample.buoyancyErrorRatio.toFixed(4)} exceeded accepted band`]),
    ...sampleTelemetryFailures("first foam sample", sample),
  ];
}

function settledSampleFailures(sample: FoamSettlingSnapshotSample, thresholds: FoamSettlingCalibrationThresholds): string[] {
  return [
    ...(sample.sampleKind === "settled-window" ? [] : [`settled sample kind was ${sample.sampleKind}`]),
    ...(sample.phase === "floating" ? [] : [`settled sample phase was ${sample.phase}`]),
    ...(sample.withinTolerance ? [] : ["settled foam sample was not within tolerance"]),
    ...(sample.settledAtS !== null ? [] : ["settled foam sample did not expose settledAtS"]),
    ...((sample.settledWindowS ?? 0) >= thresholds.minSettledWindowS
      ? []
      : [`settled foam window ${(sample.settledWindowS ?? 0).toFixed(4)} was below ${thresholds.minSettledWindowS}`]),
    ...(sample.buoyancyErrorRatio <= thresholds.maxSettledBuoyancyErrorRatio
      ? []
      : [`settled foam buoyancy error ratio ${sample.buoyancyErrorRatio.toFixed(4)} exceeded ${thresholds.maxSettledBuoyancyErrorRatio}`]),
    ...(Math.abs(sample.draftErrorM ?? Number.POSITIVE_INFINITY) <= thresholds.maxSettledDraftErrorM
      ? []
      : [`settled foam draft error ${sample.draftErrorM ?? "missing"} exceeded ${thresholds.maxSettledDraftErrorM}`]),
    ...(sample.verticalSpeedMps <= thresholds.maxSettledVerticalSpeedMps
      ? []
      : [`settled foam vertical speed ${sample.verticalSpeedMps.toFixed(4)} exceeded ${thresholds.maxSettledVerticalSpeedMps}`]),
    ...(sample.angularSpeedRadps <= thresholds.maxSettledAngularSpeedRadps
      ? []
      : [`settled foam angular speed ${sample.angularSpeedRadps.toFixed(4)} exceeded ${thresholds.maxSettledAngularSpeedRadps}`]),
    ...sampleTelemetryFailures("settled foam sample", sample),
  ];
}

function sampleTelemetryFailures(label: string, sample: FoamSettlingSnapshotSample): string[] {
  return [
    ...(sample.renderer === "webgpu-grid-primary-v1" ? [] : [`${label} renderer was ${sample.renderer ?? "missing"}`]),
    ...(sample.waterContext === "webgpu" ? [] : [`${label} water context was ${sample.waterContext ?? "missing"}`]),
    ...(sample.liveGrid === "1024x576" ? [] : [`${label} live grid was ${sample.liveGrid ?? "missing"}`]),
    ...(sample.pressureActive ? [] : [`${label} pressure feedback was not active`]),
    ...(sample.pressureNoFullGridReadback ? [] : [`${label} pressure path used full-grid readback`]),
    ...(sample.waterFrames >= 12 ? [] : [`${label} water frames were ${sample.waterFrames}`]),
  ];
}

function improvementRatio(before: number, after: number): number {
  if (!Number.isFinite(before) || before <= 0) return 0;
  return Math.max(0, (before - after) / before);
}
