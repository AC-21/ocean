import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import type { FluidCalibrationProfile } from "./fluidPersistedCalibration";
import { validateFluidCalibrationProfile } from "./fluidPersistedCalibration";

export type FluidCalibrationFreshnessGate = "G-FG-27";

export type FluidCalibrationFreshnessReport = {
  adaptiveSource: Pick<FluidAdaptiveTierReport, "gate" | "pass" | "recommendation">;
  expectedAppVersion: string;
  failures: string[];
  gate: FluidCalibrationFreshnessGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  profiles: {
    stale: {
      appVersion: string;
      selectedTier: string;
      validationFailures: string[];
    };
    valid: {
      appVersion: string;
      selectedTier: string;
      validationFailures: string[];
    };
  };
  runtime: {
    envCalibratedTierPresent: boolean;
    envRequestedTierPresent: boolean;
    staleProfileProbe: FluidAdaptiveTierRuntimeProbe;
    validProfileProbe: FluidAdaptiveTierRuntimeProbe;
  };
  storage: {
    fileName: string;
    staleProfileRejectedByMainProcess: boolean;
    validProfileReusedByMainProcess: boolean;
  };
};

export type FluidCalibrationFreshnessOptions = {
  adaptiveSource: FluidAdaptiveTierReport;
  envCalibratedTierPresent: boolean;
  envRequestedTierPresent: boolean;
  expectedAppVersion: string;
  fileName: string;
  generatedAt?: string;
  launchMode: FluidCalibrationFreshnessReport["launchMode"];
  staleProfile: FluidCalibrationProfile;
  staleProfileProbe: FluidAdaptiveTierRuntimeProbe;
  validProfile: FluidCalibrationProfile;
  validProfileProbe: FluidAdaptiveTierRuntimeProbe;
};

export function createFluidCalibrationFreshnessReport(
  options: FluidCalibrationFreshnessOptions
): FluidCalibrationFreshnessReport {
  const validProfileFailures = validateFluidCalibrationProfile(options.validProfile, {
    expectedAppVersion: options.expectedAppVersion,
  });
  const staleProfileFailures = validateFluidCalibrationProfile(options.staleProfile, {
    expectedAppVersion: options.expectedAppVersion,
  });
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.adaptiveSource.gate === "G-FG-23" && options.adaptiveSource.pass ? [] : ["adaptive source must be a passing FG-23 report."]),
    ...(options.fileName === "fluid-calibration.v1.json" ? [] : [`profile file was ${options.fileName}`]),
    ...(validProfileFailures.length === 0 ? [] : validProfileFailures.map((failure) => `valid profile: ${failure}`)),
    ...(staleProfileFailures.some((failure) => failure.includes("appVersion")) ? [] : ["stale profile must fail appVersion validation."]),
    ...(options.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent for freshness evidence."] : []),
    ...(options.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent for freshness evidence."] : []),
    ...validRuntimeFailures(options.validProfileProbe, options.validProfile.selectedTier),
    ...staleRuntimeFailures(options.staleProfileProbe),
  ];

  return {
    adaptiveSource: {
      gate: options.adaptiveSource.gate,
      pass: options.adaptiveSource.pass,
      recommendation: options.adaptiveSource.recommendation,
    },
    expectedAppVersion: options.expectedAppVersion,
    failures,
    gate: "G-FG-27",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    profiles: {
      stale: {
        appVersion: options.staleProfile.appVersion,
        selectedTier: options.staleProfile.selectedTier,
        validationFailures: staleProfileFailures,
      },
      valid: {
        appVersion: options.validProfile.appVersion,
        selectedTier: options.validProfile.selectedTier,
        validationFailures: validProfileFailures,
      },
    },
    runtime: {
      envCalibratedTierPresent: options.envCalibratedTierPresent,
      envRequestedTierPresent: options.envRequestedTierPresent,
      staleProfileProbe: options.staleProfileProbe,
      validProfileProbe: options.validProfileProbe,
    },
    storage: {
      fileName: options.fileName,
      staleProfileRejectedByMainProcess: options.staleProfileProbe.selection?.mode === "default-high",
      validProfileReusedByMainProcess:
        options.validProfileProbe.selection?.mode === "calibrated-auto" &&
        options.validProfileProbe.selection.calibratedTier === options.validProfile.selectedTier,
    },
  };
}

function validRuntimeFailures(probe: FluidAdaptiveTierRuntimeProbe, expectedTier: string): string[] {
  return [
    ...(probe.launchMode === "packaged-app" ? [] : [`valid profile launch mode was ${probe.launchMode}`]),
    ...(probe.requestedTier === "auto" ? [] : [`valid profile requested tier was ${probe.requestedTier}`]),
    ...(probe.selection?.mode === "calibrated-auto" ? [] : [`valid profile selection mode was ${probe.selection?.mode ?? "missing"}`]),
    ...(probe.selection?.calibratedTier === expectedTier
      ? []
      : [`valid profile calibrated tier was ${probe.selection?.calibratedTier ?? "missing"}, expected ${expectedTier}`]),
    ...(probe.selectedTier === expectedTier ? [] : [`valid profile selected tier was ${probe.selectedTier}, expected ${expectedTier}`]),
    ...(probe.selectedGrid.cellsX === 768 && probe.selectedGrid.cellsY === 432
      ? []
      : [`valid profile grid was ${probe.selectedGrid.cellsX} x ${probe.selectedGrid.cellsY}`]),
    ...(probe.renderer === "webgpu-grid-primary-v1" ? [] : [`valid profile renderer was ${probe.renderer ?? "missing"}`]),
    ...(probe.waterContext === "webgpu" ? [] : [`valid profile water context was ${probe.waterContext ?? "missing"}`]),
    ...(probe.waterFrames >= 12 ? [] : [`valid profile only rendered ${probe.waterFrames} water frames`]),
  ];
}

function staleRuntimeFailures(probe: FluidAdaptiveTierRuntimeProbe): string[] {
  return [
    ...(probe.launchMode === "packaged-app" ? [] : [`stale profile launch mode was ${probe.launchMode}`]),
    ...(probe.requestedTier === "default" ? [] : [`stale profile requested tier was ${probe.requestedTier}`]),
    ...(probe.selection?.mode === "default-high" ? [] : [`stale profile selection mode was ${probe.selection?.mode ?? "missing"}`]),
    ...(probe.selectedTier === "high" ? [] : [`stale profile selected tier was ${probe.selectedTier}, expected high fallback`]),
    ...(probe.selectedGrid.cellsX === 512 && probe.selectedGrid.cellsY === 288
      ? []
      : [`stale profile grid was ${probe.selectedGrid.cellsX} x ${probe.selectedGrid.cellsY}`]),
    ...(probe.renderer === "webgpu-grid-primary-v1" ? [] : [`stale profile renderer was ${probe.renderer ?? "missing"}`]),
    ...(probe.waterContext === "webgpu" ? [] : [`stale profile water context was ${probe.waterContext ?? "missing"}`]),
    ...(probe.waterFrames >= 12 ? [] : [`stale profile only rendered ${probe.waterFrames} water frames`]),
  ];
}
