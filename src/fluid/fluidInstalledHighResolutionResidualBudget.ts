import type { FluidExperimentalReferenceOutcomesReport } from "./fluidExperimentalReferenceOutcomes";
import type { FluidInstalledHighResolutionOperatorReadoutReport } from "./fluidInstalledHighResolutionOperatorReadout";
import type { FluidInstalledHighResolutionReferencePacingReport } from "./fluidInstalledHighResolutionReferencePacing";
import type { FluidReferenceOutcomeCategory, FluidReferenceOutcomeComparison } from "./fluidUltraReferenceOutcomes";

export type FluidInstalledHighResolutionResidualBudgetGate = "G-FG-46";

export type ResidualBudgetRisk = "exact" | "ok" | "watch";

export type ResidualBudgetComparison = FluidReferenceOutcomeComparison & {
  halfWidth: number;
  marginRatio: number;
  nearestBoundMargin: number;
  normalizedResidual: number;
  risk: ResidualBudgetRisk;
  targetMidpoint: number;
};

export type ResidualBudgetThresholds = {
  maxNormalizedResidual: number;
  minContinuousMarginRatio: number;
  watchMarginRatio: number;
  watchNormalizedResidual: number;
};

export type FluidInstalledHighResolutionResidualBudgetReport = {
  comparisons: ResidualBudgetComparison[];
  failures: string[];
  gate: FluidInstalledHighResolutionResidualBudgetGate;
  generatedAt: string;
  operatorReadout: {
    gate: string;
    liveGrid: string | null;
    outcomeClasses: string[];
    pass: boolean;
    scenarioCount: number;
    sourcePath: string;
  };
  pass: boolean;
  sourceReference: {
    categories: FluidReferenceOutcomeCategory[];
    coreGate: string;
    corePass: boolean;
    gate: string;
    liveGrid: string | null;
    noFullGridReadbackPerFrame: boolean;
    pass: boolean;
    referenceCaseCount: number;
    referenceComparisonCount: number;
    sourcePath: string;
  };
  summary: {
    categories: FluidReferenceOutcomeCategory[];
    closestMarginRatio: number;
    comparisonCount: number;
    exactComparisonCount: number;
    watchComparisonIds: string[];
    worstNormalizedResidual: number;
  };
  thresholds: ResidualBudgetThresholds;
};

export type FluidInstalledHighResolutionResidualBudgetOptions = {
  generatedAt?: string;
  operatorReadout: FluidInstalledHighResolutionOperatorReadoutReport;
  operatorReadoutPath: string;
  sourceReference: FluidInstalledHighResolutionReferencePacingReport;
  sourceReferencePath: string;
  thresholds?: Partial<ResidualBudgetThresholds>;
};

export const installedHighResolutionResidualBudgetThresholds: ResidualBudgetThresholds = {
  maxNormalizedResidual: 0.95,
  minContinuousMarginRatio: 0.05,
  watchMarginRatio: 0.1,
  watchNormalizedResidual: 0.85,
};

const requiredCategories: FluidReferenceOutcomeCategory[] = ["damping", "drop", "float", "sink", "splash"];
const requiredComparisonIds = [
  "live-drop-speed-reference",
  "live-splash-height-reference",
  "live-ice-equilibrium-submerged-fraction-reference",
  "live-ice-hydrostatic-draft-error",
  "live-foam-settled-draft-error",
  "live-foam-settled-buoyancy-error",
  "live-foam-equilibrium-window",
  "live-concrete-terminal-speed-reference",
  "live-concrete-sink-phase",
  "live-leaky-drum-sink-time-ratio-reference",
];

