import type {
  FluidInstalledHighResolutionTargetResidualsReport,
  TargetResidualComparison,
} from "./fluidInstalledHighResolutionTargetResiduals";

export type FluidHighResolutionCalibrationFrontierGate = "G-FG-50";

export type CalibrationFrontierActionKind = "monitor" | "physics-tuning-candidate" | "reference-target-review";

export type CalibrationFrontierEntry = {
  actionKind: CalibrationFrontierActionKind;
  category: string;
  comparisonId: string;
  objective: string;
  priority: number;
  reason: string;
  targetErrorRatio: number;
  toleranceMarginRatio: number;
};

export type FluidHighResolutionCalibrationFrontierReport = {
  actionSummary: {
    monitorCount: number;
    physicsTuningCandidateIds: string[];
    referenceTargetReviewIds: string[];
  };
  failures: string[];
  frontier: CalibrationFrontierEntry[];
  gate: FluidHighResolutionCalibrationFrontierGate;
  generatedAt: string;
  noRegressionGuard: {
    acceptedBandsPreserved: boolean;
    comparisonCount: number;
    maxAllowedTargetErrorRatio: number;
    minAllowedToleranceMarginRatio: number;
    objectiveCounts: Record<string, number>;
    sourceGate: string;
    sourceVisualGate: string;
    sourceVisualLiveGrid: string | null;
  };
  pass: boolean;
  sourcePath: string;
  thresholds: {
    frontierTargetErrorRatio: number;
    minFrontierItems: number;
    minToleranceMarginRatio: number;
  };
};

export type FluidHighResolutionCalibrationFrontierOptions = {
  generatedAt?: string;
  source: FluidInstalledHighResolutionTargetResidualsReport;
  sourcePath: string;
  thresholds?: Partial<FluidHighResolutionCalibrationFrontierReport["thresholds"]>;
};

const defaultThresholds: FluidHighResolutionCalibrationFrontierReport["thresholds"] = {
  frontierTargetErrorRatio: 0.65,
  minFrontierItems: 2,
  minToleranceMarginRatio: 0.3,
};

const requiredFrontierIds = ["live-drop-speed-reference", "live-foam-settled-buoyancy-error"];

