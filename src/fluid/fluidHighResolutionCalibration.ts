import type { FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import type { FluidCalibrationProfile } from "./fluidPersistedCalibration";

export type FluidHighResolutionCalibrationGate = "G-FG-41";

export type FluidHighResolutionCalibrationRuntimeProbe = {
  capabilityGrid: {
    cellsX: number;
    cellsY: number;
  };
  grid: string | null;
  renderer: string | null;
  runtimeGridOverride: {
    cellsX: number;
    cellsY: number;
  } | null;
  selectedTier: string | null;
  selection: FluidRuntimeTierSelection | null;
  tier: string | null;
  waterContext: string | null;
  waterFrames: number;
};

export type FluidHighResolutionCalibrationReport = {
  failures: string[];
  gate: FluidHighResolutionCalibrationGate;
  generatedAt: string;
  launchEnv: {
    envCalibratedTierPresent: boolean;
    envExperimentalGridPresent: boolean;
    envRequestedTierPresent: boolean;
    envUserDataOverridePresent: boolean;
  };
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  profile: {
    pass: boolean;
    runtimeGrid: FluidCalibrationProfile["runtimeGrid"];
    schema: FluidCalibrationProfile["schema"];
    selectedTier: FluidCalibrationProfile["selectedTier"];
    sourceGate: FluidCalibrationProfile["sourceGate"];
  };
  runtimeProbe: FluidHighResolutionCalibrationRuntimeProbe;
  sourceEvidence: {
    caseCount: number;
    comparisonCount: number;
    gate: string;
    liveGrid: string;
    pass: boolean;
  };
  storage: {
    fileName: string;
    persistedRawBytes: number;
    readByMainProcess: boolean;
    storageBasePath: string;
    verificationReadMatched: boolean;
  };
  summary: {
    capabilityGrid: string;
    liveGrid: string;
    selectedTier: string | null;
  };
};

export type FluidHighResolutionCalibrationOptions = Omit<
  FluidHighResolutionCalibrationReport,
  "failures" | "gate" | "generatedAt" | "pass" | "summary"
> & {
  generatedAt?: string;
};

export function createFluidHighResolutionCalibrationReport(
  options: FluidHighResolutionCalibrationOptions
): FluidHighResolutionCalibrationReport {
  const liveGrid = options.runtimeProbe.grid ?? "missing";
  const capabilityGrid = `${options.runtimeProbe.capabilityGrid.cellsX}x${options.runtimeProbe.capabilityGrid.cellsY}`;
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.sourceEvidence.gate === "G-FG-40" ? [] : [`source evidence gate was ${options.sourceEvidence.gate}`]),
    ...(options.sourceEvidence.pass ? [] : ["source evidence did not pass"]),
    ...(options.sourceEvidence.liveGrid === "1024x576" ? [] : [`source evidence live grid was ${options.sourceEvidence.liveGrid}`]),
    ...(options.sourceEvidence.caseCount >= 5 ? [] : [`source evidence case count was ${options.sourceEvidence.caseCount}`]),
    ...(options.sourceEvidence.comparisonCount >= 10 ? [] : [`source evidence comparison count was ${options.sourceEvidence.comparisonCount}`]),
    ...(options.profile.schema === "ocean-fluid-calibration-profile-v1" ? [] : [`profile schema was ${options.profile.schema}`]),
    ...(options.profile.pass ? [] : ["profile did not pass"]),
    ...(options.profile.sourceGate === "G-FG-23" ? [] : [`profile source gate was ${options.profile.sourceGate}`]),
    ...(options.profile.selectedTier === "ultra" ? [] : [`profile selected tier was ${options.profile.selectedTier}`]),
    ...(options.profile.runtimeGrid?.sourceGate === "G-FG-40" ? [] : ["profile runtime grid did not record source gate G-FG-40"]),
    ...(options.profile.runtimeGrid?.liveGrid === "1024x576" ? [] : [`profile runtime grid live grid was ${options.profile.runtimeGrid?.liveGrid ?? "missing"}`]),
    ...(options.profile.runtimeGrid?.capabilityGrid === "768x432" ? [] : [`profile runtime grid capability grid was ${options.profile.runtimeGrid?.capabilityGrid ?? "missing"}`]),
    ...(options.profile.runtimeGrid?.cellsX === 1024 && options.profile.runtimeGrid.cellsY === 576 ? [] : ["profile runtime grid dimensions were not 1024 x 576"]),
    ...(options.storage.fileName === "fluid-calibration.v1.json" ? [] : [`storage file was ${options.storage.fileName}`]),
    ...(options.storage.persistedRawBytes > 0 ? [] : ["persisted profile was empty"]),
    ...(options.storage.verificationReadMatched ? [] : ["persisted profile did not round-trip through storage"]),
    ...(options.storage.readByMainProcess ? [] : ["main process did not read the persisted high-resolution runtime grid"]),
    ...(options.launchEnv.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envExperimentalGridPresent ? ["OCEAN_LAB_EXPERIMENTAL_FLUID_GRID must be absent"] : []),
    ...(options.launchEnv.envUserDataOverridePresent ? [] : ["HARBORLINE_USER_DATA_DIR must point at the persisted calibration profile under test"]),
    ...(options.runtimeProbe.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${options.runtimeProbe.selection?.mode ?? "missing"}`]),
    ...(options.runtimeProbe.selection?.requestedTier === "auto" ? [] : [`runtime requested tier was ${options.runtimeProbe.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtimeProbe.selection?.calibratedTier === "ultra" ? [] : [`runtime calibrated tier was ${options.runtimeProbe.selection?.calibratedTier ?? "missing"}`]),
    ...(options.runtimeProbe.selectedTier === "ultra" ? [] : [`runtime selected tier was ${options.runtimeProbe.selectedTier ?? "missing"}`]),
    ...(options.runtimeProbe.capabilityGrid.cellsX === 768 && options.runtimeProbe.capabilityGrid.cellsY === 432
      ? []
      : [`runtime capability grid was ${capabilityGrid}`]),
    ...(options.runtimeProbe.runtimeGridOverride?.cellsX === 1024 && options.runtimeProbe.runtimeGridOverride.cellsY === 576
      ? []
      : ["runtime grid override global did not report 1024 x 576"]),
    ...(options.runtimeProbe.grid === "1024x576" ? [] : [`canvas grid was ${options.runtimeProbe.grid ?? "missing"}`]),
    ...(options.runtimeProbe.tier === "ultra" ? [] : [`canvas tier was ${options.runtimeProbe.tier ?? "missing"}`]),
    ...(options.runtimeProbe.renderer === "webgpu-grid-primary-v1" ? [] : [`renderer was ${options.runtimeProbe.renderer ?? "missing"}`]),
    ...(options.runtimeProbe.waterContext === "webgpu" ? [] : [`water context was ${options.runtimeProbe.waterContext ?? "missing"}`]),
    ...(options.runtimeProbe.waterFrames >= 12 ? [] : [`runtime only rendered ${options.runtimeProbe.waterFrames} water frames`]),
  ];

  return {
    ...options,
    failures,
    gate: "G-FG-41",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
    summary: {
      capabilityGrid,
      liveGrid,
      selectedTier: options.runtimeProbe.selectedTier,
    },
  };
}
