import type {
  FluidInstalledHighResolutionResidualBudgetReport,
  ResidualBudgetComparison,
} from "./fluidInstalledHighResolutionResidualBudget";
import type { FluidInstalledHighResolutionVisualWatchdogReport } from "./fluidInstalledHighResolutionVisualWatchdog";
import type { FluidReferenceOutcomeCategory } from "./fluidUltraReferenceOutcomes";

export type FluidInstalledHighResolutionTargetResidualsGate = "G-FG-48";

export type TargetResidualObjective = "exact" | "lower-is-better" | "target-midpoint";
export type TargetResidualRisk = "exact" | "ok" | "watch";

export type TargetResidualComparison = ResidualBudgetComparison & {
  objective: TargetResidualObjective;
  targetErrorRatio: number;
  targetValue: number;
  toleranceMarginRatio: number;
  targetRisk: TargetResidualRisk;
};

export type TargetResidualThresholds = {
  maxTargetErrorRatio: number;
  minToleranceMarginRatio: number;
  watchTargetErrorRatio: number;
  watchToleranceMarginRatio: number;
};

export type FluidInstalledHighResolutionTargetResidualsReport = {
  comparisons: TargetResidualComparison[];
  failures: string[];
  gate: FluidInstalledHighResolutionTargetResidualsGate;
  generatedAt: string;
  pass: boolean;
  sourceResidualBudget: {
    closestMarginRatio: number;
    comparisonCount: number;
    failures: string[];
    gate: string;
    pass: boolean;
    sourcePath: string;
    worstNormalizedResidual: number;
  };
  sourceVisualWatchdog: {
    blankSampleIds: string[];
    flatSampleIds: string[];
    gate: string;
    liveGrid: string | null;
    pass: boolean;
    sampleCount: number;
    sourcePath: string;
    waterFrameDelta: number;
  };
  summary: {
    categories: FluidReferenceOutcomeCategory[];
    closestToleranceMarginRatio: number;
    comparisonCount: number;
    objectiveCounts: Record<TargetResidualObjective, number>;
    targetWatchComparisonIds: string[];
    toleranceWatchComparisonIds: string[];
    worstTargetErrorRatio: number;
  };
  thresholds: TargetResidualThresholds;
};

export type FluidInstalledHighResolutionTargetResidualsOptions = {
  generatedAt?: string;
  sourceResidualBudget: FluidInstalledHighResolutionResidualBudgetReport;
  sourceResidualBudgetPath: string;
  sourceVisualWatchdog: FluidInstalledHighResolutionVisualWatchdogReport;
  sourceVisualWatchdogPath: string;
  thresholds?: Partial<TargetResidualThresholds>;
};

export const installedHighResolutionTargetResidualThresholds: TargetResidualThresholds = {
  maxTargetErrorRatio: 0.85,
  minToleranceMarginRatio: 0.05,
  watchTargetErrorRatio: 0.7,
  watchToleranceMarginRatio: 0.12,
};

const objectiveByComparisonId: Record<string, TargetResidualObjective> = {
  "live-concrete-sink-phase": "exact",
  "live-concrete-terminal-speed-reference": "target-midpoint",
  "live-drop-speed-reference": "target-midpoint",
  "live-foam-equilibrium-window": "exact",
  "live-foam-settled-buoyancy-error": "lower-is-better",
  "live-foam-settled-draft-error": "lower-is-better",
  "live-ice-equilibrium-submerged-fraction-reference": "target-midpoint",
  "live-ice-hydrostatic-draft-error": "lower-is-better",
  "live-leaky-drum-sink-time-ratio-reference": "lower-is-better",
  "live-splash-height-reference": "target-midpoint",
};

const requiredComparisonIds = Object.keys(objectiveByComparisonId);
const requiredCategories: FluidReferenceOutcomeCategory[] = ["damping", "drop", "float", "sink", "splash"];

