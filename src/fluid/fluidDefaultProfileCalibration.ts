import { validateFluidCalibrationProfile, type FluidCalibrationProfile } from "./fluidPersistedCalibration";

export type FluidDefaultProfileCalibrationGate = "G-FG-34";

export type FluidDefaultProfileRuntimeProbe = {
  capabilitySelectedTier: string | null;
  grid: string | null;
  launchMode: "desktop-launcher";
  pixelProbe: {
    averageLuma: number;
    colorBuckets: number;
    status: string;
    variety: string;
  };
  renderer: string | null;
  selectedGrid: {
    cellsX: number;
    cellsY: number;
  };
  selectedTier: string | null;
  selection: {
    calibratedTier?: string;
    mode?: string;
    preferredTier?: string;
    requestedTier?: string;
  } | null;
  waterContext: string | null;
  waterFrames: number;
};

export type FluidDefaultProfileInstall = {
  defaultUserDataPath: string;
  fileName: string;
  installedProfile: FluidCalibrationProfile;
  persistedRawBytes: number;
  preExistingProfileBytes: number;
  storageBasePath: string;
  verificationReadMatched: boolean;
};

export type FluidDefaultProfileCalibrationReport = {
  failures: string[];
  gate: FluidDefaultProfileCalibrationGate;
  generatedAt: string;
  install: FluidDefaultProfileInstall;
  launcher: {
    executablePath: string;
    path: string;
    resolvesToInstalledBundle: boolean;
    targetPath: string | null;
  };
  pass: boolean;
  runtimeProbe: FluidDefaultProfileRuntimeProbe;
  storage: {
    envCalibratedTierPresent: boolean;
    envRequestedTierPresent: boolean;
    installedTier: string;
    readByMainProcess: boolean;
  };
};

export type FluidDefaultProfileCalibrationOptions = Omit<FluidDefaultProfileCalibrationReport, "failures" | "gate" | "generatedAt" | "pass"> & {
  generatedAt?: string;
};

export function createFluidDefaultProfileCalibrationReport(
  options: FluidDefaultProfileCalibrationOptions
): FluidDefaultProfileCalibrationReport {
  const expectedTier = options.install.installedProfile.selectedTier;
  const failures = [
    ...(options.launcher.resolvesToInstalledBundle ? [] : ["Desktop launcher does not resolve to the installed app bundle"]),
    ...(options.install.defaultUserDataPath.includes("Ocean Impact Lab") ? [] : [`default userData path was ${options.install.defaultUserDataPath}`]),
    ...(options.install.storageBasePath.endsWith("Ocean Impact Lab/harborline-game")
      ? []
      : [`storage base path was not the real default profile storage: ${options.install.storageBasePath}`]),
    ...(options.install.fileName === "fluid-calibration.v1.json" ? [] : [`installed file was ${options.install.fileName}`]),
    ...(options.install.persistedRawBytes > 0 ? [] : ["installed calibration profile was empty"]),
    ...(options.install.verificationReadMatched ? [] : ["installed calibration profile did not round-trip through default desktop storage"]),
    ...validateFluidCalibrationProfile(options.install.installedProfile).map((failure) => `default profile ${failure}`),
    ...(options.storage.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent for default-profile calibration"] : []),
    ...(options.storage.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent for default-profile calibration"] : []),
    ...(options.storage.readByMainProcess ? [] : ["main process did not read the default calibration profile"]),
    ...(options.runtimeProbe.launchMode === "desktop-launcher" ? [] : [`runtime launch mode was ${options.runtimeProbe.launchMode}`]),
    ...(options.runtimeProbe.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${options.runtimeProbe.selection?.mode ?? "missing"}`]),
    ...(options.runtimeProbe.selection?.requestedTier === "auto" ? [] : [`runtime requested tier was ${options.runtimeProbe.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtimeProbe.selection?.calibratedTier === expectedTier
      ? []
      : [`runtime calibrated tier was ${options.runtimeProbe.selection?.calibratedTier ?? "missing"}, expected ${expectedTier}`]),
    ...(options.runtimeProbe.selection?.preferredTier === expectedTier
      ? []
      : [`runtime preferred tier was ${options.runtimeProbe.selection?.preferredTier ?? "missing"}, expected ${expectedTier}`]),
    ...(options.runtimeProbe.selectedTier === expectedTier ? [] : [`runtime selected tier was ${options.runtimeProbe.selectedTier ?? "missing"}`]),
    ...(options.runtimeProbe.capabilitySelectedTier === expectedTier
      ? []
      : [`capability selected tier was ${options.runtimeProbe.capabilitySelectedTier ?? "missing"}`]),
    ...(options.runtimeProbe.selectedGrid.cellsX === 768 && options.runtimeProbe.selectedGrid.cellsY === 432
      ? []
      : [`runtime grid was ${options.runtimeProbe.selectedGrid.cellsX} x ${options.runtimeProbe.selectedGrid.cellsY}`]),
    ...(options.runtimeProbe.grid === "768x432" ? [] : [`canvas grid was ${options.runtimeProbe.grid ?? "missing"}`]),
    ...(options.runtimeProbe.renderer === "webgpu-grid-primary-v1" ? [] : [`runtime renderer was ${options.runtimeProbe.renderer ?? "missing"}`]),
    ...(options.runtimeProbe.waterContext === "webgpu" ? [] : [`runtime water context was ${options.runtimeProbe.waterContext ?? "missing"}`]),
    ...(options.runtimeProbe.waterFrames >= 12 ? [] : [`runtime only rendered ${options.runtimeProbe.waterFrames} water frames`]),
    ...(options.runtimeProbe.pixelProbe.status === "nonblank" ? [] : [`runtime pixel probe was ${options.runtimeProbe.pixelProbe.status}`]),
    ...(options.runtimeProbe.pixelProbe.variety === "varied" ? [] : [`runtime pixel variety was ${options.runtimeProbe.pixelProbe.variety}`]),
    ...(options.runtimeProbe.pixelProbe.colorBuckets >= 18 ? [] : [`runtime color buckets were ${options.runtimeProbe.pixelProbe.colorBuckets}`]),
  ];

  return {
    ...options,
    failures,
    gate: "G-FG-34",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
  };
}
