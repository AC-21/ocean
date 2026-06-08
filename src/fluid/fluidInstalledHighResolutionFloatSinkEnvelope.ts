import {
  defaultDisplayPacingThresholds,
  summarizeDisplayPacing,
  type DisplayPacingSummary,
  type DisplayPacingThresholds,
} from "./fluidDisplayPacing";
import type { FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import type { InstalledHighResolutionReferencePacingSample } from "./fluidInstalledHighResolutionReferencePacing";
import type { FluidCalibrationProfile } from "./fluidPersistedCalibration";

export type FluidInstalledHighResolutionFloatSinkEnvelopeGate = "G-FG-43";
export type FloatSinkOutcomeKind = "floats-indefinitely" | "sinks-immediately" | "waterlogs-then-sinks";

export type FloatSinkPredictionEvidence = {
  criticalWaterFillFraction: number | null;
  effectiveDensityKgM3: number;
  equilibriumSubmergedFraction: number;
  fullWaterloggedDensityKgM3: number;
  initialSubmergedDepthM: number | null;
  maxWaterFillFraction: number;
  outcome: FloatSinkOutcomeKind;
  secondsUntilSink: number | null;
  waterFillRatePerMinute: number;
};

export type FloatSinkLiveEvidence = {
  diagnostics: {
    effectiveDensityKgM3: number;
    equilibriumSubmergedFraction: number;
    terminalVelocityMps: number | null;
  };
  equilibrium: {
    buoyancyErrorRatio: number;
    draftErrorM: number | null;
    withinTolerance: boolean;
  };
  impactSpeedMps: number | null;
  liveFloatDurationS: number | null;
  phase: string;
  sankAtS: number | null;
  settledAtS: number | null;
  waterFillFraction: number;
};

export type FloatSinkTelemetryEvidence = {
  canvasGrid: string | null;
  couplingActiveSeen: boolean;
  particlesActiveSeen: boolean;
  pressureActiveSeen: boolean;
  renderer: string | null;
  runtimeGridOverride: string | null;
  samples: InstalledHighResolutionReferencePacingSample[];
  waterContext: string | null;
};

export type FloatSinkViewportPixelProbe = {
  averageLuma: number;
  colorBuckets: number;
  height: number;
  opaqueSamples: number;
  samples: number;
  status: "blank" | "nonblank";
  variety: "flat" | "varied";
  width: number;
};

export type FloatSinkEnvelopeCaseInput = {
  acceleratedWaterlogging?: {
    final: FloatSinkLiveEvidence;
    prediction: FloatSinkPredictionEvidence;
    telemetry: FloatSinkTelemetryEvidence;
  };
  expectedOutcome: FloatSinkOutcomeKind;
  live: FloatSinkLiveEvidence;
  prediction: FloatSinkPredictionEvidence;
  presetId: string;
  presetName: string;
  telemetry: FloatSinkTelemetryEvidence;
};

export type FloatSinkEnvelopeCase = FloatSinkEnvelopeCaseInput & {
  framePacing: DisplayPacingSummary;
};

export type FluidInstalledHighResolutionFloatSinkEnvelopeReport = {
  cases: FloatSinkEnvelopeCase[];
  failures: string[];
  gate: FluidInstalledHighResolutionFloatSinkEnvelopeGate;
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
    caseCount: number;
    maxP95FrameMs: number;
    maxP99FrameMs: number;
    outcomes: FloatSinkOutcomeKind[];
    presetCount: number;
    worstDroppedFrameRatio: number;
    worstDuplicateWaterFrameRatio: number;
  };
  thresholds: DisplayPacingThresholds;
  visual: {
    pixelProbe: FloatSinkViewportPixelProbe;
    screenshotPath: string;
  };
};

export type FluidInstalledHighResolutionFloatSinkEnvelopeOptions = {
  cases: FloatSinkEnvelopeCaseInput[];
  generatedAt?: string;
  installedProfile: FluidInstalledHighResolutionFloatSinkEnvelopeReport["installedProfile"];
  launchEnv: FluidInstalledHighResolutionFloatSinkEnvelopeReport["launchEnv"];
  launcher: FluidInstalledHighResolutionFloatSinkEnvelopeReport["launcher"];
  runtime: FluidInstalledHighResolutionFloatSinkEnvelopeReport["runtime"];
  storage: FluidInstalledHighResolutionFloatSinkEnvelopeReport["storage"];
  thresholds?: Partial<DisplayPacingThresholds>;
  visual: FluidInstalledHighResolutionFloatSinkEnvelopeReport["visual"];
};