export function createFluidInstalledHighResolutionTargetResidualsReport(
  options: FluidInstalledHighResolutionTargetResidualsOptions
): FluidInstalledHighResolutionTargetResidualsReport {
  const thresholds = { ...installedHighResolutionTargetResidualThresholds, ...options.thresholds };
  const comparisons = options.sourceResidualBudget.comparisons.map((comparison) => targetResidualForComparison(comparison, thresholds));
  const comparisonIds = new Set(comparisons.map((comparison) => comparison.id));
  const categories = Array.from(new Set(comparisons.map((comparison) => comparison.category))).sort() as FluidReferenceOutcomeCategory[];
  const targetWatchComparisonIds = comparisons.filter((comparison) => comparison.targetRisk === "watch").map((comparison) => comparison.id);
  const toleranceWatchComparisonIds = comparisons
    .filter((comparison) => comparison.toleranceMarginRatio < thresholds.watchToleranceMarginRatio && comparison.objective !== "exact")
    .map((comparison) => comparison.id);
  const objectiveCounts = comparisons.reduce<Record<TargetResidualObjective, number>>(
    (counts, comparison) => {
      counts[comparison.objective] += 1;
      return counts;
    },
    { exact: 0, "lower-is-better": 0, "target-midpoint": 0 }
  );

  const failures = [
    ...sourceResidualFailures(options.sourceResidualBudget),
    ...sourceWatchdogFailures(options.sourceVisualWatchdog),
    ...requiredComparisonIds.flatMap((id) => (comparisonIds.has(id) ? [] : [`missing target residual comparison ${id}`])),
    ...requiredCategories.flatMap((category) => (categories.includes(category) ? [] : [`missing target residual category ${category}`])),
    ...(objectiveCounts["lower-is-better"] >= 4 ? [] : [`lower-is-better objective count was ${objectiveCounts["lower-is-better"]}`]),
    ...(objectiveCounts["target-midpoint"] >= 4 ? [] : [`target-midpoint objective count was ${objectiveCounts["target-midpoint"]}`]),
    ...(objectiveCounts.exact >= 2 ? [] : [`exact objective count was ${objectiveCounts.exact}`]),
    ...comparisons.flatMap((comparison) => targetComparisonFailures(comparison, thresholds)),
  ];

  return {
    comparisons,
    failures,
    gate: "G-FG-48",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
    sourceResidualBudget: {
      closestMarginRatio: options.sourceResidualBudget.summary.closestMarginRatio,
      comparisonCount: options.sourceResidualBudget.summary.comparisonCount,
      failures: options.sourceResidualBudget.failures,
      gate: options.sourceResidualBudget.gate,
      pass: options.sourceResidualBudget.pass,
      sourcePath: options.sourceResidualBudgetPath,
      worstNormalizedResidual: options.sourceResidualBudget.summary.worstNormalizedResidual,
    },
    sourceVisualWatchdog: {
      blankSampleIds: options.sourceVisualWatchdog.summary.blankSampleIds,
      flatSampleIds: options.sourceVisualWatchdog.summary.flatSampleIds,
      gate: options.sourceVisualWatchdog.gate,
      liveGrid: options.sourceVisualWatchdog.runtime.liveGrid,
      pass: options.sourceVisualWatchdog.pass,
      sampleCount: options.sourceVisualWatchdog.summary.sampleCount,
      sourcePath: options.sourceVisualWatchdogPath,
      waterFrameDelta: options.sourceVisualWatchdog.summary.waterFrameDelta,
    },
    summary: {
      categories,
      closestToleranceMarginRatio: Math.min(1, ...comparisons.map((comparison) => comparison.toleranceMarginRatio)),
      comparisonCount: comparisons.length,
      objectiveCounts,
      targetWatchComparisonIds,
      toleranceWatchComparisonIds,
      worstTargetErrorRatio: Math.max(0, ...comparisons.map((comparison) => comparison.targetErrorRatio)),
    },
    thresholds,
  };
}

function sourceResidualFailures(source: FluidInstalledHighResolutionResidualBudgetReport): string[] {
  return [
    ...(source.gate === "G-FG-46" ? [] : [`source residual gate was ${source.gate}`]),
    ...(source.pass ? [] : source.failures.map((failure) => `source residual ${failure}`)),
    ...(source.summary.comparisonCount >= 10 ? [] : [`source residual comparison count was ${source.summary.comparisonCount}`]),
    ...(source.sourceReference.liveGrid === "1024x576"
      ? []
      : [`source residual reference live grid was ${source.sourceReference.liveGrid ?? "missing"}`]),
    ...(source.operatorReadout.liveGrid === "1024x576"
      ? []
      : [`source residual operator live grid was ${source.operatorReadout.liveGrid ?? "missing"}`]),
    ...(source.sourceReference.noFullGridReadbackPerFrame ? [] : ["source residual reference used full-grid readback"]),
  ];
}

