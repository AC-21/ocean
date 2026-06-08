import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";

export type FluidPersistedCalibrationGate = "G-FG-24";

export const defaultCalibrationProfileAppVersion = "0.1.0";

export type FluidCalibrationProfile = {
  appVersion: string;
  generatedAt: string;
  pass: boolean;
  schema: "ocean-fluid-calibration-profile-v1";
  selectedTier: FluidGridTierId;
  source: {
    adaptiveGeneratedAt: string;
    adaptiveGate: "G-FG-23";
    selectedTier: FluidGridTierId;
  };
  sourceGate: "G-FG-23";
  summary: {
    maxLiveP95FrameMs: number | null;
    maxUltraGpuP95StepMs: number | null;
    maxUltraToHighGpuP95Ratio: number | null;
  };
};

export type FluidPersistedCalibrationReport = {
  adaptiveSource: Pick<FluidAdaptiveTierReport, "gate" | "pass" | "recommendation">;
  failures: string[];
  gate: FluidPersistedCalibrationGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  profile: FluidCalibrationProfile;
  runtimeProbe: FluidAdaptiveTierRuntimeProbe;
  storage: {
    envCalibratedTierPresent: boolean;
    fileName: string;
    profileSelectedTier: FluidGridTierId;
    readByMainProcess: boolean;
  };
};

export type FluidPersistedCalibrationOptions = {
  adaptiveSource: FluidAdaptiveTierReport;
  envCalibratedTierPresent: boolean;
  fileName: string;
  generatedAt?: string;
  launchMode: FluidPersistedCalibrationReport["launchMode"];
  profile: FluidCalibrationProfile;
  runtimeProbe: FluidAdaptiveTierRuntimeProbe;
};

export type FluidCalibrationProfileValidationOptions = {
  expectedAppVersion?: string;
};

export function calibrationProfileForAdaptiveReport(
  adaptiveReport: FluidAdaptiveTierReport,
  generatedAt = new Date().toISOString(),
  options: { appVersion?: string } = {}
): FluidCalibrationProfile {
  return {
    appVersion: options.appVersion ?? defaultCalibrationProfileAppVersion,
    generatedAt,
    pass: adaptiveReport.pass,
    schema: "ocean-fluid-calibration-profile-v1",
    selectedTier: adaptiveReport.recommendation.selectedTier,
    source: {
      adaptiveGeneratedAt: adaptiveReport.generatedAt,
      adaptiveGate: "G-FG-23",
      selectedTier: adaptiveReport.recommendation.selectedTier,
    },
    sourceGate: "G-FG-23",
    summary: {
      maxLiveP95FrameMs: adaptiveReport.recommendation.summary.maxLiveP95FrameMs,
      maxUltraGpuP95StepMs: adaptiveReport.recommendation.summary.maxUltraGpuP95StepMs,
      maxUltraToHighGpuP95Ratio: adaptiveReport.recommendation.summary.maxUltraToHighGpuP95Ratio,
    },
  };
}

