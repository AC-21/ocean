import type { FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import {
  defaultDisplayPacingThresholds,
  summarizeDisplayPacing,
  type DisplayPacingSummary,
  type DisplayPacingThresholds,
} from "./fluidDisplayPacing";
import type { InstalledDisplayPacingSample } from "./fluidInstalledDisplayPacing";
import type { FluidInstalledReferenceOutcomesReport } from "./fluidInstalledReferenceOutcomes";
import type { FluidReferenceOutcomeCategory } from "./fluidUltraReferenceOutcomes";

export type FluidInstalledReferencePacingGate = "G-FG-37";

export type InstalledReferencePacingSample = InstalledDisplayPacingSample & {
  particlesNoFullGridReadback: boolean;
  pressureNoFullGridReadback: boolean;
};

export type FluidInstalledReferencePacingScenarioInput = {
  categories: FluidReferenceOutcomeCategory[];
  expectedActivePhysics: boolean;
  expectedCoupling: boolean;
  expectedParticles: boolean;
  expectedPressure: boolean;
  id: string;
  label: string;
  referenceCaseId: string;
  samples: InstalledReferencePacingSample[];
  telemetry: {
    couplingActiveSeen: boolean;
    finalPhase: string | null;
    longTaskSupported: boolean;
    particlesActiveSeen: boolean;
    pressureActiveSeen: boolean;
    renderMode: string | null;
    renderer: string | null;
    timeScale: number;
    waterContext: string | null;
  };
};

export type FluidInstalledReferencePacingScenario = FluidInstalledReferencePacingScenarioInput & {
  framePacing: DisplayPacingSummary;
};

export type FluidInstalledReferencePacingReport = {
  failures: string[];
  gate: FluidInstalledReferencePacingGate;
  generatedAt: string;
  launchEnv: {
    envCalibratedTierPresent: boolean;
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
  referenceEvidence: {
    caseCount: number;
    categories: FluidReferenceOutcomeCategory[];
    comparisonCount: number;
    failures: string[];
    gate: string;
    grid: string;
    mode: string | null;
    pass: boolean;
    selectedTier: string | null;
    sourcePath: string;
  };
  runtime: {
    selectedGrid: {
      cellsX: number;
      cellsY: number;
    };
    selectedTier: string;
    selection: FluidRuntimeTierSelection | null;
  };
  scenarios: FluidInstalledReferencePacingScenario[];
  summary: {
    categories: FluidReferenceOutcomeCategory[];
    maxDroppedDebtS: number;
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

export type FluidInstalledReferencePacingOptions = {
  generatedAt?: string;
  launchEnv: FluidInstalledReferencePacingReport["launchEnv"];
  launcher: FluidInstalledReferencePacingReport["launcher"];
  referenceEvidence: FluidInstalledReferenceOutcomesReport;
  referenceEvidencePath: string;
  runtime: FluidInstalledReferencePacingReport["runtime"];
  scenarios: FluidInstalledReferencePacingScenarioInput[];
  thresholds?: Partial<DisplayPacingThresholds>;
};

export const installedReferencePacingThresholds: DisplayPacingThresholds = {
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
  "reference-concrete-drop-splash-pacing",
  "reference-ice-float-pacing",
  "reference-foam-damping-pacing",
  "reference-concrete-sink-pacing",
  "reference-leaky-drum-sink-pacing",
]);

export function createFluidInstalledReferencePacingReport(
  options: FluidInstalledReferencePacingOptions
): FluidInstalledReferencePacingReport {
  const thresholds = { ...installedReferencePacingThresholds, ...options.thresholds };
  const scenarios = options.scenarios.map((scenario) => ({
    ...scenario,
    framePacing: summarizeDisplayPacing(scenario.samples, scenario.expectedActivePhysics, thresholds),
  }));
  const scenarioCategories = Array.from(new Set(scenarios.flatMap((scenario) => scenario.categories))).sort() as FluidReferenceOutcomeCategory[];
  const referenceCategories = Array.from(new Set(options.referenceEvidence.summary.categories)).sort() as FluidReferenceOutcomeCategory[];
  const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
  const referenceCaseIds = new Set(options.referenceEvidence.coreReference.cases.map((entry) => entry.id));
  const expectedTier = "ultra";
  const observedSampleModes = sampleSet(scenarios, (sample) => sample.tierSelectionMode ?? "missing");
  const observedRequestedTiers = sampleSet(scenarios, (sample) => sample.tierSelectionRequestedTier ?? "missing");
  const observedPreferredTiers = sampleSet(scenarios, (sample) => sample.tierSelectionPreferredTier ?? "missing");
  const observedCanvasTiers = sampleSet(scenarios, (sample) => sample.tier ?? "missing");
  const observedCapabilityTiers = sampleSet(scenarios, (sample) => sample.capabilitySelectedTier ?? "missing");
  const observedCapabilityGrids = sampleSet(scenarios, (sample) => sample.capabilityGrid ?? "missing");
  const observedRenderers = sampleSet(scenarios, (sample) => sample.renderer ?? "missing");
  const observedContexts = sampleSet(scenarios, (sample) => sample.waterContext ?? "missing");

  const failures = [
    ...(options.referenceEvidence.gate === "G-FG-36"
      ? []
      : [`reference evidence gate was ${options.referenceEvidence.gate}`]),
    ...(options.referenceEvidence.pass ? [] : options.referenceEvidence.failures.map((failure) => `reference evidence ${failure}`)),
    ...(options.referenceEvidence.launchEnv.envCalibratedTierPresent ? ["reference evidence used OCEAN_LAB_CALIBRATED_FLUID_TIER"] : []),
    ...(options.referenceEvidence.launchEnv.envRequestedTierPresent ? ["reference evidence used OCEAN_LAB_FLUID_TIER"] : []),
    ...(options.referenceEvidence.launchEnv.envUserDataOverridePresent ? ["reference evidence used HARBORLINE_USER_DATA_DIR"] : []),
    ...(options.referenceEvidence.summary.selectedTier === expectedTier
      ? []
      : [`reference evidence selected tier was ${options.referenceEvidence.summary.selectedTier ?? "missing"}`]),
    ...(options.referenceEvidence.summary.grid === "768x432"
      ? []
      : [`reference evidence grid was ${options.referenceEvidence.summary.grid}`]),
    ...(options.referenceEvidence.summary.caseCount >= 5
      ? []
      : [`reference evidence case count was ${options.referenceEvidence.summary.caseCount}`]),
    ...(options.referenceEvidence.summary.comparisonCount >= 10
      ? []
      : [`reference evidence comparison count was ${options.referenceEvidence.summary.comparisonCount}`]),
    ...requiredCategories.flatMap((category) =>
      referenceCategories.includes(category) ? [] : [`reference evidence missing ${category} category`]
    ),
    ...requiredCategories.flatMap((category) =>
      scenarioCategories.includes(category) ? [] : [`reference pacing missing ${category} category`]
    ),
    ...(setEquals(scenarioIds, expectedScenarioIds) ? [] : [`scenario ids were ${Array.from(scenarioIds).join(", ")}`]),
    ...scenarios.flatMap((scenario) =>
      referenceCaseIds.has(scenario.referenceCaseId) ? [] : [`${scenario.id} references missing case ${scenario.referenceCaseId}`]
    ),
    ...(options.launcher.resolvesToInstalledBundle ? [] : ["Desktop launcher does not resolve to the installed app bundle"]),
    ...(options.launcher.executablePath.includes("/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab")
      ? []
      : [`launcher executable was ${options.launcher.executablePath}`]),
    ...(options.launchEnv.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envUserDataOverridePresent ? ["HARBORLINE_USER_DATA_DIR must be absent"] : []),
    ...(options.runtime.selection?.mode === "calibrated-auto"
      ? []
      : [`runtime selection mode was ${options.runtime.selection?.mode ?? "missing"}`]),
    ...(options.runtime.selection?.calibratedTier === expectedTier
      ? []
      : [`runtime calibrated tier was ${options.runtime.selection?.calibratedTier ?? "missing"}`]),
    ...(options.runtime.selection?.requestedTier === "auto"
      ? []
      : [`runtime requested tier was ${options.runtime.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtime.selectedTier === expectedTier
      ? []
      : [`runtime selected tier was ${options.runtime.selectedTier}, expected ${expectedTier}`]),
    ...(options.runtime.selectedGrid.cellsX === 768 && options.runtime.selectedGrid.cellsY === 432
      ? []
      : [`runtime selected grid was ${options.runtime.selectedGrid.cellsX} x ${options.runtime.selectedGrid.cellsY}`]),
    ...scenarios.flatMap((scenario) =>
      scenario.framePacing.pass ? [] : [`${scenario.id} display pacing missed the installed reference smoothness threshold.`]
    ),
    ...scenarios.flatMap((scenario) =>
      scenario.telemetry.renderer === "webgpu-grid-primary-v1" && scenario.telemetry.waterContext === "webgpu" && scenario.telemetry.renderMode === "webgpu"
        ? []
        : [`${scenario.id} did not finish on the primary WebGPU renderer.`]
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
    ...(setEquals(observedRenderers, new Set(["webgpu-grid-primary-v1"]))
      ? []
      : [`samples did not all use WebGPU renderer: ${Array.from(observedRenderers).join(", ")}`]),
    ...(setEquals(observedContexts, new Set(["webgpu"]))
      ? []
      : [`samples did not all use WebGPU canvas context: ${Array.from(observedContexts).join(", ")}`]),
  ];

  return {
    failures,
    gate: "G-FG-37",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchEnv: options.launchEnv,
    launcher: options.launcher,
    pass: failures.length === 0,
    referenceEvidence: {
      caseCount: options.referenceEvidence.summary.caseCount,
      categories: referenceCategories,
      comparisonCount: options.referenceEvidence.summary.comparisonCount,
      failures: options.referenceEvidence.failures,
      gate: options.referenceEvidence.gate,
      grid: options.referenceEvidence.summary.grid,
      mode: options.referenceEvidence.summary.mode,
      pass: options.referenceEvidence.pass,
      selectedTier: options.referenceEvidence.summary.selectedTier,
      sourcePath: options.referenceEvidencePath,
    },
    runtime: options.runtime,
    scenarios,
    summary: {
      categories: scenarioCategories,
      maxDroppedDebtS: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.maxDroppedDebtS)),
      maxP95FrameMs: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.p95FrameMs)),
      maxP99FrameMs: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.p99FrameMs)),
      referenceCaseCount: options.referenceEvidence.summary.caseCount,
      referenceComparisonCount: options.referenceEvidence.summary.comparisonCount,
      scenarioCount: scenarios.length,
      worstDroppedFrameRatio: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.droppedFrameRatio)),
      worstDuplicateWaterFrameRatio: Math.max(0, ...scenarios.map((scenario) => scenario.framePacing.duplicateWaterFrameRatio)),
    },
    thresholds,
  };
}

function sampleSet(
  scenarios: FluidInstalledReferencePacingScenario[],
  mapper: (sample: InstalledReferencePacingSample) => string
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