function sourceWatchdogFailures(source: FluidInstalledHighResolutionVisualWatchdogReport): string[] {
  return [
    ...(source.gate === "G-FG-47" ? [] : [`source visual watchdog gate was ${source.gate}`]),
    ...(source.pass ? [] : source.failures.map((failure) => `source visual watchdog ${failure}`)),
    ...(source.runtime.liveGrid === "1024x576" ? [] : [`source visual watchdog live grid was ${source.runtime.liveGrid ?? "missing"}`]),
    ...(source.summary.sampleCount >= 6 ? [] : [`source visual watchdog sample count was ${source.summary.sampleCount}`]),
    ...(source.summary.waterFrameDelta >= 24 ? [] : [`source visual watchdog water frame delta was ${source.summary.waterFrameDelta}`]),
    ...(source.summary.blankSampleIds.length === 0 ? [] : [`source visual watchdog blank samples ${source.summary.blankSampleIds.join(", ")}`]),
    ...(source.summary.flatSampleIds.length === 0 ? [] : [`source visual watchdog flat samples ${source.summary.flatSampleIds.join(", ")}`]),
    ...(source.summary.postDropActivePhysicsSeen ? [] : ["source visual watchdog never observed post-drop active physics"]),
  ];
}

function targetResidualForComparison(
  comparison: ResidualBudgetComparison,
  thresholds: TargetResidualThresholds
): TargetResidualComparison {
  const objective = objectiveByComparisonId[comparison.id];
  if (!objective) {
    return {
      ...comparison,
      objective: "target-midpoint",
      targetErrorRatio: 1,
      targetRisk: "watch",
      targetValue: comparison.targetMidpoint,
      toleranceMarginRatio: Math.max(0, comparison.marginRatio),
    };
  }
  if (objective === "exact") {
    const exact = comparison.actual === comparison.expected.min && comparison.actual === comparison.expected.max;
    return {
      ...comparison,
      objective,
      targetErrorRatio: exact ? 0 : 1,
      targetRisk: "exact",
      targetValue: comparison.expected.min,
      toleranceMarginRatio: exact ? 1 : 0,
    };
  }
  if (objective === "lower-is-better") {
    const width = Math.max(1e-9, comparison.expected.max - comparison.expected.min);
    const targetErrorRatio = Math.max(0, (comparison.actual - comparison.expected.min) / width);
    const toleranceMarginRatio = Math.max(0, (comparison.expected.max - comparison.actual) / width);
    return {
      ...comparison,
      objective,
      targetErrorRatio,
      targetRisk: targetErrorRatio > thresholds.watchTargetErrorRatio ? "watch" : "ok",
      targetValue: comparison.expected.min,
      toleranceMarginRatio,
    };
  }
  return {
    ...comparison,
    objective,
    targetErrorRatio: comparison.normalizedResidual,
    targetRisk: comparison.normalizedResidual > thresholds.watchTargetErrorRatio ? "watch" : "ok",
    targetValue: comparison.targetMidpoint,
    toleranceMarginRatio: comparison.marginRatio,
  };
}

function targetComparisonFailures(comparison: TargetResidualComparison, thresholds: TargetResidualThresholds): string[] {
  const inBand = comparison.actual >= comparison.expected.min && comparison.actual <= comparison.expected.max;
  return [
    ...(objectiveByComparisonId[comparison.id] ? [] : [`${comparison.id} target objective was not classified`]),
    ...(comparison.pass ? [] : [`${comparison.id} source comparison did not pass`]),
    ...(inBand
      ? []
      : [`${comparison.id} was outside ${comparison.expected.min}..${comparison.expected.max} ${comparison.unit}, got ${comparison.actual}`]),
    ...(comparison.targetErrorRatio <= thresholds.maxTargetErrorRatio
      ? []
      : [`${comparison.id} target error ratio ${comparison.targetErrorRatio.toFixed(4)} exceeded ${thresholds.maxTargetErrorRatio}`]),
    ...(comparison.toleranceMarginRatio >= thresholds.minToleranceMarginRatio
      ? []
      : [`${comparison.id} tolerance margin ratio ${comparison.toleranceMarginRatio.toFixed(4)} was too close to the failing edge`]),
  ];
}