export function createFluidHighResolutionCalibrationFrontierReport(
  options: FluidHighResolutionCalibrationFrontierOptions
): FluidHighResolutionCalibrationFrontierReport {
  const thresholds = { ...defaultThresholds, ...options.thresholds };
  const sortedComparisons = options.source.comparisons
    .slice()
    .sort((left, right) => right.targetErrorRatio - left.targetErrorRatio || left.toleranceMarginRatio - right.toleranceMarginRatio);
  const frontier = sortedComparisons.map((comparison, index) => frontierEntryFor(comparison, index + 1, thresholds));
  const activeFrontier = frontier.filter((entry) => entry.targetErrorRatio >= thresholds.frontierTargetErrorRatio);
  const activeFrontierIds = new Set(activeFrontier.map((entry) => entry.comparisonId));
  const physicsTuningCandidateIds = frontier
    .filter((entry) => entry.actionKind === "physics-tuning-candidate")
    .map((entry) => entry.comparisonId);
  const referenceTargetReviewIds = frontier
    .filter((entry) => entry.actionKind === "reference-target-review")
    .map((entry) => entry.comparisonId);
  const monitorCount = frontier.filter((entry) => entry.actionKind === "monitor").length;

  const noRegressionGuard = {
    acceptedBandsPreserved: options.source.comparisons.every((comparison) => comparison.pass),
    comparisonCount: options.source.summary.comparisonCount,
    maxAllowedTargetErrorRatio: options.source.thresholds.maxTargetErrorRatio,
    minAllowedToleranceMarginRatio: options.source.thresholds.minToleranceMarginRatio,
    objectiveCounts: options.source.summary.objectiveCounts,
    sourceGate: options.source.gate,
    sourceVisualGate: options.source.sourceVisualWatchdog.gate,
    sourceVisualLiveGrid: options.source.sourceVisualWatchdog.liveGrid,
  };

  const failures = [
    ...(options.source.gate === "G-FG-48" ? [] : [`source target residual gate was ${options.source.gate}`]),
    ...(options.source.pass ? [] : options.source.failures.map((failure) => `source target residual ${failure}`)),
    ...(options.source.sourceVisualWatchdog.gate === "G-FG-47"
      ? []
      : [`source visual watchdog gate was ${options.source.sourceVisualWatchdog.gate}`]),
    ...(options.source.sourceVisualWatchdog.liveGrid === "1024x576"
      ? []
      : [`source visual watchdog live grid was ${options.source.sourceVisualWatchdog.liveGrid ?? "missing"}`]),
    ...(options.source.summary.comparisonCount >= 10 ? [] : [`source comparison count was ${options.source.summary.comparisonCount}`]),
    ...(noRegressionGuard.acceptedBandsPreserved ? [] : ["source comparisons did not all preserve accepted bands"]),
    ...(options.source.summary.closestToleranceMarginRatio >= thresholds.minToleranceMarginRatio
      ? []
      : [
          `closest tolerance margin ${options.source.summary.closestToleranceMarginRatio.toFixed(4)} was below ${thresholds.minToleranceMarginRatio}`,
        ]),
    ...(activeFrontier.length >= thresholds.minFrontierItems
      ? []
      : [`frontier item count ${activeFrontier.length} was below ${thresholds.minFrontierItems}`]),
    ...requiredFrontierIds.flatMap((id) => (activeFrontierIds.has(id) ? [] : [`missing required frontier comparison ${id}`])),
    ...(physicsTuningCandidateIds.includes("live-foam-settled-buoyancy-error")
      ? []
      : ["foam settled buoyancy error must be a physics tuning candidate"]),
    ...(referenceTargetReviewIds.includes("live-drop-speed-reference")
      ? []
      : ["drop speed residual must be a reference target review, not a blind drag tuning item"]),
  ];

  return {
    actionSummary: {
      monitorCount,
      physicsTuningCandidateIds,
      referenceTargetReviewIds,
    },
    failures,
    frontier,
    gate: "G-FG-50",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    noRegressionGuard,
    pass: failures.length === 0,
    sourcePath: options.sourcePath,
    thresholds,
  };
}

function frontierEntryFor(
  comparison: TargetResidualComparison,
  priority: number,
  thresholds: FluidHighResolutionCalibrationFrontierReport["thresholds"]
): CalibrationFrontierEntry {
  if (comparison.id === "live-drop-speed-reference" && comparison.targetErrorRatio >= thresholds.frontierTargetErrorRatio) {
    return {
      actionKind: "reference-target-review",
      category: comparison.category,
      comparisonId: comparison.id,
      objective: comparison.objective,
      priority,
      reason:
        "Concrete entry speed is close to the vacuum free-fall upper bound; review the reference target or add measured drag footage before any blind drag tuning.",
      targetErrorRatio: comparison.targetErrorRatio,
      toleranceMarginRatio: comparison.toleranceMarginRatio,
    };
  }

  if (comparison.id === "live-foam-settled-buoyancy-error" && comparison.targetErrorRatio >= thresholds.frontierTargetErrorRatio) {
    return {
      actionKind: "physics-tuning-candidate",
      category: comparison.category,
      comparisonId: comparison.id,
      objective: comparison.objective,
      priority,
      reason:
        "Foam damping is a lower-is-better equilibrium error with source-backed zero target; tune settling/damping or sampling only if all accepted bands remain preserved.",
      targetErrorRatio: comparison.targetErrorRatio,
      toleranceMarginRatio: comparison.toleranceMarginRatio,
    };
  }

  return {
    actionKind: "monitor",
    category: comparison.category,
    comparisonId: comparison.id,
    objective: comparison.objective,
    priority,
    reason:
      comparison.targetErrorRatio >= thresholds.frontierTargetErrorRatio
        ? "Near-frontier residual needs classification before tuning."
        : "Residual is below the current frontier threshold; preserve as no-regression evidence.",
    targetErrorRatio: comparison.targetErrorRatio,
    toleranceMarginRatio: comparison.toleranceMarginRatio,
  };
}
