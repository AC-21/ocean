import { describe, expect, it } from "vitest";
import {
  createFluidInstalledHighResolutionTargetResidualsReport,
  type FluidInstalledHighResolutionTargetResidualsOptions,
} from "./fluidInstalledHighResolutionTargetResiduals";
import type {
  FluidInstalledHighResolutionResidualBudgetReport,
  ResidualBudgetComparison,
} from "./fluidInstalledHighResolutionResidualBudget";
import type { FluidInstalledHighResolutionVisualWatchdogReport } from "./fluidInstalledHighResolutionVisualWatchdog";
import type { FluidReferenceOutcomeCategory, FluidReferenceOutcomeComparison } from "./fluidUltraReferenceOutcomes";

describe("installed high-resolution target residuals gate", () => {
  it("passes with target-aware residual semantics over FG-46 and FG-47 evidence", () => {
    const report = createFluidInstalledHighResolutionTargetResidualsReport(validOptions());
    const iceDraft = comparisonById(report, "live-ice-hydrostatic-draft-error");

    expect(report.gate).toBe("G-FG-48");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.summary.objectiveCounts).toEqual({
      exact: 2,
      "lower-is-better": 4,
      "target-midpoint": 4,
    });
    expect(iceDraft.objective).toBe("lower-is-better");
    expect(iceDraft.targetValue).toBe(0);
    expect(iceDraft.targetErrorRatio).toBeLessThan(0.1);
    expect(iceDraft.toleranceMarginRatio).toBeGreaterThan(0.9);
    expect(report.summary.targetWatchComparisonIds).toEqual([]);
  });

  it("rejects a comparison without an explicit target objective", () => {
    const sourceResidualBudget = residualBudget();
    sourceResidualBudget.comparisons.push(
      residualComparison(comparison("live-extra-error", "float", 0.01, 0, 0.02, "m"))
    );
    sourceResidualBudget.summary.comparisonCount = sourceResidualBudget.comparisons.length;
    const report = createFluidInstalledHighResolutionTargetResidualsReport({
      ...validOptions(),
      sourceResidualBudget,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("live-extra-error target objective was not classified");
  });

  it("rejects lower-is-better metrics near the upper tolerance edge", () => {
    const sourceResidualBudget = residualBudget();
    sourceResidualBudget.comparisons = sourceResidualBudget.comparisons.map((comparison) =>
      comparison.id === "live-ice-hydrostatic-draft-error"
        ? residualComparison({ ...comparison, actual: 0.053, pass: true })
        : comparison
    );
    const report = createFluidInstalledHighResolutionTargetResidualsReport({
      ...validOptions(),
      sourceResidualBudget,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("live-ice-hydrostatic-draft-error target error ratio");
    expect(report.failures.join(" ")).toContain("tolerance margin ratio");
  });

  it("rejects midpoint-target metrics that are too far from the target", () => {
    const sourceResidualBudget = residualBudget();
    sourceResidualBudget.comparisons = sourceResidualBudget.comparisons.map((comparison) =>
      comparison.id === "live-drop-speed-reference"
        ? residualComparison({ ...comparison, actual: 11.04, pass: true })
        : comparison
    );
    const report = createFluidInstalledHighResolutionTargetResidualsReport({
      ...validOptions(),
      sourceResidualBudget,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("live-drop-speed-reference target error ratio");
  });

  it("rejects exact comparisons that drift away from the exact target", () => {
    const sourceResidualBudget = residualBudget();
    sourceResidualBudget.comparisons = sourceResidualBudget.comparisons.map((comparison) =>
      comparison.id === "live-foam-equilibrium-window"
        ? residualComparison({ ...comparison, actual: 0, expected: { min: 1, max: 1 }, pass: false })
        : comparison
    );
    const report = createFluidInstalledHighResolutionTargetResidualsReport({
      ...validOptions(),
      sourceResidualBudget,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("live-foam-equilibrium-window source comparison did not pass");
    expect(report.failures.join(" ")).toContain("live-foam-equilibrium-window was outside");
  });

  it("rejects weak source visual watchdog evidence", () => {
    const sourceVisualWatchdog = visualWatchdog();
    sourceVisualWatchdog.summary.blankSampleIds = ["post-drop-2"];
    sourceVisualWatchdog.summary.postDropActivePhysicsSeen = false;
    const report = createFluidInstalledHighResolutionTargetResidualsReport({
      ...validOptions(),
      sourceVisualWatchdog,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("source visual watchdog blank samples post-drop-2");
    expect(report.failures.join(" ")).toContain("source visual watchdog never observed post-drop active physics");
  });
});

function validOptions(): FluidInstalledHighResolutionTargetResidualsOptions {
  return {
    generatedAt: "2026-06-08T00:00:00.000Z",
    sourceResidualBudget: residualBudget(),
    sourceResidualBudgetPath: "docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json",
    sourceVisualWatchdog: visualWatchdog(),
    sourceVisualWatchdogPath: "docs/evidence/FG-47-installed-high-resolution-visual-watchdog-2026-06-08.json",
  };
}

function comparisonById(
  report: ReturnType<typeof createFluidInstalledHighResolutionTargetResidualsReport>,
  id: string
) {
  const entry = report.comparisons.find((comparison) => comparison.id === id);
  expect(entry).toBeDefined();
  return entry!;
}

function residualBudget(): FluidInstalledHighResolutionResidualBudgetReport {
  const comparisons = referenceComparisons().map(residualComparison);
  return {
    comparisons,
    failures: [],
    gate: "G-FG-46",
    generatedAt: "2026-06-08T00:00:00.000Z",
    operatorReadout: {
      gate: "G-FG-45",
      liveGrid: "1024x576",
      outcomeClasses: ["floats-indefinitely", "sinks-immediately", "waterlogs-then-sinks"],
      pass: true,
      scenarioCount: 3,
      sourcePath: "docs/evidence/FG-45-installed-high-resolution-operator-readout-2026-06-08.json",
    },
    pass: true,
    sourceReference: {
      categories: ["damping", "drop", "float", "sink", "splash"],
      coreGate: "G-FG-40",
      corePass: true,
      gate: "G-FG-42",
      liveGrid: "1024x576",
      noFullGridReadbackPerFrame: true,
      pass: true,
      referenceCaseCount: 5,
      referenceComparisonCount: 10,
      sourcePath: "docs/evidence/FG-42-installed-high-resolution-reference-pacing-2026-06-08.json",
    },
    summary: {
      categories: ["damping", "drop", "float", "sink", "splash"],
      closestMarginRatio: Math.min(1, ...comparisons.filter((comparison) => comparison.halfWidth > 0).map((comparison) => comparison.marginRatio)),
      comparisonCount: comparisons.length,
      exactComparisonCount: 2,
      watchComparisonIds: [],
      worstNormalizedResidual: Math.max(0, ...comparisons.map((comparison) => comparison.normalizedResidual)),
    },
    thresholds: {
      maxNormalizedResidual: 0.95,
      minContinuousMarginRatio: 0.05,
      watchMarginRatio: 0.1,
      watchNormalizedResidual: 0.85,
    },
  };
}

function visualWatchdog(): FluidInstalledHighResolutionVisualWatchdogReport {
  return {
    failures: [],
    gate: "G-FG-47",
    pass: true,
    runtime: {
      liveGrid: "1024x576",
      renderer: "webgpu-grid-primary-v1",
      waterContext: "webgpu",
      waterFrames: 470,
    },
    summary: {
      blankSampleIds: [],
      flatSampleIds: [],
      postDropActivePhysicsSeen: true,
      sampleCount: 6,
      waterFrameDelta: 440,
    },
  } as unknown as FluidInstalledHighResolutionVisualWatchdogReport;
}

function referenceComparisons(): FluidReferenceOutcomeComparison[] {
  return [
    comparison("live-drop-speed-reference", "drop", 12.2987408697401, 11.023081064747732, 12.526228482667877, "m/s"),
    comparison("live-splash-height-reference", "splash", 2.1240271407175224, 0.8236857697731332, 3.578584361264341, "m"),
    comparison("live-ice-equilibrium-submerged-fraction-reference", "float", 0.8946341463414634, 0.8596341463414634, 0.9296341463414635, "fraction"),
    comparison("live-ice-hydrostatic-draft-error", "float", 0.0050524263800163505, 0, 0.055, "m"),
    comparison("live-foam-settled-draft-error", "damping", 0.01282191448809307, 0, 0.055, "m"),
    comparison("live-foam-settled-buoyancy-error", "damping", 0.05498412181827967, 0, 0.08, "ratio"),
    comparison("live-foam-equilibrium-window", "damping", 1, 1, 1, "boolean"),
    comparison("live-concrete-terminal-speed-reference", "sink", 3.3726264597690814, 1, 8, "m/s"),
    comparison("live-concrete-sink-phase", "sink", 1, 1, 1, "boolean"),
    comparison("live-leaky-drum-sink-time-ratio-reference", "sink", 0.2232846141029004, 0, 0.55, "ratio"),
  ];
}

function comparison(
  id: string,
  category: FluidReferenceOutcomeCategory,
  actual: number,
  min: number,
  max: number,
  unit: string
): FluidReferenceOutcomeComparison {
  return {
    actual,
    category,
    expected: { max, min },
    id,
    pass: actual >= min && actual <= max,
    unit,
  } as FluidReferenceOutcomeComparison;
}

function residualComparison(comparison: FluidReferenceOutcomeComparison): ResidualBudgetComparison {
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
    risk: marginRatio < 0.1 || normalizedResidual > 0.85 ? "watch" : "ok",
    targetMidpoint,
  };
}
