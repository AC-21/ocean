import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import type { FluidCalibrationProfile } from "./fluidPersistedCalibration";
import { validateFluidCalibrationProfile } from "./fluidPersistedCalibration";
import type { FluidCapabilityReport } from "./webgpuCapability";
import { fluidCapabilityFingerprintForReport } from "./webgpuCapability";

export type FluidCalibrationProvenanceGate = "G-FG-28";

export type FluidCalibrationProvenanceReport = {
  adaptiveSource: Pick<FluidAdaptiveTierReport, "gate" | "pass" | "recommendation">;
  capabilitySource: Pick<FluidCapabilityReport, "adapterInfo" | "backend" | "features" | "limits" | "selectedTier" | "status"> & {
    fingerprint: string;
  };
  expectedAppVersion: string;
  failures: string[];
  gate: FluidCalibrationProvenanceGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  profiles: {
    mismatched: {
      adapterInfo: string | null;
      fingerprint: string;
      selectedTier: string;
      validationFailures: string[];
    };
    tampered: {
      adapterInfo: string | null;
      fingerprint: string;
      selectedTier: string;
      validationFailures: string[];
    };
    valid: {
      adapterInfo: string | null;
      fingerprint: string;
      selectedTier: string;
      validationFailures: string[];
    };
  };
  runtime: {
    envCalibratedTierPresent: boolean;
    envRequestedTierPresent: boolean;
    mismatchedProfileProbe: FluidAdaptiveTierRuntimeProbe;
    tamperedProfileProbe: FluidAdaptiveTierRuntimeProbe;
    validProfileProbe: FluidAdaptiveTierRuntimeProbe;
  };
  storage: {
    fileName: string;
    mismatchedProfileDowngradedByRenderer: boolean;
    tamperedProfileRejectedByMainProcess: boolean;
    validProfileReusedByMainProcess: boolean;
  };
};

export type FluidCalibrationProvenanceOptions = {
  adaptiveSource: FluidAdaptiveTierReport;
  capabilitySource: FluidCapabilityReport;
  envCalibratedTierPresent: boolean;
  envRequestedTierPresent: boolean;
  expectedAppVersion: string;
  fileName: string;
  generatedAt?: string;
  launchMode: FluidCalibrationProvenanceReport["launchMode"];
  mismatchedProfile: FluidCalibrationProfile;
  mismatchedProfileProbe: FluidAdaptiveTierRuntimeProbe;
  tamperedProfile: FluidCalibrationProfile;
  tamperedProfileProbe: FluidAdaptiveTierRuntimeProbe;
  validProfile: FluidCalibrationProfile;
  validProfileProbe: FluidAdaptiveTierRuntimeProbe;
};

export function createFluidCalibrationProvenanceReport(
  options: FluidCalibrationProvenanceOptions
): FluidCalibrationProvenanceReport {
  const validProfileFailures = validateFluidCalibrationProfile(options.validProfile, {
    expectedAppVersion: options.expectedAppVersion,
  });
  const mismatchedProfileFailures = validateFluidCalibrationProfile(options.mismatchedProfile, {
    expectedAppVersion: options.expectedAppVersion,
  });
  const tamperedProfileFailures = validateFluidCalibrationProfile(options.tamperedProfile, {
    expectedAppVersion: options.expectedAppVersion,
  });
  const capabilityFingerprint = fluidCapabilityFingerprintForReport(options.capabilitySource);
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.adaptiveSource.gate === "G-FG-23" && options.adaptiveSource.pass ? [] : ["adaptive source must be a passing FG-23 report."]),
    ...(options.capabilitySource.status === "webgpu-ready" && options.capabilitySource.backend === "webgpu-compute"
      ? []
      : ["capability source must be a passing WebGPU capability report."]),
    ...(options.fileName === "fluid-calibration.v1.json" ? [] : [`profile file was ${options.fileName}`]),
    ...(validProfileFailures.length === 0 ? [] : validProfileFailures.map((failure) => `valid profile: ${failure}`)),
    ...(mismatchedProfileFailures.length === 0 ? [] : mismatchedProfileFailures.map((failure) => `mismatched profile: ${failure}`)),
    ...(tamperedProfileFailures.some((failure) => failure.includes("capability fingerprint"))
      ? []
      : ["tampered profile must fail capability fingerprint validation."]),
    ...(options.validProfile.capability.fingerprint === capabilityFingerprint ? [] : ["valid profile must match FG-01 capability fingerprint."]),
    ...(options.mismatchedProfile.capability.fingerprint !== capabilityFingerprint
      ? []
      : ["mismatched profile must carry a different capability fingerprint."]),
    ...(options.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent for provenance evidence."] : []),
    ...(options.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent for provenance evidence."] : []),
    ...validRuntimeFailures(options.validProfileProbe, options.validProfile.selectedTier),
    ...mismatchedRuntimeFailures(options.mismatchedProfileProbe),
    ...tamperedRuntimeFailures(options.tamperedProfileProbe),
  ];

  return {
    adaptiveSource: {
      gate: options.adaptiveSource.gate,
      pass: options.adaptiveSource.pass,
      recommendation: options.adaptiveSource.recommendation,
    },
    capabilitySource: {
      adapterInfo: options.capabilitySource.adapterInfo,
      backend: options.capabilitySource.backend,
      features: options.capabilitySource.features,
      fingerprint: capabilityFingerprint,
      limits: options.capabilitySource.limits,
      selectedTier: options.capabilitySource.selectedTier,
      status: options.capabilitySource.status,
    },
    expectedAppVersion: options.expectedAppVersion,
    failures,
    gate: "G-FG-28",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    profiles: {
      mismatched: profileSummary(options.mismatchedProfile, mismatchedProfileFailures),
      tampered: profileSummary(options.tamperedProfile, tamperedProfileFailures),
      valid: profileSummary(options.validProfile, validProfileFailures),
    },
    runtime: {
      envCalibratedTierPresent: options.envCalibratedTierPresent,
      envRequestedTierPresent: options.envRequestedTierPresent,
      mismatchedProfileProbe: options.mismatchedProfileProbe,
      tamperedProfileProbe: options.tamperedProfileProbe,
      validProfileProbe: options.validProfileProbe,
    },
    storage: {
      fileName: options.fileName,
      mismatchedProfileDowngradedByRenderer: options.mismatchedProfileProbe.selection?.mode === "calibration-provenance-fallback-high",
      tamperedProfileRejectedByMainProcess: options.tamperedProfileProbe.selection?.mode === "default-high",
      validProfileReusedByMainProcess:
        options.validProfileProbe.selection?.mode === "calibrated-auto" &&
        options.validProfileProbe.selection.calibratedTier === options.validProfile.selectedTier,
    },
  };
}

