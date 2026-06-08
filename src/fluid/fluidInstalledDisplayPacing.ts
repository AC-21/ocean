import {
  createFluidDisplayPacingReport,
  type DisplayPacingSample,
  type DisplayPacingThresholds,
  type FluidDisplayPacingReport,
  type FluidDisplayPacingScenario,
  type FluidDisplayPacingScenarioInput,
} from "./fluidDisplayPacing";
import type { FluidAdaptiveTierReport, FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import type { FluidCalibrationInstallReceipt } from "./fluidInstalledCalibration";

export type FluidInstalledDisplayPacingGate = "G-FG-26";

export type InstalledDisplayPacingSample = DisplayPacingSample & {
  capabilitySelectedTier: string | null;
  capabilityGrid: string | null;
  tierSelectionMode: string | null;
  tierSelectionPreferredTier: string | null;
  tierSelectionRequestedTier: string | null;
};

export type FluidInstalledDisplayPacingScenarioInput = Omit<FluidDisplayPacingScenarioInput, "samples"> & {
  samples: InstalledDisplayPacingSample[];
};

export type FluidInstalledDisplayPacingScenario = Omit<FluidDisplayPacingScenario, "samples"> & {
  samples: InstalledDisplayPacingSample[];
};

export type FluidInstalledDisplayPacingReport = {
  adaptiveSource: Pick<FluidAdaptiveTierReport, "gate" | "pass" | "recommendation">;
  displayPacing: FluidDisplayPacingReport;
  failures: string[];
  gate: FluidInstalledDisplayPacingGate;
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
  scenarios: FluidInstalledDisplayPacingScenario[];
  storage: {
    fileName: string;
    installedTier: string;
    reusedByMainProcess: boolean;
    verificationReadMatched: boolean;
  };
  summary: {
    maxP95FrameMs: number;
    maxP99FrameMs: number;
    scenarioCount: number;
    worstDroppedFrameRatio: number;
    worstDuplicateWaterFrameRatio: number;
  };
};

export type FluidInstalledDisplayPacingOptions = {
  adaptiveSource: FluidAdaptiveTierReport;
  envCalibratedTierPresent: boolean;
  envRequestedTierPresent: boolean;
  generatedAt?: string;
  install: FluidCalibrationInstallReceipt;
  launchMode: FluidInstalledDisplayPacingReport["launchMode"];
  runtime: FluidInstalledDisplayPacingReport["runtime"];
  scenarios: FluidInstalledDisplayPacingScenarioInput[];
  thresholds?: Partial<DisplayPacingThresholds>;
};

export function createFluidInstalledDisplayPacingReport(
  options: FluidInstalledDisplayPacingOptions
): FluidInstalledDisplayPacingReport {
  const displayPacing = createFluidDisplayPacingReport({
    generatedAt: options.generatedAt,
    launchMode: options.launchMode,
    scenarios: options.scenarios,
    thresholds: options.thresholds,
  });
  const scenarios = displayPacing.scenarios as FluidInstalledDisplayPacingScenario[];
  const expectedTier = options.install.installedProfile.selectedTier;
  const observedSampleModes = new Set(scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.tierSelectionMode ?? "missing")));
  const observedRequestedTiers = new Set(scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.tierSelectionRequestedTier ?? "missing")));
  const observedPreferredTiers = new Set(scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.tierSelectionPreferredTier ?? "missing")));
  const observedCanvasTiers = new Set(scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.tier ?? "missing")));
  const observedCapabilityTiers = new Set(scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.capabilitySelectedTier ?? "missing")));
  const observedCapabilityGrids = new Set(scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.capabilityGrid ?? "missing")));
  const expectedScenarioIds = new Set([
    "idle-installed-display-pacing",
    "concrete-installed-impact-display-pacing",
    "foam-installed-damping-display-pacing",
  ]);
  const actualScenarioIds = new Set(scenarios.map((scenario) => scenario.id));

  const failures = [
    ...(displayPacing.failures.length > 0 ? displayPacing.failures.map((failure) => `display pacing: ${failure}`) : []),
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.adaptiveSource.gate === "G-FG-23" && options.adaptiveSource.pass ? [] : ["adaptive source must be a passing FG-23 report."]),
    ...(options.install.fileName === "fluid-calibration.v1.json" ? [] : [`installed file was ${options.install.fileName}`]),
    ...(options.install.verificationReadMatched ? [] : ["installed calibration profile did not round-trip through desktop storage."]),
    ...(options.install.installedProfile.selectedTier === "ultra" ? [] : [`installed profile selected ${options.install.installedProfile.selectedTier}, expected ultra.`]),
    ...(options.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent for installed display pacing."] : []),
    ...(options.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent for installed display pacing."] : []),
    ...(options.runtime.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${options.runtime.selection?.mode ?? "missing"}`]),
    ...(options.runtime.selection?.calibratedTier === expectedTier
      ? []
      : [`runtime calibrated tier was ${options.runtime.selection?.calibratedTier ?? "missing"}, expected ${expectedTier}`]),
    ...(options.runtime.selection?.requestedTier === "auto" ? [] : [`runtime requested tier was ${options.runtime.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtime.selectedTier === expectedTier ? [] : [`runtime selected tier was ${options.runtime.selectedTier}, expected ${expectedTier}`]),
    ...(options.runtime.selectedGrid.cellsX === 768 && options.runtime.selectedGrid.cellsY === 432
      ? []
      : [`runtime selected grid was ${options.runtime.selectedGrid.cellsX} x ${options.runtime.selectedGrid.cellsY}`]),
    ...(setEquals(actualScenarioIds, expectedScenarioIds) ? [] : [`scenario ids were ${Array.from(actualScenarioIds).join(", ")}`]),
    ...(setEquals(observedSampleModes, new Set(["calibrated-auto"]))
      ? []
      : [`display samples did not all observe calibrated-auto: ${Array.from(observedSampleModes).join(", ")}`]),
    ...(setEquals(observedRequestedTiers, new Set(["auto"]))
      ? []
      : [`display samples did not all observe auto requests: ${Array.from(observedRequestedTiers).join(", ")}`]),
    ...(setEquals(observedPreferredTiers, new Set([expectedTier]))
      ? []
      : [`display samples did not all prefer installed tier ${expectedTier}: ${Array.from(observedPreferredTiers).join(", ")}`]),
    ...(setEquals(observedCanvasTiers, new Set([expectedTier]))
      ? []
      : [`display samples did not all render installed tier ${expectedTier}: ${Array.from(observedCanvasTiers).join(", ")}`]),
    ...(setEquals(observedCapabilityTiers, new Set([expectedTier]))
      ? []
      : [`display samples did not all select installed tier ${expectedTier}: ${Array.from(observedCapabilityTiers).join(", ")}`]),
    ...(setEquals(observedCapabilityGrids, new Set(["768x432"]))
      ? []
      : [`display samples did not all use 768x432 capability grid: ${Array.from(observedCapabilityGrids).join(", ")}`]),
  ];

  return {
    adaptiveSource: {
      gate: options.adaptiveSource.gate,
      pass: options.adaptiveSource.pass,
      recommendation: options.adaptiveSource.recommendation,
    },
    displayPacing,
    failures,
    gate: "G-FG-26",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    install: options.install,
    launchMode: options.launchMode,
    pass: failures.length === 0,
    runtime: options.runtime,
    scenarios,
    storage: {
      fileName: options.install.fileName,
      installedTier: options.install.installedProfile.selectedTier,
      reusedByMainProcess:
        options.runtime.selection?.mode === "calibrated-auto" &&
        options.runtime.selection.calibratedTier === options.install.installedProfile.selectedTier,
      verificationReadMatched: options.install.verificationReadMatched,
    },
    summary: {
      maxP95FrameMs: displayPacing.summary.maxP95FrameMs,
      maxP99FrameMs: displayPacing.summary.maxP99FrameMs,
      scenarioCount: displayPacing.summary.scenarioCount,
      worstDroppedFrameRatio: displayPacing.summary.worstDroppedFrameRatio,
      worstDuplicateWaterFrameRatio: displayPacing.summary.worstDuplicateWaterFrameRatio,
    },
  };
}

function setEquals(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}
