import type { FluidAdaptiveTierReport, FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import {
  defaultDisplayPacingThresholds,
  summarizeDisplayPacing,
  type DisplayPacingSummary,
  type DisplayPacingThresholds,
} from "./fluidDisplayPacing";
import type { FluidCalibrationInstallReceipt } from "./fluidInstalledCalibration";
import type { InstalledDisplayPacingSample } from "./fluidInstalledDisplayPacing";

export type FluidSustainedInteractionPacingGate = "G-FG-29";

export type SustainedInteractionAction = {
  atMs: number;
  dropHeightM: number;
  label: string;
  presetId: string;
  releaseAngleRad: number;
};

export type SustainedInteractionWorkloadInput = {
  actions: SustainedInteractionAction[];
  durationMs: number;
  expectedActivePhysics: boolean;
  id: string;
  label: string;
  samples: InstalledDisplayPacingSample[];
  telemetry: {
    couplingActiveSeen: boolean;
    finalPhase: string | null;
    firedActionCount: number;
    longTaskSupported: boolean;
    particlesActiveSeen: boolean;
    pressureActiveSeen: boolean;
    renderMode: string | null;
    renderer: string | null;
    timeScale: number;
    waterContext: string | null;
  };
};

export type SustainedInteractionWorkload = SustainedInteractionWorkloadInput & {
  framePacing: DisplayPacingSummary;
};

export type FluidSustainedInteractionPacingReport = {
  adaptiveSource: Pick<FluidAdaptiveTierReport, "gate" | "pass" | "recommendation">;
  failures: string[];
  gate: FluidSustainedInteractionPacingGate;
  generatedAt: string;
  install: FluidCalibrationInstallReceipt;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  runtime: {
    envCalibratedTierPresent: boolean;
    envRequestedTierPresent: boolean;
    selectedGrid: {
      cellsX: number;
      cellsY: number;
    };
    selectedTier: string;
    selection: FluidRuntimeTierSelection | null;
  };
  storage: {
    fileName: string;
    installedTier: string;
    reusedByMainProcess: boolean;
    verificationReadMatched: boolean;
  };
  summary: {
    actionCount: number;
    durationMs: number;
    maxDroppedDebtS: number;
    p95FrameMs: number;
    p99FrameMs: number;
    sampleCount: number;
    stability: DisplayPacingSummary["stability"];
    waterFrameDelta: number;
    worstDroppedFrameRatio: number;
    worstDuplicateWaterFrameRatio: number;
  };
  thresholds: DisplayPacingThresholds;
  workload: SustainedInteractionWorkload;
};

export type FluidSustainedInteractionPacingOptions = {
  adaptiveSource: FluidAdaptiveTierReport;
  envCalibratedTierPresent: boolean;
  envRequestedTierPresent: boolean;
  generatedAt?: string;
  install: FluidCalibrationInstallReceipt;
  launchMode: FluidSustainedInteractionPacingReport["launchMode"];
  runtime: FluidSustainedInteractionPacingReport["runtime"];
  thresholds?: Partial<DisplayPacingThresholds>;
  workload: SustainedInteractionWorkloadInput;
};

export const sustainedInteractionPacingThresholds: DisplayPacingThresholds = {
  ...defaultDisplayPacingThresholds,
  maxDroppedFrameRatio: 0.08,
  maxDuplicateWaterFrameRatio: 0.16,
  maxLongTaskDurationMs: 160,
  maxP95FrameMs: 24,
  maxP99FrameMs: 36,
  minSamples: 600,
  minWaterFrameDelta: 240,
};

const sustainedWorkloadId = "sustained-calibrated-mixed-drops";

export function createFluidSustainedInteractionPacingReport(
  options: FluidSustainedInteractionPacingOptions
): FluidSustainedInteractionPacingReport {
  const thresholds = { ...sustainedInteractionPacingThresholds, ...options.thresholds };
  const workload: SustainedInteractionWorkload = {
    ...options.workload,
    framePacing: summarizeDisplayPacing(options.workload.samples, options.workload.expectedActivePhysics, thresholds),
  };
  const expectedTier = options.install.installedProfile.selectedTier;
  const observedSampleModes = sampleSet(workload.samples, (sample) => sample.tierSelectionMode ?? "missing");
  const observedRequestedTiers = sampleSet(workload.samples, (sample) => sample.tierSelectionRequestedTier ?? "missing");
  const observedPreferredTiers = sampleSet(workload.samples, (sample) => sample.tierSelectionPreferredTier ?? "missing");
  const observedCanvasTiers = sampleSet(workload.samples, (sample) => sample.tier ?? "missing");
  const observedCapabilityTiers = sampleSet(workload.samples, (sample) => sample.capabilitySelectedTier ?? "missing");
  const observedCapabilityGrids = sampleSet(workload.samples, (sample) => sample.capabilityGrid ?? "missing");
  const scheduledPresetIds = new Set(workload.actions.map((action) => action.presetId));

  const failures = [
    ...(workload.framePacing.pass ? [] : [`${workload.id} display pacing missed the sustained smoothness threshold.`]),
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.adaptiveSource.gate === "G-FG-23" && options.adaptiveSource.pass ? [] : ["adaptive source must be a passing FG-23 report."]),
    ...(options.install.fileName === "fluid-calibration.v1.json" ? [] : [`installed file was ${options.install.fileName}`]),
    ...(options.install.verificationReadMatched ? [] : ["installed calibration profile did not round-trip through desktop storage."]),
    ...(expectedTier === "ultra" ? [] : [`installed profile selected ${expectedTier}, expected ultra.`]),
    ...(options.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent for sustained pacing."] : []),
    ...(options.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent for sustained pacing."] : []),
    ...(options.runtime.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${options.runtime.selection?.mode ?? "missing"}`]),
    ...(options.runtime.selection?.calibratedTier === expectedTier
      ? []
      : [`runtime calibrated tier was ${options.runtime.selection?.calibratedTier ?? "missing"}, expected ${expectedTier}`]),
    ...(options.runtime.selection?.requestedTier === "auto" ? [] : [`runtime requested tier was ${options.runtime.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtime.selectedTier === expectedTier ? [] : [`runtime selected tier was ${options.runtime.selectedTier}, expected ${expectedTier}`]),
    ...(options.runtime.selectedGrid.cellsX === 768 && options.runtime.selectedGrid.cellsY === 432
      ? []
      : [`runtime selected grid was ${options.runtime.selectedGrid.cellsX} x ${options.runtime.selectedGrid.cellsY}`]),
    ...(workload.durationMs >= 12_000 ? [] : [`workload duration was ${workload.durationMs} ms, expected at least 12000 ms.`]),
    ...(workload.id === sustainedWorkloadId ? [] : [`workload id was ${workload.id}, expected ${sustainedWorkloadId}.`]),
    ...(workload.actions.length >= 4 ? [] : [`workload scheduled ${workload.actions.length} actions, expected at least 4.`]),
    ...(scheduledPresetIds.size >= 4 ? [] : [`workload used ${scheduledPresetIds.size} unique presets, expected at least 4.`]),
    ...(workload.telemetry.firedActionCount === workload.actions.length
      ? []
      : [`workload fired ${workload.telemetry.firedActionCount} actions, expected ${workload.actions.length}.`]),
    ...(workload.telemetry.renderer === "webgpu-grid-primary-v1" && workload.telemetry.waterContext === "webgpu" && workload.telemetry.renderMode === "webgpu"
      ? []
      : [`workload did not finish on the primary WebGPU renderer.`]),
    ...(workload.telemetry.timeScale === 1 ? [] : [`workload did not run at normal 1x time scale.`]),
    ...(workload.telemetry.pressureActiveSeen ? [] : [`workload never observed active pressure telemetry.`]),
    ...(workload.telemetry.particlesActiveSeen ? [] : [`workload never observed active particle telemetry.`]),
    ...(workload.telemetry.couplingActiveSeen ? [] : [`workload never observed active object-grid coupling.`]),
    ...(setEquals(observedSampleModes, new Set(["calibrated-auto"]))
      ? []
      : [`samples did not all observe calibrated-auto: ${Array.from(observedSampleModes).join(", ")}`]),
    ...(setEquals(observedRequestedTiers, new Set(["auto"]))
      ? []
      : [`samples did not all observe auto requests: ${Array.from(observedRequestedTiers).join(", ")}`]),
    ...(setEquals(observedPreferredTiers, new Set([expectedTier]))
      ? []
      : [`samples did not all prefer installed tier ${expectedTier}: ${Array.from(observedPreferredTiers).join(", ")}`]),
    ...(setEquals(observedCanvasTiers, new Set([expectedTier]))
      ? []
      : [`samples did not all render installed tier ${expectedTier}: ${Array.from(observedCanvasTiers).join(", ")}`]),
    ...(setEquals(observedCapabilityTiers, new Set([expectedTier]))
      ? []
      : [`samples did not all select installed tier ${expectedTier}: ${Array.from(observedCapabilityTiers).join(", ")}`]),
    ...(setEquals(observedCapabilityGrids, new Set(["768x432"]))
      ? []
      : [`samples did not all use 768x432 capability grid: ${Array.from(observedCapabilityGrids).join(", ")}`]),
  ];

  return {
    adaptiveSource: {
      gate: options.adaptiveSource.gate,
      pass: options.adaptiveSource.pass,
      recommendation: options.adaptiveSource.recommendation,
    },
    failures,
    gate: "G-FG-29",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    install: options.install,
    launchMode: options.launchMode,
    pass: failures.length === 0,
    runtime: options.runtime,
    storage: {
      fileName: options.install.fileName,
      installedTier: expectedTier,
      reusedByMainProcess:
        options.runtime.selection?.mode === "calibrated-auto" &&
        options.runtime.selection.calibratedTier === options.install.installedProfile.selectedTier,
      verificationReadMatched: options.install.verificationReadMatched,
    },
    summary: {
      actionCount: workload.actions.length,
      durationMs: workload.durationMs,
      maxDroppedDebtS: workload.framePacing.maxDroppedDebtS,
      p95FrameMs: workload.framePacing.p95FrameMs,
      p99FrameMs: workload.framePacing.p99FrameMs,
      sampleCount: workload.framePacing.sampleCount,
      stability: workload.framePacing.stability,
      waterFrameDelta: workload.framePacing.waterFrameDelta,
      worstDroppedFrameRatio: workload.framePacing.droppedFrameRatio,
      worstDuplicateWaterFrameRatio: workload.framePacing.duplicateWaterFrameRatio,
    },
    thresholds,
    workload,
  };
}

function sampleSet<T>(samples: InstalledDisplayPacingSample[], mapper: (sample: InstalledDisplayPacingSample) => T): Set<T> {
  return new Set(samples.map(mapper));
}

function setEquals<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}