function profileSummary(profile: FluidCalibrationProfile, validationFailures: string[]) {
  return {
    adapterInfo: profile.capability.adapterInfo,
    fingerprint: profile.capability.fingerprint,
    selectedTier: profile.selectedTier,
    validationFailures,
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

function mismatchedRuntimeFailures(probe: FluidAdaptiveTierRuntimeProbe): string[] {
  return [
    ...(probe.launchMode === "packaged-app" ? [] : [`mismatched profile launch mode was ${probe.launchMode}`]),
    ...(probe.requestedTier === "auto" ? [] : [`mismatched profile requested tier was ${probe.requestedTier}`]),
    ...(probe.selection?.mode === "calibration-provenance-fallback-high"
      ? []
      : [`mismatched profile selection mode was ${probe.selection?.mode ?? "missing"}`]),
    ...(probe.selectedTier === "high" ? [] : [`mismatched profile selected tier was ${probe.selectedTier}, expected high fallback`]),
    ...(probe.selectedGrid.cellsX === 512 && probe.selectedGrid.cellsY === 288
      ? []
      : [`mismatched profile grid was ${probe.selectedGrid.cellsX} x ${probe.selectedGrid.cellsY}`]),
    ...(probe.renderer === "webgpu-grid-primary-v1" ? [] : [`mismatched profile renderer was ${probe.renderer ?? "missing"}`]),
    ...(probe.waterContext === "webgpu" ? [] : [`mismatched profile water context was ${probe.waterContext ?? "missing"}`]),
    ...(probe.waterFrames >= 12 ? [] : [`mismatched profile only rendered ${probe.waterFrames} water frames`]),
  ];
}

function tamperedRuntimeFailures(probe: FluidAdaptiveTierRuntimeProbe): string[] {
  return [
    ...(probe.launchMode === "packaged-app" ? [] : [`tampered profile launch mode was ${probe.launchMode}`]),
    ...(probe.requestedTier === "default" ? [] : [`tampered profile requested tier was ${probe.requestedTier}`]),
    ...(probe.selection?.mode === "default-high" ? [] : [`tampered profile selection mode was ${probe.selection?.mode ?? "missing"}`]),
    ...(probe.selectedTier === "high" ? [] : [`tampered profile selected tier was ${probe.selectedTier}, expected high fallback`]),
    ...(probe.selectedGrid.cellsX === 512 && probe.selectedGrid.cellsY === 288
      ? []
      : [`tampered profile grid was ${probe.selectedGrid.cellsX} x ${probe.selectedGrid.cellsY}`]),
    ...(probe.renderer === "webgpu-grid-primary-v1" ? [] : [`tampered profile renderer was ${probe.renderer ?? "missing"}`]),
    ...(probe.waterContext === "webgpu" ? [] : [`tampered profile water context was ${probe.waterContext ?? "missing"}`]),
    ...(probe.waterFrames >= 12 ? [] : [`tampered profile only rendered ${probe.waterFrames} water frames`]),
  ];
}