export const installedHighResolutionFloatSinkEnvelopeThresholds: DisplayPacingThresholds = {
  ...defaultDisplayPacingThresholds,
  maxDroppedFrameRatio: 0.08,
  maxDuplicateWaterFrameRatio: 0.18,
  maxLongTaskDurationMs: 180,
  maxP95FrameMs: 24,
  maxP99FrameMs: 36,
  minSamples: 90,
  minWaterFrameDelta: 24,
};

const expectedPresetOutcomes: Record<string, FloatSinkOutcomeKind> = {
  "aluminum-canister": "floats-indefinitely",
  "concrete-cube": "sinks-immediately",
  "foam-rescue-block": "floats-indefinitely",
  "hardwood-crate": "waterlogs-then-sinks",
  "ice-block": "floats-indefinitely",
  "leaky-steel-drum": "waterlogs-then-sinks",
  "pine-log": "floats-indefinitely",
  "steel-sphere": "sinks-immediately",
};

export function createFluidInstalledHighResolutionFloatSinkEnvelopeReport(
  options: FluidInstalledHighResolutionFloatSinkEnvelopeOptions
): FluidInstalledHighResolutionFloatSinkEnvelopeReport {
  const thresholds = { ...installedHighResolutionFloatSinkEnvelopeThresholds, ...options.thresholds };
  const cases = options.cases.map((entry) => ({
    ...entry,
    framePacing: summarizeDisplayPacing(entry.telemetry.samples, true, thresholds),
  }));
  const presetIds = new Set(cases.map((entry) => entry.presetId));
  const outcomes = Array.from(new Set(cases.map((entry) => entry.prediction.outcome))).sort() as FloatSinkOutcomeKind[];
  const expectedPresetIds = Object.keys(expectedPresetOutcomes).sort();
  const failures = [
    ...(options.installedProfile.schema === "ocean-fluid-calibration-profile-v1"
      ? []
      : [`installed profile schema was ${options.installedProfile.schema}`]),
    ...(options.installedProfile.pass ? [] : ["installed profile did not pass"]),
    ...(options.installedProfile.sourceGate === "G-FG-23" ? [] : [`installed profile source gate was ${options.installedProfile.sourceGate}`]),
    ...(options.installedProfile.selectedTier === "ultra" ? [] : [`installed profile selected tier was ${options.installedProfile.selectedTier}`]),
    ...(options.installedProfile.runtimeGrid?.sourceGate === "G-FG-40" ? [] : ["installed profile runtime grid did not record source gate G-FG-40"]),
    ...(options.installedProfile.runtimeGrid?.liveGrid === "1024x576"
      ? []
      : [`installed profile runtime grid live grid was ${options.installedProfile.runtimeGrid?.liveGrid ?? "missing"}`]),
    ...(options.installedProfile.runtimeGrid?.cellsX === 1024 && options.installedProfile.runtimeGrid.cellsY === 576
      ? []
      : ["installed profile runtime grid dimensions were not 1024 x 576"]),
    ...(options.storage.fileName === "fluid-calibration.v1.json" ? [] : [`storage file was ${options.storage.fileName}`]),
    ...(options.storage.defaultStorage ? [] : [`storage path was not default Desktop storage: ${options.storage.storageBasePath}`]),
    ...(options.storage.profileHadRuntimeGrid ? [] : ["stored profile did not include runtimeGrid"]),
    ...(options.storage.persistedRawBytes > 0 ? [] : ["persisted profile was empty"]),
    ...(options.storage.verificationReadMatched ? [] : ["persisted profile did not round-trip through storage"]),
    ...(options.storage.readByMainProcess ? [] : ["main process did not read the installed high-resolution runtime grid"]),
    ...(options.launcher.resolvesToInstalledBundle ? [] : ["Desktop launcher does not resolve to the installed app bundle"]),
    ...(options.launchEnv.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envExperimentalGridPresent ? ["OCEAN_LAB_EXPERIMENTAL_FLUID_GRID must be absent"] : []),
    ...(options.launchEnv.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envUserDataOverridePresent ? ["HARBORLINE_USER_DATA_DIR must be absent"] : []),
    ...(options.runtime.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${options.runtime.selection?.mode ?? "missing"}`]),
    ...(options.runtime.selection?.requestedTier === "auto" ? [] : [`runtime requested tier was ${options.runtime.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtime.selection?.calibratedTier === "ultra"
      ? []
      : [`runtime calibrated tier was ${options.runtime.selection?.calibratedTier ?? "missing"}`]),
    ...(options.runtime.selectedTier === "ultra" ? [] : [`runtime selected tier was ${options.runtime.selectedTier}`]),
    ...(options.runtime.capabilityGrid.cellsX === 768 && options.runtime.capabilityGrid.cellsY === 432
      ? []
      : [`runtime capability grid was ${options.runtime.capabilityGrid.cellsX} x ${options.runtime.capabilityGrid.cellsY}`]),
    ...(options.runtime.runtimeGridOverride?.cellsX === 1024 && options.runtime.runtimeGridOverride.cellsY === 576
      ? []
      : ["runtime grid override global did not report 1024 x 576"]),
    ...(options.runtime.liveGrid === "1024x576" ? [] : [`runtime live grid was ${options.runtime.liveGrid ?? "missing"}`]),
    ...(options.runtime.renderer === "webgpu-grid-primary-v1" ? [] : [`runtime renderer was ${options.runtime.renderer ?? "missing"}`]),
    ...(options.runtime.waterContext === "webgpu" ? [] : [`runtime water context was ${options.runtime.waterContext ?? "missing"}`]),
    ...(options.runtime.waterFrames >= 12 ? [] : [`runtime only rendered ${options.runtime.waterFrames} water frames`]),
    ...(options.visual.pixelProbe.status === "nonblank"
      ? []
      : [`high-resolution ocean viewport pixels were ${options.visual.pixelProbe.status}; screen may appear black`]),
    ...(options.visual.pixelProbe.variety === "varied"
      ? []
      : [`high-resolution ocean viewport variety was ${options.visual.pixelProbe.variety}; screen may appear flat black`]),
    ...(options.visual.pixelProbe.averageLuma >= 35
      ? []
      : [`high-resolution ocean viewport average luma was ${options.visual.pixelProbe.averageLuma}; expected visible water`]),
    ...(options.visual.pixelProbe.colorBuckets >= 18
      ? []
      : [`high-resolution ocean viewport color buckets were ${options.visual.pixelProbe.colorBuckets}; expected varied water pixels`]),
    ...(options.visual.pixelProbe.width > 0 && options.visual.pixelProbe.height > 0
      ? []
      : [`high-resolution ocean viewport screenshot was ${options.visual.pixelProbe.width} x ${options.visual.pixelProbe.height}`]),
    ...expectedPresetIds.flatMap((presetId) => (presetIds.has(presetId) ? [] : [`missing preset ${presetId}`])),
    ...(outcomes.includes("floats-indefinitely") && outcomes.includes("sinks-immediately") && outcomes.includes("waterlogs-then-sinks")
      ? []
      : [`outcome coverage was ${outcomes.join(", ")}`]),
    ...cases.flatMap((entry) => failuresForCase(entry)),
  ];

  return {
    cases,
    failures,
    gate: "G-FG-43",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    installedProfile: options.installedProfile,
    launchEnv: options.launchEnv,
    launcher: options.launcher,
    pass: failures.length === 0,
    runtime: options.runtime,
    storage: options.storage,
    summary: {
      caseCount: cases.length,
      maxP95FrameMs: Math.max(0, ...cases.map((entry) => entry.framePacing.p95FrameMs)),
      maxP99FrameMs: Math.max(0, ...cases.map((entry) => entry.framePacing.p99FrameMs)),
      outcomes,
      presetCount: presetIds.size,
      worstDroppedFrameRatio: Math.max(0, ...cases.map((entry) => entry.framePacing.droppedFrameRatio)),
      worstDuplicateWaterFrameRatio: Math.max(0, ...cases.map((entry) => entry.framePacing.duplicateWaterFrameRatio)),
    },
    thresholds,
    visual: options.visual,
  };
}

function failuresForCase(entry: FloatSinkEnvelopeCase): string[] {
  const expectedOutcome = expectedPresetOutcomes[entry.presetId];
  const common = [
    ...(expectedOutcome === entry.expectedOutcome ? [] : [`${entry.presetId} expected outcome metadata was ${entry.expectedOutcome}`]),
    ...(expectedOutcome === entry.prediction.outcome
      ? []
      : [`${entry.presetId} prediction outcome was ${entry.prediction.outcome}, expected ${expectedOutcome ?? "known preset"}`]),
    ...(entry.telemetry.canvasGrid === "1024x576" ? [] : [`${entry.presetId} canvas grid was ${entry.telemetry.canvasGrid ?? "missing"}`]),
    ...(entry.telemetry.runtimeGridOverride === "1024x576"
      ? []
      : [`${entry.presetId} runtime grid override was ${entry.telemetry.runtimeGridOverride ?? "missing"}`]),
    ...(entry.telemetry.renderer === "webgpu-grid-primary-v1" ? [] : [`${entry.presetId} renderer was ${entry.telemetry.renderer ?? "missing"}`]),
    ...(entry.telemetry.waterContext === "webgpu" ? [] : [`${entry.presetId} water context was ${entry.telemetry.waterContext ?? "missing"}`]),
    ...(entry.telemetry.pressureActiveSeen ? [] : [`${entry.presetId} never observed active pressure telemetry`]),
    ...(entry.telemetry.couplingActiveSeen ? [] : [`${entry.presetId} never observed active coupling telemetry`]),
    ...(entry.telemetry.particlesActiveSeen ? [] : [`${entry.presetId} never observed active particle telemetry`]),
    ...(entry.telemetry.samples.every((sample) => sample.pressureNoFullGridReadback && sample.particlesNoFullGridReadback)
      ? []
      : [`${entry.presetId} observed a full-grid readback flag`]),
    ...(entry.framePacing.pass ? [] : [`${entry.presetId} display pacing missed the installed high-resolution envelope threshold`]),
    ...sampleSetFailures(entry),
  ];

  if (entry.prediction.outcome === "floats-indefinitely") {
    const lowDraftConverged = lowDraftStableFloaterConverged(entry);
    return [
      ...common,
      ...(entry.prediction.secondsUntilSink === null ? [] : [`${entry.presetId} stable floater predicted finite sink time`]),
      ...(entry.prediction.initialSubmergedDepthM !== null ? [] : [`${entry.presetId} stable floater had no hydrostatic draft`]),
      ...(entry.live.phase === "floating" ? [] : [`${entry.presetId} stable floater finished phase ${entry.live.phase}`]),
      ...(entry.live.settledAtS !== null || entry.live.equilibrium.withinTolerance || lowDraftConverged
        ? []
        : [`${entry.presetId} stable floater did not settle, reach equilibrium tolerance, or converge by low-draft error`]),
      ...(Math.abs(entry.live.equilibrium.draftErrorM ?? 0) <= 0.09 ? [] : [`${entry.presetId} draft error was ${entry.live.equilibrium.draftErrorM}`]),
      ...(entry.live.equilibrium.buoyancyErrorRatio <= 0.12 || lowDraftConverged
        ? []
        : [`${entry.presetId} buoyancy error ratio was ${entry.live.equilibrium.buoyancyErrorRatio}`]),
      ...(entry.live.liveFloatDurationS !== null && entry.live.liveFloatDurationS >= 2
        ? []
        : [`${entry.presetId} did not record at least two seconds of live float duration`]),
    ];
  }

  if (entry.prediction.outcome === "sinks-immediately") {
    return [
      ...common,
      ...(entry.prediction.secondsUntilSink === 0 ? [] : [`${entry.presetId} immediate sinker predicted ${entry.prediction.secondsUntilSink}`]),
      ...(entry.prediction.initialSubmergedDepthM === null ? [] : [`${entry.presetId} immediate sinker unexpectedly had a hydrostatic draft`]),
      ...(entry.live.phase === "sinking" || entry.live.phase === "sank" ? [] : [`${entry.presetId} immediate sinker finished phase ${entry.live.phase}`]),
      ...(entry.live.diagnostics.terminalVelocityMps !== null && entry.live.diagnostics.terminalVelocityMps > 0
        ? []
        : [`${entry.presetId} immediate sinker did not expose terminal velocity diagnostics`]),
    ];
  }

  return [
    ...common,
    ...(entry.prediction.secondsUntilSink !== null && entry.prediction.secondsUntilSink > 0
      ? []
      : [`${entry.presetId} waterlogging preset did not predict finite sink time`]),
    ...(entry.prediction.criticalWaterFillFraction !== null &&
    entry.prediction.criticalWaterFillFraction > 0 &&
    entry.prediction.criticalWaterFillFraction <= entry.prediction.maxWaterFillFraction
      ? []
      : [`${entry.presetId} waterlogging preset had invalid critical fill ${entry.prediction.criticalWaterFillFraction}`]),
    ...(entry.live.phase === "floating" || entry.live.phase === "sinking" || entry.live.phase === "sank"
      ? []
      : [`${entry.presetId} waterlogging preset finished phase ${entry.live.phase}`]),
    ...(entry.acceleratedWaterlogging ? [] : [`${entry.presetId} missing accelerated waterlogging proof`]),
    ...(entry.acceleratedWaterlogging && entry.acceleratedWaterlogging.prediction.secondsUntilSink !== null && entry.prediction.secondsUntilSink !== null
      ? entry.acceleratedWaterlogging.prediction.secondsUntilSink < entry.prediction.secondsUntilSink
        ? []
        : [`${entry.presetId} accelerated sink time did not shrink`]
      : []),
    ...(entry.acceleratedWaterlogging &&
    (entry.acceleratedWaterlogging.final.phase === "sinking" ||
      entry.acceleratedWaterlogging.final.phase === "sank" ||
      (entry.prediction.criticalWaterFillFraction !== null &&
        entry.acceleratedWaterlogging.final.waterFillFraction >= entry.prediction.criticalWaterFillFraction))
      ? []
      : [`${entry.presetId} accelerated waterlogging did not cross the sink threshold`]),
  ];
}

function lowDraftStableFloaterConverged(entry: FloatSinkEnvelopeCase): boolean {
  const draftErrorM = Math.abs(entry.live.equilibrium.draftErrorM ?? Number.POSITIVE_INFINITY);
  return (
    entry.prediction.equilibriumSubmergedFraction <= 0.08 &&
    draftErrorM <= 0.015 &&
    entry.live.liveFloatDurationS !== null &&
    entry.live.liveFloatDurationS >= 2
  );
}

function sampleSetFailures(entry: FloatSinkEnvelopeCase): string[] {
  const sampleModes = new Set(entry.telemetry.samples.map((sample) => sample.tierSelectionMode ?? "missing"));
  const requestedTiers = new Set(entry.telemetry.samples.map((sample) => sample.tierSelectionRequestedTier ?? "missing"));
  const capabilityGrids = new Set(entry.telemetry.samples.map((sample) => sample.capabilityGrid ?? "missing"));
  const canvasGrids = new Set(entry.telemetry.samples.map((sample) => sample.canvasGrid ?? "missing"));
  return [
    ...(setEquals(sampleModes, new Set(["calibrated-auto"])) ? [] : [`${entry.presetId} samples did not all observe calibrated-auto`]),
    ...(setEquals(requestedTiers, new Set(["auto"])) ? [] : [`${entry.presetId} samples did not all observe auto requests`]),
    ...(setEquals(capabilityGrids, new Set(["768x432"])) ? [] : [`${entry.presetId} samples did not all use 768x432 capability grid`]),
    ...(setEquals(canvasGrids, new Set(["1024x576"])) ? [] : [`${entry.presetId} samples did not all render 1024x576 canvas grid`]),
  ];
}

function setEquals<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}
