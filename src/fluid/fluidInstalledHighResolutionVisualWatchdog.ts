import type { FluidCalibrationProfile } from "./fluidPersistedCalibration";
import type { FluidInstalledHighResolutionResidualBudgetReport } from "./fluidInstalledHighResolutionResidualBudget";
import type { FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import type { FluidVisualPixelProbe } from "./fluidVisualPixelProbe";

export type FluidInstalledHighResolutionVisualWatchdogGate = "G-FG-47";

export type VisualWatchdogPhase = "idle" | "post-drop";

export type VisualWatchdogSample = {
  capturedAtMs: number;
  id: string;
  phase: VisualWatchdogPhase;
  pixelProbe: FluidVisualPixelProbe;
  screenshotPath: string;
  telemetry: {
    couplingActive: boolean;
    droppedDebtS: number;
    liveGrid: string | null;
    particlesActive: boolean;
    particlesNoFullGridReadback: boolean;
    pressureActive: boolean;
    pressureNoFullGridReadback: boolean;
    renderMode: string | null;
    renderer: string | null;
    runtimeGridOverride: string | null;
    tier: string | null;
    waterContext: string | null;
    waterFrame: number;
  };
};

export type VisualWatchdogThresholds = {
  minAverageLuma: number;
  minColorBuckets: number;
  minSampleCount: number;
  minUniqueWaterFrames: number;
  minWaterFrameDelta: number;
};

export type FluidInstalledHighResolutionVisualWatchdogReport = {
  failures: string[];
  gate: FluidInstalledHighResolutionVisualWatchdogGate;
  generatedAt: string;
  installedProfile: {
    pass: boolean;
    runtimeGrid: FluidCalibrationProfile["runtimeGrid"];
    schema: FluidCalibrationProfile["schema"];
    selectedTier: FluidCalibrationProfile["selectedTier"];
    sourceGate: FluidCalibrationProfile["sourceGate"];
  };
  launchEnv: {
    envCalibratedTierPresent: boolean;
    envExperimentalGridPresent: boolean;
    envRequestedTierPresent: boolean;
    envUserDataOverridePresent: boolean;
  };
  launcher: {
    executablePath: string;
    path: string;
    resolvesToInstalledBundle: boolean;
    targetPath: string | null;
  };
  pass: boolean;
  runtime: {
    capabilityGrid: {
      cellsX: number;
      cellsY: number;
    };
    liveGrid: string | null;
    renderer: string | null;
    runtimeGridOverride: {
      cellsX: number;
      cellsY: number;
    } | null;
    selectedTier: string;
    selection: FluidRuntimeTierSelection | null;
    tier: string | null;
    waterContext: string | null;
    waterFrames: number;
  };
  samples: VisualWatchdogSample[];
  sourceResidualBudget: {
    closestMarginRatio: number;
    comparisonCount: number;
    failures: string[];
    gate: string;
    pass: boolean;
    sourcePath: string;
    watchComparisonIds: string[];
    worstNormalizedResidual: number;
  };
  storage: {
    defaultStorage: boolean;
    fileName: string;
    persistedRawBytes: number;
    profileHadRuntimeGrid: boolean;
    readByMainProcess: boolean;
    storageBasePath: string;
    verificationReadMatched: boolean;
  };
  summary: {
    blankSampleIds: string[];
    closestSourceMarginRatio: number;
    flatSampleIds: string[];
    maxAverageLuma: number;
    minAverageLuma: number;
    minColorBuckets: number;
    phases: VisualWatchdogPhase[];
    postDropActivePhysicsSeen: boolean;
    sampleCount: number;
    uniqueWaterFrames: number;
    waterFrameDelta: number;
  };
  thresholds: VisualWatchdogThresholds;
};

export type FluidInstalledHighResolutionVisualWatchdogOptions = {
  generatedAt?: string;
  installedProfile: FluidInstalledHighResolutionVisualWatchdogReport["installedProfile"];
  launchEnv: FluidInstalledHighResolutionVisualWatchdogReport["launchEnv"];
  launcher: FluidInstalledHighResolutionVisualWatchdogReport["launcher"];
  runtime: FluidInstalledHighResolutionVisualWatchdogReport["runtime"];
  samples: VisualWatchdogSample[];
  sourceResidualBudget: FluidInstalledHighResolutionResidualBudgetReport;
  sourceResidualBudgetPath: string;
  storage: FluidInstalledHighResolutionVisualWatchdogReport["storage"];
  thresholds?: Partial<VisualWatchdogThresholds>;
};

export const installedHighResolutionVisualWatchdogThresholds: VisualWatchdogThresholds = {
  minAverageLuma: 35,
  minColorBuckets: 18,
  minSampleCount: 6,
  minUniqueWaterFrames: 4,
  minWaterFrameDelta: 24,
};

export function createFluidInstalledHighResolutionVisualWatchdogReport(
  options: FluidInstalledHighResolutionVisualWatchdogOptions
): FluidInstalledHighResolutionVisualWatchdogReport {
  const thresholds = { ...installedHighResolutionVisualWatchdogThresholds, ...options.thresholds };
  const phases = Array.from(new Set(options.samples.map((sample) => sample.phase))).sort() as VisualWatchdogPhase[];
  const waterFrames = options.samples.map((sample) => sample.telemetry.waterFrame);
  const uniqueWaterFrames = new Set(waterFrames).size;
  const minWaterFrame = waterFrames.length > 0 ? Math.min(...waterFrames) : 0;
  const maxWaterFrame = waterFrames.length > 0 ? Math.max(...waterFrames) : 0;
  const waterFrameDelta = maxWaterFrame - minWaterFrame;
  const blankSampleIds = options.samples.filter((sample) => sample.pixelProbe.status !== "nonblank").map((sample) => sample.id);
  const flatSampleIds = options.samples.filter((sample) => sample.pixelProbe.variety !== "varied").map((sample) => sample.id);
  const postDropActivePhysicsSeen = options.samples.some(
    (sample) => sample.phase === "post-drop" && (sample.telemetry.pressureActive || sample.telemetry.particlesActive || sample.telemetry.couplingActive)
  );
  const lumas = options.samples.map((sample) => sample.pixelProbe.averageLuma);
  const colorBuckets = options.samples.map((sample) => sample.pixelProbe.colorBuckets);
  const summary = {
    blankSampleIds,
    closestSourceMarginRatio: options.sourceResidualBudget.summary.closestMarginRatio,
    flatSampleIds,
    maxAverageLuma: Math.max(0, ...lumas),
    minAverageLuma: Math.min(...lumas, Number.POSITIVE_INFINITY),
    minColorBuckets: Math.min(...colorBuckets, Number.POSITIVE_INFINITY),
    phases,
    postDropActivePhysicsSeen,
    sampleCount: options.samples.length,
    uniqueWaterFrames,
    waterFrameDelta,
  };

  const failures = [
    ...sourceResidualBudgetFailures(options.sourceResidualBudget),
    ...installedProfileFailures(options.installedProfile),
    ...storageFailures(options.storage),
    ...launchFailures(options.launchEnv, options.launcher, options.runtime),
    ...(options.samples.length >= thresholds.minSampleCount
      ? []
      : [
          `visual watchdog captured ${options.samples.length} samples; expected at least ${thresholds.minSampleCount}; UI-only visual evidence is not accepted`,
        ]),
    ...(phases.includes("idle") ? [] : ["visual watchdog did not capture idle samples"]),
    ...(phases.includes("post-drop") ? [] : ["visual watchdog did not capture post-drop samples"]),
    ...(uniqueWaterFrames >= thresholds.minUniqueWaterFrames
      ? []
      : [`visual watchdog only saw ${uniqueWaterFrames} unique water frames; frames may be stale`]),
    ...(waterFrameDelta >= thresholds.minWaterFrameDelta
      ? []
      : [`visual watchdog water frame delta was ${waterFrameDelta}; expected at least ${thresholds.minWaterFrameDelta}`]),
    ...(postDropActivePhysicsSeen ? [] : ["visual watchdog never observed active post-drop pressure, particle, or coupling telemetry"]),
    ...options.samples.flatMap((sample) => sampleFailures(sample, thresholds)),
  ];

  return {
    failures,
    gate: "G-FG-47",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    installedProfile: options.installedProfile,
    launchEnv: options.launchEnv,
    launcher: options.launcher,
    pass: failures.length === 0,
    runtime: options.runtime,
    samples: options.samples,
    sourceResidualBudget: {
      closestMarginRatio: options.sourceResidualBudget.summary.closestMarginRatio,
      comparisonCount: options.sourceResidualBudget.summary.comparisonCount,
      failures: options.sourceResidualBudget.failures,
      gate: options.sourceResidualBudget.gate,
      pass: options.sourceResidualBudget.pass,
      sourcePath: options.sourceResidualBudgetPath,
      watchComparisonIds: options.sourceResidualBudget.summary.watchComparisonIds,
      worstNormalizedResidual: options.sourceResidualBudget.summary.worstNormalizedResidual,
    },
    storage: options.storage,
    summary,
    thresholds,
  };
}

function sourceResidualBudgetFailures(source: FluidInstalledHighResolutionResidualBudgetReport): string[] {
  return [
    ...(source.gate === "G-FG-46" ? [] : [`source residual budget gate was ${source.gate}`]),
    ...(source.pass ? [] : source.failures.map((failure) => `source residual budget ${failure}`)),
    ...(source.summary.comparisonCount >= 10 ? [] : [`source residual comparison count was ${source.summary.comparisonCount}`]),
    ...(source.sourceReference.liveGrid === "1024x576"
      ? []
      : [`source residual reference live grid was ${source.sourceReference.liveGrid ?? "missing"}`]),
    ...(source.sourceReference.noFullGridReadbackPerFrame ? [] : ["source residual reference used full-grid readback"]),
    ...(source.operatorReadout.liveGrid === "1024x576"
      ? []
      : [`source residual operator live grid was ${source.operatorReadout.liveGrid ?? "missing"}`]),
  ];
}

function installedProfileFailures(profile: FluidInstalledHighResolutionVisualWatchdogReport["installedProfile"]): string[] {
  return [
    ...(profile.schema === "ocean-fluid-calibration-profile-v1" ? [] : [`installed profile schema was ${profile.schema}`]),
    ...(profile.pass ? [] : ["installed high-resolution profile did not pass"]),
    ...(profile.sourceGate === "G-FG-23" ? [] : [`installed profile source gate was ${profile.sourceGate}`]),
    ...(profile.selectedTier === "ultra" ? [] : [`installed profile selected tier was ${profile.selectedTier}`]),
    ...(profile.runtimeGrid?.sourceGate === "G-FG-40" ? [] : ["installed profile runtime grid did not record source gate G-FG-40"]),
    ...(profile.runtimeGrid?.liveGrid === "1024x576"
      ? []
      : [`installed profile runtime grid live grid was ${profile.runtimeGrid?.liveGrid ?? "missing"}`]),
    ...(profile.runtimeGrid?.cellsX === 1024 && profile.runtimeGrid.cellsY === 576
      ? []
      : ["installed profile runtime grid dimensions were not 1024 x 576"]),
  ];
}

function storageFailures(storage: FluidInstalledHighResolutionVisualWatchdogReport["storage"]): string[] {
  return [
    ...(storage.fileName === "fluid-calibration.v1.json" ? [] : [`storage file was ${storage.fileName}`]),
    ...(storage.defaultStorage ? [] : [`storage path was not the default Desktop profile: ${storage.storageBasePath}`]),
    ...(storage.profileHadRuntimeGrid ? [] : ["stored profile did not include runtimeGrid"]),
    ...(storage.persistedRawBytes > 0 ? [] : ["persisted profile was empty"]),
    ...(storage.verificationReadMatched ? [] : ["persisted profile did not round-trip through storage"]),
    ...(storage.readByMainProcess ? [] : ["main process did not read the installed high-resolution runtime grid"]),
  ];
}

function launchFailures(
  env: FluidInstalledHighResolutionVisualWatchdogReport["launchEnv"],
  launcher: FluidInstalledHighResolutionVisualWatchdogReport["launcher"],
  runtime: FluidInstalledHighResolutionVisualWatchdogReport["runtime"]
): string[] {
  return [
    ...(launcher.resolvesToInstalledBundle ? [] : ["Desktop launcher does not resolve to the installed app bundle"]),
    ...(launcher.executablePath.includes("/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab")
      ? []
      : [`launcher executable was ${launcher.executablePath}`]),
    ...(env.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent"] : []),
    ...(env.envExperimentalGridPresent ? ["OCEAN_LAB_EXPERIMENTAL_FLUID_GRID must be absent"] : []),
    ...(env.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent"] : []),
    ...(env.envUserDataOverridePresent ? ["HARBORLINE_USER_DATA_DIR must be absent"] : []),
    ...(runtime.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${runtime.selection?.mode ?? "missing"}`]),
    ...(runtime.selection?.requestedTier === "auto" ? [] : [`runtime requested tier was ${runtime.selection?.requestedTier ?? "missing"}`]),
    ...(runtime.selection?.calibratedTier === "ultra" ? [] : [`runtime calibrated tier was ${runtime.selection?.calibratedTier ?? "missing"}`]),
    ...(runtime.selectedTier === "ultra" ? [] : [`runtime selected tier was ${runtime.selectedTier}`]),
    ...(runtime.capabilityGrid.cellsX === 768 && runtime.capabilityGrid.cellsY === 432
      ? []
      : [`runtime capability grid was ${runtime.capabilityGrid.cellsX} x ${runtime.capabilityGrid.cellsY}`]),
    ...(runtime.runtimeGridOverride?.cellsX === 1024 && runtime.runtimeGridOverride.cellsY === 576
      ? []
      : ["runtime grid override was not 1024 x 576"]),
    ...(runtime.liveGrid === "1024x576" ? [] : [`runtime live grid was ${runtime.liveGrid ?? "missing"}`]),
    ...(runtime.renderer === "webgpu-grid-primary-v1" ? [] : [`runtime renderer was ${runtime.renderer ?? "missing"}`]),
    ...(runtime.waterContext === "webgpu" ? [] : [`runtime water context was ${runtime.waterContext ?? "missing"}`]),
    ...(runtime.waterFrames >= 12 ? [] : [`runtime only rendered ${runtime.waterFrames} water frames`]),
  ];
}

function sampleFailures(sample: VisualWatchdogSample, thresholds: VisualWatchdogThresholds): string[] {
  return [
    ...(sample.telemetry.liveGrid === "1024x576" ? [] : [`${sample.id} live grid was ${sample.telemetry.liveGrid ?? "missing"}`]),
    ...(sample.telemetry.runtimeGridOverride === "1024x576"
      ? []
      : [`${sample.id} runtime grid override was ${sample.telemetry.runtimeGridOverride ?? "missing"}`]),
    ...(sample.telemetry.renderer === "webgpu-grid-primary-v1" ? [] : [`${sample.id} renderer was ${sample.telemetry.renderer ?? "missing"}`]),
    ...(sample.telemetry.waterContext === "webgpu" ? [] : [`${sample.id} water context was ${sample.telemetry.waterContext ?? "missing"}`]),
    ...(sample.telemetry.renderMode === "webgpu" ? [] : [`${sample.id} render mode was ${sample.telemetry.renderMode ?? "missing"}`]),
    ...(sample.telemetry.pressureNoFullGridReadback ? [] : [`${sample.id} pressure path used full-grid readback`]),
    ...(sample.telemetry.particlesNoFullGridReadback ? [] : [`${sample.id} particle path used full-grid readback`]),
    ...(sample.telemetry.droppedDebtS === 0 ? [] : [`${sample.id} dropped fixed-step debt ${sample.telemetry.droppedDebtS}`]),
    ...(sample.pixelProbe.status === "nonblank" ? [] : [`${sample.id} high-resolution canvas pixels were ${sample.pixelProbe.status}; screen may be black`]),
    ...(sample.pixelProbe.variety === "varied" ? [] : [`${sample.id} high-resolution canvas variety was ${sample.pixelProbe.variety}; screen may be flat`]),
    ...(sample.pixelProbe.averageLuma >= thresholds.minAverageLuma
      ? []
      : [`${sample.id} average luma ${sample.pixelProbe.averageLuma} was below ${thresholds.minAverageLuma}`]),
    ...(sample.pixelProbe.colorBuckets >= thresholds.minColorBuckets
      ? []
      : [`${sample.id} color buckets ${sample.pixelProbe.colorBuckets} were below ${thresholds.minColorBuckets}`]),
    ...(sample.pixelProbe.width > 0 && sample.pixelProbe.height > 0
      ? []
      : [`${sample.id} screenshot dimensions were ${sample.pixelProbe.width} x ${sample.pixelProbe.height}`]),
  ];
}