export function validateFluidCalibrationProfile(
  profile: FluidCalibrationProfile,
  options: FluidCalibrationProfileValidationOptions = {}
): string[] {
  return [
    ...(profile.schema === "ocean-fluid-calibration-profile-v1" ? [] : ["profile schema was invalid."]),
    ...(profile.pass === true ? [] : ["profile must be marked passing."]),
    ...(profile.sourceGate === "G-FG-23" ? [] : ["profile must come from FG-23 evidence."]),
    ...(profile.source?.adaptiveGate === "G-FG-23" ? [] : ["profile source must record adaptive gate G-FG-23."]),
    ...(typeof profile.source?.adaptiveGeneratedAt === "string" && profile.source.adaptiveGeneratedAt.length > 0
      ? []
      : ["profile source must record adaptive evidence timestamp."]),
    ...(profile.source?.selectedTier === profile.selectedTier
      ? []
      : [`profile source tier was ${profile.source?.selectedTier ?? "missing"}, expected ${profile.selectedTier}.`]),
    ...(profile.selectedTier === "low" || profile.selectedTier === "standard" || profile.selectedTier === "high" || profile.selectedTier === "ultra"
      ? []
      : [`profile selected invalid tier ${String(profile.selectedTier)}.`]),
    ...(typeof profile.appVersion === "string" && profile.appVersion.length > 0 ? [] : ["profile must record appVersion."]),
    ...(options.expectedAppVersion === undefined || profile.appVersion === options.expectedAppVersion
      ? []
      : [`profile appVersion ${profile.appVersion} did not match runtime ${options.expectedAppVersion}.`]),
    ...(profile.selectedTier === "ultra" ? [] : [`profile selected ${profile.selectedTier}, expected ultra.`]),
    ...(profile.summary.maxLiveP95FrameMs !== null ? [] : ["profile is missing live frame-pacing summary."]),
    ...(profile.summary.maxUltraGpuP95StepMs !== null ? [] : ["profile is missing ultra GPU timing summary."]),
    ...(profile.summary.maxUltraToHighGpuP95Ratio !== null ? [] : ["profile is missing ultra/high timing ratio summary."]),
  ];
}

export function createFluidPersistedCalibrationReport(options: FluidPersistedCalibrationOptions): FluidPersistedCalibrationReport {
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.adaptiveSource.gate === "G-FG-23" && options.adaptiveSource.pass ? [] : ["adaptive source must be a passing FG-23 report."]),
    ...validateFluidCalibrationProfile(options.profile),
    ...(options.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent for the persisted calibration gate."] : []),
    ...(options.runtimeProbe.launchMode === "packaged-app" ? [] : [`runtime launch mode was ${options.runtimeProbe.launchMode}`]),
    ...(options.runtimeProbe.requestedTier === "auto" ? [] : [`runtime requested tier was ${options.runtimeProbe.requestedTier}`]),
    ...(options.runtimeProbe.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${options.runtimeProbe.selection?.mode ?? "missing"}`]),
    ...(options.runtimeProbe.selection?.calibratedTier === options.profile.selectedTier
      ? []
      : [`runtime calibrated tier was ${options.runtimeProbe.selection?.calibratedTier ?? "missing"}, expected ${options.profile.selectedTier}`]),
    ...(options.runtimeProbe.selectedTier === options.profile.selectedTier
      ? []
      : [`runtime selected tier was ${options.runtimeProbe.selectedTier}, expected ${options.profile.selectedTier}`]),
    ...(options.runtimeProbe.selectedGrid.cellsX === 768 && options.runtimeProbe.selectedGrid.cellsY === 432
      ? []
      : [`runtime grid was ${options.runtimeProbe.selectedGrid.cellsX} x ${options.runtimeProbe.selectedGrid.cellsY}`]),
    ...(options.runtimeProbe.renderer === "webgpu-grid-primary-v1" ? [] : [`runtime renderer was ${options.runtimeProbe.renderer ?? "missing"}`]),
    ...(options.runtimeProbe.waterContext === "webgpu" ? [] : [`runtime water context was ${options.runtimeProbe.waterContext ?? "missing"}`]),
    ...(options.runtimeProbe.grid === "768x432" ? [] : [`canvas grid was ${options.runtimeProbe.grid ?? "missing"}`]),
    ...(options.runtimeProbe.waterFrames >= 12 ? [] : [`runtime only rendered ${options.runtimeProbe.waterFrames} water frames`]),
  ];

  return {
    adaptiveSource: {
      gate: options.adaptiveSource.gate,
      pass: options.adaptiveSource.pass,
      recommendation: options.adaptiveSource.recommendation,
    },
    failures,
    gate: "G-FG-24",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    profile: options.profile,
    runtimeProbe: options.runtimeProbe,
    storage: {
      envCalibratedTierPresent: options.envCalibratedTierPresent,
      fileName: options.fileName,
      profileSelectedTier: options.profile.selectedTier,
      readByMainProcess: options.runtimeProbe.selection?.mode === "calibrated-auto" && options.runtimeProbe.selection.calibratedTier === options.profile.selectedTier,
    },
  };
}