export function createFluidInstalledHighResolutionResidualBudgetReport(
  options: FluidInstalledHighResolutionResidualBudgetOptions
): FluidInstalledHighResolutionResidualBudgetReport {
  const thresholds = { ...installedHighResolutionResidualBudgetThresholds, ...options.thresholds };
  const coreReference = options.sourceReference.coreReference;
  const comparisons = coreReference.comparisons.map((comparison) => residualForComparison(comparison, thresholds));
  const categories = Array.from(new Set(comparisons.map((comparison) => comparison.category))).sort() as FluidReferenceOutcomeCategory[];
  const comparisonIds = new Set(comparisons.map((comparison) => comparison.id));
  const watchComparisonIds = comparisons.filter((comparison) => comparison.risk === "watch").map((comparison) => comparison.id);
  const continuousComparisons = comparisons.filter((comparison) => comparison.halfWidth > 0);
  const exactComparisonCount = comparisons.length - continuousComparisons.length;

  const failures = [
    ...sourceReferenceFailures(options.sourceReference, coreReference),
    ...operatorReadoutFailures(options.operatorReadout),
    ...requiredComparisonIds.flatMap((id) => (comparisonIds.has(id) ? [] : [`missing residual comparison ${id}`])),
    ...requiredCategories.flatMap((category) => (categories.includes(category) ? [] : [`missing residual category ${category}`])),
    ...(comparisons.length >= 10 ? [] : [`residual budget had ${comparisons.length} structured comparisons; UI-only evidence is not accepted`]),
    ...comparisons.flatMap((comparison) => comparisonFailures(comparison, thresholds)),
  ];

  return {
    comparisons,
    failures,
    gate: "G-FG-46",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    operatorReadout: {
      gate: options.operatorReadout.gate,
      liveGrid: options.operatorReadout.runtime.liveGrid,
      outcomeClasses: options.operatorReadout.summary.outcomeClasses,
      pass: options.operatorReadout.pass,
      scenarioCount: options.operatorReadout.summary.scenarioCount,
      sourcePath: options.operatorReadoutPath,
    },
    pass: failures.length === 0,
    sourceReference: {
      categories: options.sourceReference.summary.categories,
      coreGate: coreReference.gate,
      corePass: coreReference.pass,
      gate: options.sourceReference.gate,
      liveGrid: options.sourceReference.runtime.liveGrid,
      noFullGridReadbackPerFrame: coreReference.noFullGridReadbackPerFrame,
      pass: options.sourceReference.pass,
      referenceCaseCount: options.sourceReference.summary.referenceCaseCount,
      referenceComparisonCount: options.sourceReference.summary.referenceComparisonCount,
      sourcePath: options.sourceReferencePath,
    },
    summary: {
      categories,
      closestMarginRatio: Math.min(1, ...continuousComparisons.map((comparison) => comparison.marginRatio)),
      comparisonCount: comparisons.length,
      exactComparisonCount,
      watchComparisonIds,
      worstNormalizedResidual: Math.max(0, ...comparisons.map((comparison) => comparison.normalizedResidual)),
    },
    thresholds,
  };
}

function sourceReferenceFailures(
  sourceReference: FluidInstalledHighResolutionReferencePacingReport,
  coreReference: FluidExperimentalReferenceOutcomesReport
): string[] {
  const sourceCategories = new Set(sourceReference.summary.categories);
  return [
    ...(sourceReference.gate === "G-FG-42" ? [] : [`source reference gate was ${sourceReference.gate}`]),
    ...(sourceReference.pass ? [] : sourceReference.failures.map((failure) => `source reference ${failure}`)),
    ...(sourceReference.runtime.liveGrid === "1024x576" ? [] : [`source reference live grid was ${sourceReference.runtime.liveGrid ?? "missing"}`]),
    ...(sourceReference.runtime.renderer === "webgpu-grid-primary-v1"
      ? []
      : [`source reference renderer was ${sourceReference.runtime.renderer ?? "missing"}`]),
    ...(sourceReference.runtime.waterContext === "webgpu"
      ? []
      : [`source reference water context was ${sourceReference.runtime.waterContext ?? "missing"}`]),
    ...(sourceReference.runtime.runtimeGridOverride?.cellsX === 1024 && sourceReference.runtime.runtimeGridOverride.cellsY === 576
      ? []
      : ["source reference runtime grid override was not 1024 x 576"]),
    ...(sourceReference.summary.referenceCaseCount >= 5
      ? []
      : [`source reference case count was ${sourceReference.summary.referenceCaseCount}`]),
    ...(sourceReference.summary.referenceComparisonCount >= 10
      ? []
      : [`source reference comparison count was ${sourceReference.summary.referenceComparisonCount}`]),
    ...requiredCategories.flatMap((category) => (sourceCategories.has(category) ? [] : [`source reference missing ${category} category`])),
    ...(coreReference.gate === "G-FG-40" ? [] : [`core reference gate was ${coreReference.gate}`]),
    ...(coreReference.pass ? [] : coreReference.failures.map((failure) => `core reference ${failure}`)),
    ...(coreReference.summary.liveGrid === "1024x576" ? [] : [`core reference live grid was ${coreReference.summary.liveGrid}`]),
    ...(coreReference.summary.capabilityGrid === "768x432" ? [] : [`core reference capability grid was ${coreReference.summary.capabilityGrid}`]),
    ...(coreReference.summary.caseCount >= 5 ? [] : [`core reference case count was ${coreReference.summary.caseCount}`]),
    ...(coreReference.summary.comparisonCount >= 10 ? [] : [`core reference comparison count was ${coreReference.summary.comparisonCount}`]),
    ...(coreReference.noFullGridReadbackPerFrame ? [] : ["core reference used full-grid readback"]),
    ...(coreReference.cases.every((entry) => entry.telemetry.noFullGridReadbackPerFrame && entry.telemetry.particlesNoFullGridReadbackPerFrame !== false)
      ? []
      : ["core reference cases lost no-readback telemetry"]),
  ];
}

