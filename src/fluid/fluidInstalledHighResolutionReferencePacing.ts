import type { FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import {
  defaultDisplayPacingThresholds,
  summarizeDisplayPacing,
  type DisplayPacingSummary,
  type DisplayPacingThresholds,
} from "./fluidDisplayPacing";
import type { FluidExperimentalReferenceOutcomesReport } from "./fluidExperimentalReferenceOutcomes";
import type { FluidHighResolutionCalibrationReport } from "./fluidHighResolutionCalibration";
import type { InstalledReferencePacingSample } from "./fluidInstalledReferencePacing";
import type { FluidCalibrationProfile } from "./fluidPersistedCalibration";
import type { FluidReferenceOutcomeCategory } from "./fluidUltraReferenceOutcomes";

export type FluidInstalledHighResolutionReferencePacingGate = "G-FG-42";

export type InstalledHighResolutionReferencePacingSample = InstalledReferencePacingSample & {
  canvasGrid: string | null;
  runtimeGridOverride: string | null;
};

export type FluidInstalledHighResolutionReferencePacingScenarioInput = {
  categories: FluidReferenceOutcomeCategory[];
  expectedActivePhysics: boolean;
  expectedCoupling: boolean;
  expectedParticles: boolean;
  expectedPressure: boolean;
  id: string;
  label: string;
  referenceCaseId: string;
  samples: InstalledHighResolutionReferencePacingSample[];
  telemetry: {
    canvasGrid: string | null;
    couplingActiveSeen: boolean;
    finalPhase: string | null;
    longTaskSupported: boolean;
    particlesActiveSeen: boolean;
    pressureActiveSeen: boolean;
    renderMode: string | null;
    renderer: string | null;
    runtimeGridOverride: string | null;
    timeScale: number;
    waterContext: string | null;
  };
};

export type FluidInstalledHighResolutionReferencePacingScenario =
  FluidInstalledHighResolutionReferencePacingScenarioInput & {
    framePacing: DisplayPacingSummary;
  };

export type FluidInstalledHighResolutionReferencePacingReport = {
  coreReference: FluidExperimentalReferenceOutcomesReport;
  failures: string[];
  gate: FluidInstalledHighResolutionReferencePacingGate;
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
  scenarios: FluidInstalledHighResolutionReferencePacingScenario[];
  sourceCalibration: {
    capabilityGrid: string;
    caseCount: number;
    comparisonCount: number;
    gate: string;
    liveGrid: string;
    pass: boolean;
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
    categories: FluidReferenceOutcomeCategory[];
    maxP95FrameMs: number;
    maxP99FrameMs: number;
    referenceCaseCount: number;
    referenceComparisonCount: number;
    scenarioCount: number;
    worstDroppedFrameRatio: number;
    worstDuplicateWaterFrameRatio: number;
  };
  thresholds: DisplayPacingThresholds;
};

export type FluidInstalledHighResolutionReferencePacingOptions = {
  coreReference: FluidExperimentalReferenceOutcomesReport;
  generatedAt?: string;
  installedProfile: FluidInstalledHighResolutionReferencePacingReport["installedProfile"];
  launchEnv: FluidInstalledHighResolutionReferencePacingReport["launchEnv"];
  launcher: FluidInstalledHighResolutionReferencePacingReport["launcher"];
  runtime: FluidInstalledHighResolutionReferencePacingReport["runtime"];
  scenarios: FluidInstalledHighResolutionReferencePacingScenarioInput[];
  sourceCalibration: FluidHighResolutionCalibrationReport;
  storage: FluidInstalledHighResolutionReferencePacingReport["storage"];
  thresholds?: Partial<DisplayPacingThresholds>;
};

export const installedHighResolutionReferencePacingThresholds: DisplayPacingThresholds = {
  ...defaultDisplayPacingThresholds,
  maxDroppedFrameRatio: 0.08,
  maxDuplicateWaterFrameRatio: 0.16,
  maxLongTaskDurationMs: 160,
  maxP95FrameMs: 24,
  maxP99FrameMs: 36,
  minSamples: 120,
  minWaterFrameDelta: 36,
};

const requiredCategories: FluidReferenceOutcomeCategory[] = ["damping", "drop", "float", "sink", "splash"];
const expectedScenarioIds = new Set([
  "high-resolution-concrete-drop-splash-pacing",
  "high-resolution-ice-float-pacing",
  "high-resolution-foam-damping-pacing",
  "high-resolution-concrete-sink-pacing",
  "high-resolution-leaky-drum-sink-pacing",
]);

export function createFluidInstalledHighResolutionReferencePacingReport(
  options: FluidInstalledHighResolutionReferencePacingOptions
): FluidInstalledHighResolutionReferencePacingReport {
  const thresholds = { ...installedHighResolutionReferencePacingThresholds, ...options.thresholds };
  const scenarios = options.scenarios.map((scenario) => ({
    ...scenario,
    framePacing: summarizeDisplayPacing(scenario.samples, scenario.expectedActivePhysics, thresholds),
  }));
  const scenarioCategories = Array.from(new Set(scenarios.flatMap((scenario) => scenario.categories))).sort() as FluidReferenceOutcomeCategory[];
  const referenceCategories = Array.from(new Set(options.coreReference.summary.categories)).sort() as FluidReferenceOutcomeCategory[];
  const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
  const referenceCaseIds = new Set(options.coreReference.cases.map((entry) => entry.id));
  const observedSampleModes = sampleSet(scenarios, (sample) => sample.tierSelectionMode ?? "missing");
  const observedRequestedTiers = sampleSet(scenarios, (sample) => sample.tierSelectionRequestedTier ?? "missing");
  const observedPreferredTiers = sampleSet(scenarios, (sample) => sample.tierSelectionPreferredTier ?? "missing");
  const observedCanvasTiers = sampleSet(scenarios, (sample) => sample.tier ?? "missing");
  const observedCapabilityTiers = sampleSet(scenarios, (sample) => sample.capabilitySelectedTier ?? "missing");
  const observedCapabilityGrids = sampleSet(scenarios, (sample) => sample.capabilityGrid ?? "missing");
  const observedCanvasGrids = sampleSet(scenarios, (sample) => sample.canvasGrid ?? "missing");
  const observedRuntimeOverrides = sampleSet(scenarios, (sample) => sample.runtimeGridOverride ?? "missing");
  const observedRenderers = sampleSet(scenarios, (sample) => sample.renderer ?? "missing");
  const observedContexts = sampleSet(scenarios, (sample) => sample.waterContext ?? "missing");

  const failures = [
    ...(options.sourceCalibration.gate === "G-FG-41" ? [] : [`source calibration gate was ${options.sourceCalibration.gate}`]),
    ...(options.sourceCalibration.pass ? [] : options.sourceCalibration.failures.map((failure) => `source calibration ${failure}`)),
    ...(options.sourceCalibration.summary.liveGrid === "1024x576"
      ? []
      : [`source calibration live grid was ${options.sourceCalibration.summary.liveGrid}`]),
    ...(options.sourceCalibration.summary.capabilityGrid === "768x432"
      ? []
      : [`source calibration capability grid was ${options.sourceCalibration.summary.capabilityGrid}`]),
    ...(options.sourceCalibration.sourceEvidence.caseCount >= 5
      ? []
      : [`source calibration case count was ${options.sourceCalibration.sourceEvidence.caseCount}`]),
    ...(options.sourceCalibration.sourceEvidence.comparisonCount >= 10
      ? []
      : [`source calibration comparison count was ${options.sourceCalibration.sourceEvidence.comparisonCount}`]),
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
    ...(options.installedProfile.runtimeGrid?.capabilityGrid === "768x432"
      ? []
      : [`installed profile runtime grid capability grid was ${options.installedProfile.runtimeGrid?.capabilityGrid ?? "missing"}`]),
    ...(options.installedProfile.runtimeGrid?.cellsX === 1024 && options.installedProfile.runtimeGrid.cellsY === 576
      ? []
      : ["installed profile runtime grid dimensions were not 1024 x 576"]),
    ...(options.storage.fileName === "fluid-calibration.v1.json" ? [] : [`storage file was ${options.storage.fileName}`]),
    ...(options.storage.defaultStorage ? [] : [`storage path was not the default Desktop profile: ${options.storage.storageBasePath}`]),
    ...(options.storage.profileHadRuntimeGrid ? [] : ["stored profile did not include runtimeGrid"]),
    ...(options.storage.persistedRawBytes > 0 ? [] : ["persisted profile was empty"]),
    ...(options.storage.verificationReadMatched ? [] : ["persisted profile did not round-trip through storage"]),
    ...(options.storage.readByMainProcess ? [] : ["main process did not read the installed high-resolution runtime grid"]),
    ...(options.launcher.resolvesToInstalledBundle ? [] : ["Desktop launcher does not resolve to the installed app bundle"]),
    ...(options.launcher.executablePath.includes("/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab")
      ? []
      : [`launcher executable was ${options.launcher.executablePath}`]),
    ...(options.launchEnv.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envExperimentalGridPresent ? ["OCEAN_LAB_EXPERIMENTAL_FLUID_GRID must be absent"] : []),
    ...(options.launchEnv.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envUserDataOverridePresent ? ["HARBORLINE_USER_DATA_DIR must be absent"] : []),
    ...(options.runtime.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${options.runtime.selection?.mode ?? "missing"}`]),
    ...(options.runtime.selection?.requestedTier === "auto" ? [] : [`runtime requested tier was ${options.runtime.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtime.selection?.calibratedTier === "ultra"
      ? []
      : [`runtime calibrated tier was ${options.runtime.selection?.calibratedTier ?? "missing"}`]),
    ...(options.runtime.selection?.preferredTier === "ultra"
      ? []
      : [`runtime preferred tier was ${options.runtime.selection?.preferredTier ?? "missing"}`]),
    ...(options.runtime.selectedTier === "ultra" ? [] : [`runtime selected tier was ${options.runtime.selectedTier}`]),
    ...(options.runtime.capabilityGrid.cellsX === 768 && options.runtime.capabilityGrid.cellsY === 432
      ? []
      : [`runtime capability grid was ${options.runtime.capabilityGrid.cellsX} x ${options.runtime.capabilityGrid.cellsY}`]),
    ...(options.runtime.runtimeGridOverride?.cellsX === 1024 && options.runtime.runtimeGridOverride.cellsY === 576
      ? []
      : ["runtime grid override global did not report 1024 x 576"]),
    ...(options.runtime.liveGrid === "1024x576" ? [] : [`runtime live grid was ${options.runtime.liveGrid ?? "missing"}`]),
    ...(options.runtime.tier === "ultra" ? [] : [`runtime canvas tier was ${options.runtime.tier ?? "missing"}`]),
    ...(options.runtime.renderer === "webgpu-grid-primary-v1" ? [] : [`runtime renderer was ${options.runtime.renderer ?? "missing"}`]),
    ...(options.runtime.waterContext === "webgpu" ? [] : [`runtime water context was ${options.runtime.waterContext ?? "missing"}`]),
    ...(options.runtime.waterFrames >= 12 ? [] : [`runtime only rendered ${options.runtime.waterFrames} water frames`]),
    ...(options.coreReference.gate === "G-FG-40" ? [] : [`core reference gate was ${options.coreReference.gate}`]),
    ...(options.coreReference.pass ? [] : options.coreReference.failures.map((failure) => `core reference ${failure}`)),
    ...(options.coreReference.launchMode === "packaged-app"
      ? []
      : [`core reference launch mode was ${options.coreReference.launchMode}`]),
    ...(options.coreReference.preferredTier === "ultra" ? [] : [`core reference preferred tier was ${options.coreReference.preferredTier}`]),
    ...(options.coreReference.selectedTier === "ultra" ? [] : [`core reference selected tier was ${options.coreReference.selectedTier}`]),
    ...(options.coreReference.summary.capabilityGrid === "768x432"
      ? []
      : [`core reference capability grid was ${options.coreReference.summary.capabilityGrid}`]),
    ...(options.coreReference.summary.liveGrid === "1024x576"
      ? []
      : [`core reference live grid was ${options.coreReference.summary.liveGrid}`]),
    ...(options.coreReference.summary.caseCount >= 5 ? [] : [`core reference case count was ${options.coreReference.summary.caseCount}`]),
    ...(options.coreReference.summary.comparisonCount >= 10
      ? []
      : [`core reference comparison count was ${options.coreReference.summary.comparisonCount}`]),
    ...requiredCategories.flatMap((category) => (referenceCategories.includes(category) ? [] : [`core reference missing ${category} category`])),
    ...(options.coreReference.noFullGridReadbackPerFrame ? [] : ["core reference used full-grid readback"]),
    ...requiredCategories.flatMap((category) => (scenarioCategories.includes(category) ? [] : [`reference pacing missing ${category} category`])),
    ...(setEquals(scenarioIds, expectedScenarioIds) ? [] : [`scenario ids were ${Array.from(scenarioIds).join(", ")}`]),
    ...scenarios.flatMap((scenario) =>
      referenceCaseIds.has(scenario.referenceCaseId) ? [] : [`${scenario.id} references missing case ${scenario.referenceCaseId}`]
    ),
    ...scenarios.flatMap((scenario) =>
      scenario.framePacing.pass ? [] : [`${scenario.id} display pacing missed the installed high-resolution smoothness threshold.`]
    ),
    ...scenarios.flatMap((scenario) =>
      scenario.telemetry.renderer === "webgpu-grid-primary-v1" && scenario.telemetry.waterContext === "webgpu" && scenario.telemetry.renderMode === "webgpu"
        ? []
        : [`${scenario.id} did not finish on the primary WebGPU renderer.`]
    ),
    ...scenarios.flatMap((scenario) => (scenario.telemetry.canvasGrid === "1024x576" ? [] : [`${scenario.id} canvas grid was ${scenario.telemetry.canvasGrid ?? "missing"}`])),
    ...scenarios.flatMap((scenario) =>
      scenario.telemetry.runtimeGridOverride === "1024x576" ? [] : [`${scenario.id} runtime grid override was ${scenario.telemetry.runtimeGridOverride ?? "missing"}`]
    ),
    ...scenarios.flatMap((scenario) => (scenario.telemetry.timeScale === 1 ? [] : [`${scenario.id} did not run at normal 1x time scale.`])),
    ...scenarios.flatMap((scenario) =>
      scenario.expectedPressure && !scenario.telemetry.pressureActiveSeen ? [`${scenario.id} never observed active pressure telemetry.`] : []
    ),
    ...scenarios.flatMap((scenario) =>
      scenario.expectedParticles && !scenario.telemetry.particlesActiveSeen ? [`${scenario.id} never observed active particle telemetry.`] : []
    ),
    ...scenarios.flatMap((scenario) =>
      scenario.expectedCoupling && !scenario.telemetry.couplingActiveSeen ? [`${scenario.id} never observed active object-grid coupling.`] : []
    ),
    ...scenarios.flatMap((scenario) =>
      scenario.samples.every((sample) => sample.pressureNoFullGridReadback && sample.particlesNoFullGridReadback)
        ? []
        : [`${scenario.id} observed a full-grid readback flag during pacing.`]
    ),
    ...(setEquals(observedSampleModes, new Set(["calibrated-auto"]))
      ? []
      : [`samples did not all observe calibrated-auto: ${Array.from(observedSampleModes).join(", ")}`]),
    ...(setEquals(observedRequestedTiers, new Set(["auto"]))
      ? []
      : [`samples did not all observe auto requests: ${Array.from(observedRequestedTiers).join(", ")}`]),
    ...(setEquals(observedPreferredTiers, new Set(["ultra"]))
      ? []
      : [`samples did not all prefer installed tier ultra: ${Array.from(observedPreferredTiers).join(", ")}`]),
    ...(setEquals(observedCanvasTiers, new Set(["ultra"]))
      ? []
      : [`samples did not all render installed tier ultra: ${Array.from(observedCanvasTiers).join(", ")}`]),
    ...(setEquals(observedCapabilityTiers, new Set(["ultra"]))
      ? []
      : [`samples did not all select installed tier ultra: ${Array.from(observedCapabilityTiers).join(", ")}`]),
    ...(setEquals(observedCapabilityGrids, new Set(["768x432"]))
      ? []
      : [`samples did not all use 768x432 capability grid: ${Array.from(observedCapabilityGrids).join(", ")}`]),
    ...(setEquals(observedCanvasGrids, new Set(["1024x576"]))
      ? []
      : [`samples did not all render 1024x576 canvas grid: ${Array.from(observedCanvasGrids).join(", ")}`]),
    ...(setEquals(observedRuntimeOverrides, new Set(["1024x576"]))
      ? []
      : [`samples did not all observe 1024x576 runtime override: ${Array.from(observedRuntimeOverrides).join(", ")}`]),
    ...(setEquals(observedRenderers, new Set(["webgpu-grid-primary-v1"]))
      ? []
      : [`samples did not all use WebGPU renderer: ${Array.from(observedRenderers).join(", ")}`]),
    ...(setEquals(observedContexts, new Set(["webgpu"]))
      ? []
      : [`samples did not all use WebGPU canvas context: ${Array.from(observedContexts).join(", ")}`]),
  ];

  return {
    coreReference: options.coreReference,
    failures,
    gate: "G-FG-42",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    installedProfile: options.installedProfile,
    launchEnv: options.launchEnv,
    launcher: options.launcher,
    pass: failures.length === 0,
    runtime: options.runtime,
    scenarios,
    sourceCalibration: {
      capabilityGrid: options.sourceCalibration.summary.capabilityGrid,
      caseCount: options.sourceCalibration.sourceEvidence.caseCount,
      comparisonCount: options.sourceCalibration.sourceEvidence.comparisonCount,
      gate: options.sourceCalibration.gate,
      liveGrid: options.sourceCalibration.summary.liveGrid,
      pass: options.sourceCalibration.pass,
    },
    storage: options.storage,
    summary: {
      categories: scenarioCategories,
      maxP95FrameMs: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.p95FrameMs)),
      maxP99FrameMs: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.p99FrameMs)),
      referenceCaseCount: options.coreReference.summary.caseCount,
      referenceComparisonCount: options.coreReference.summary.comparisonCount,
      scenarioCount: scenarios.length,
      worstDroppedFrameRatio: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.droppedFrameRatio)),
      worstDuplicateWaterFrameRatio: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.duplicateWaterFrameRatio)),
    },
    thresholds,
  };
}

function sampleSet(
  scenarios: FluidInstalledHighResolutionReferencePacingScenario[],
  mapper: (sample: InstalledHighResolutionReferencePacingSample) => string
): Set<string> {
  return new Set(scenarios.flatMap((scenario) => scenario.samples.map(mapper)));
}

function setEquals<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}
