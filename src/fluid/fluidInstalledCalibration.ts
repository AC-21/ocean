import type { FluidAdaptiveTierReport, FluidAdaptiveTierRuntimeProbe } from "./fluidAdaptiveTier";
import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidCapabilityReport } from "./webgpuCapability";
import {
  calibrationProfileForAdaptiveReport,
  validateFluidCalibrationProfile,
  type FluidCalibrationProfile,
} from "./fluidPersistedCalibration";

export type FluidInstalledCalibrationGate = "G-FG-25";

export type FluidCalibrationTextStorage = {
  readText: (fileName: string) => Promise<string | null>;
  writeText: (fileName: string, value: string) => Promise<void>;
};

export type FluidCalibrationInstallReceipt = {
  fileName: string;
  installedAt: string;
  installedProfile: FluidCalibrationProfile;
  persistedRawBytes: number;
  storageBasePath: string;
  verificationReadMatched: boolean;
};

export type FluidInstalledCalibrationReport = {
  adaptiveSource: Pick<FluidAdaptiveTierReport, "gate" | "pass" | "recommendation">;
  failures: string[];
  gate: FluidInstalledCalibrationGate;
  generatedAt: string;
  install: FluidCalibrationInstallReceipt;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  relaunchProbe: FluidAdaptiveTierRuntimeProbe;
  runtimeProbe: FluidAdaptiveTierRuntimeProbe;
  storage: {
    envCalibratedTierPresent: boolean;
    envRequestedTierPresent: boolean;
    fileName: string;
    installedTier: FluidGridTierId;
    reusedByMainProcess: boolean;
  };
};

export type InstallFluidCalibrationProfileOptions = {
  adaptiveSource: FluidAdaptiveTierReport;
  appVersion?: string;
  capabilitySource: FluidCapabilityReport;
  fileName: string;
  generatedAt?: string;
  storage: FluidCalibrationTextStorage;
  storageBasePath: string;
};

export type FluidInstalledCalibrationOptions = {
  adaptiveSource: FluidAdaptiveTierReport;
  envCalibratedTierPresent: boolean;
  envRequestedTierPresent: boolean;
  generatedAt?: string;
  install: FluidCalibrationInstallReceipt;
  launchMode: FluidInstalledCalibrationReport["launchMode"];
  relaunchProbe: FluidAdaptiveTierRuntimeProbe;
  runtimeProbe: FluidAdaptiveTierRuntimeProbe;
};

export async function installFluidCalibrationProfile(
  options: InstallFluidCalibrationProfileOptions
): Promise<FluidCalibrationInstallReceipt> {
  const installedAt = options.generatedAt ?? new Date().toISOString();
  const installedProfile = calibrationProfileForAdaptiveReport(options.adaptiveSource, installedAt, {
    appVersion: options.appVersion,
    capabilityReport: options.capabilitySource,
  });
  const serializedProfile = `${JSON.stringify(installedProfile, null, 2)}\n`;
  await options.storage.writeText(options.fileName, serializedProfile);
  const persistedRaw = await options.storage.readText(options.fileName);

  return {
    fileName: options.fileName,
    installedAt,
    installedProfile,
    persistedRawBytes: Buffer.byteLength(persistedRaw ?? "", "utf8"),
    storageBasePath: options.storageBasePath,
    verificationReadMatched: persistedRaw === serializedProfile,
  };
}

export function createFluidInstalledCalibrationReport(options: FluidInstalledCalibrationOptions): FluidInstalledCalibrationReport {
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.adaptiveSource.gate === "G-FG-23" && options.adaptiveSource.pass ? [] : ["adaptive source must be a passing FG-23 report."]),
    ...(options.install.fileName === "fluid-calibration.v1.json" ? [] : [`installed file was ${options.install.fileName}`]),
    ...(options.install.storageBasePath.endsWith("harborline-game") ? [] : [`storage base path was not the app-owned desktop storage directory: ${options.install.storageBasePath}`]),
    ...(options.install.verificationReadMatched ? [] : ["installed calibration profile did not round-trip through desktop storage."]),
    ...(options.install.persistedRawBytes > 0 ? [] : ["installed calibration profile was empty."]),
    ...profileFailures(options.install.installedProfile),
    ...(options.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent for installed-profile reuse."] : []),
    ...(options.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent for installed-profile reuse."] : []),
    ...runtimeProbeFailures("runtime", options.runtimeProbe, options.install.installedProfile.selectedTier),
    ...runtimeProbeFailures("relaunch", options.relaunchProbe, options.install.installedProfile.selectedTier),
  ];

  return {
    adaptiveSource: {
      gate: options.adaptiveSource.gate,
      pass: options.adaptiveSource.pass,
      recommendation: options.adaptiveSource.recommendation,
    },
    failures,
    gate: "G-FG-25",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    install: options.install,
    launchMode: options.launchMode,
    pass: failures.length === 0,
    relaunchProbe: options.relaunchProbe,
    runtimeProbe: options.runtimeProbe,
    storage: {
      envCalibratedTierPresent: options.envCalibratedTierPresent,
      envRequestedTierPresent: options.envRequestedTierPresent,
      fileName: options.install.fileName,
      installedTier: options.install.installedProfile.selectedTier,
      reusedByMainProcess:
        options.runtimeProbe.selection?.mode === "calibrated-auto" &&
        options.relaunchProbe.selection?.mode === "calibrated-auto" &&
        options.runtimeProbe.selection.calibratedTier === options.install.installedProfile.selectedTier &&
        options.relaunchProbe.selection.calibratedTier === options.install.installedProfile.selectedTier,
    },
  };
}

function profileFailures(profile: FluidCalibrationProfile): string[] {
  return validateFluidCalibrationProfile(profile).map((failure) => `installed ${failure}`);
}

function runtimeProbeFailures(label: string, probe: FluidAdaptiveTierRuntimeProbe, expectedTier: FluidGridTierId): string[] {
  return [
    ...(probe.launchMode === "packaged-app" ? [] : [`${label} launch mode was ${probe.launchMode}`]),
    ...(probe.requestedTier === "auto" ? [] : [`${label} requested tier was ${probe.requestedTier}`]),
    ...(probe.selection?.mode === "calibrated-auto" ? [] : [`${label} selection mode was ${probe.selection?.mode ?? "missing"}`]),
    ...(probe.selection?.calibratedTier === expectedTier ? [] : [`${label} calibrated tier was ${probe.selection?.calibratedTier ?? "missing"}, expected ${expectedTier}`]),
    ...(probe.selection?.preferredTier === expectedTier ? [] : [`${label} preferred tier was ${probe.selection?.preferredTier ?? "missing"}, expected ${expectedTier}`]),
    ...(probe.selectedTier === expectedTier ? [] : [`${label} selected tier was ${probe.selectedTier}, expected ${expectedTier}`]),
    ...(probe.selectedGrid.cellsX === 768 && probe.selectedGrid.cellsY === 432
      ? []
      : [`${label} grid was ${probe.selectedGrid.cellsX} x ${probe.selectedGrid.cellsY}`]),
    ...(probe.renderer === "webgpu-grid-primary-v1" ? [] : [`${label} renderer was ${probe.renderer ?? "missing"}`]),
    ...(probe.waterContext === "webgpu" ? [] : [`${label} water context was ${probe.waterContext ?? "missing"}`]),
    ...(probe.grid === "768x432" ? [] : [`${label} canvas grid was ${probe.grid ?? "missing"}`]),
    ...(probe.waterFrames >= 12 ? [] : [`${label} only rendered ${probe.waterFrames} water frames`]),
  ];
}