function operatorReadoutFailures(operatorReadout: FluidInstalledHighResolutionOperatorReadoutReport): string[] {
  return [
    ...(operatorReadout.gate === "G-FG-45" ? [] : [`operator readout gate was ${operatorReadout.gate}`]),
    ...(operatorReadout.pass ? [] : operatorReadout.failures.map((failure) => `operator readout ${failure}`)),
    ...(operatorReadout.runtime.liveGrid === "1024x576" ? [] : [`operator readout live grid was ${operatorReadout.runtime.liveGrid ?? "missing"}`]),
    ...(operatorReadout.runtime.renderer === "webgpu-grid-primary-v1"
      ? []
      : [`operator readout renderer was ${operatorReadout.runtime.renderer ?? "missing"}`]),
    ...(operatorReadout.runtime.waterContext === "webgpu"
      ? []
      : [`operator readout water context was ${operatorReadout.runtime.waterContext ?? "missing"}`]),
    ...(operatorReadout.summary.scenarioCount >= 3 ? [] : [`operator readout scenario count was ${operatorReadout.summary.scenarioCount}`]),
    ...(operatorReadout.scenarios.every((scenario) => scenario.clickedPreset && scenario.clickedDrop)
      ? []
      : ["operator readout did not use visible preset and Drop controls"]),
    ...(operatorReadout.scenarios.every((scenario) => scenario.finalSnapshot && scenario.samples.length > 0)
      ? []
      : ["operator readout snapshot/sample evidence missing; UI-only readouts are not accepted"]),
    ...(operatorReadout.scenarios.every((scenario) => scenario.telemetry.pressureNoFullGridReadback && scenario.telemetry.particlesNoFullGridReadback)
      ? []
      : ["operator readout lost pressure or particle no-readback telemetry"]),
  ];
}

function residualForComparison(
  comparison: FluidReferenceOutcomeComparison,
  thresholds: ResidualBudgetThresholds
): ResidualBudgetComparison {
  const targetMidpoint = (comparison.expected.min + comparison.expected.max) / 2;
  const halfWidth = (comparison.expected.max - comparison.expected.min) / 2;
  if (halfWidth <= 0) {
    const exactPass = comparison.actual === comparison.expected.min && comparison.actual === comparison.expected.max;
    return {
      ...comparison,
      halfWidth,
      marginRatio: exactPass ? 1 : 0,
      nearestBoundMargin: 0,
      normalizedResidual: exactPass ? 0 : 1,
      risk: "exact",
      targetMidpoint,
    };
  }
  const nearestBoundMargin = Math.min(comparison.actual - comparison.expected.min, comparison.expected.max - comparison.actual);
  const marginRatio = nearestBoundMargin / halfWidth;
  const normalizedResidual = Math.abs(comparison.actual - targetMidpoint) / halfWidth;
  return {
    ...comparison,
    halfWidth,
    marginRatio,
    nearestBoundMargin,
    normalizedResidual,
    risk: marginRatio < thresholds.watchMarginRatio || normalizedResidual > thresholds.watchNormalizedResidual ? "watch" : "ok",
    targetMidpoint,
  };
}

function comparisonFailures(comparison: ResidualBudgetComparison, thresholds: ResidualBudgetThresholds): string[] {
  const inBand = comparison.actual >= comparison.expected.min && comparison.actual <= comparison.expected.max;
  if (comparison.halfWidth <= 0) {
    return comparison.pass && comparison.actual === comparison.expected.min && comparison.actual === comparison.expected.max
      ? []
      : [`${comparison.id} exact comparison expected ${comparison.expected.min}, got ${comparison.actual}`];
  }
  return [
    ...(comparison.pass ? [] : [`${comparison.id} source comparison did not pass`]),
    ...(Number.isFinite(comparison.actual) ? [] : [`${comparison.id} actual value was not finite`]),
    ...(inBand
      ? []
      : [`${comparison.id} was outside ${comparison.expected.min}..${comparison.expected.max} ${comparison.unit}, got ${comparison.actual}`]),
    ...(comparison.normalizedResidual <= thresholds.maxNormalizedResidual
      ? []
      : [`${comparison.id} normalized residual ${comparison.normalizedResidual.toFixed(4)} exceeded ${thresholds.maxNormalizedResidual}`]),
    ...(comparison.marginRatio >= thresholds.minContinuousMarginRatio
      ? []
      : [`${comparison.id} margin ratio ${comparison.marginRatio.toFixed(4)} was too close to tolerance edge`]),
  ];
}
