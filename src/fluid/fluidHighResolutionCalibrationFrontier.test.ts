import { describe, expect, it } from "vitest";
import {
  createFluidHighResolutionCalibrationFrontierReport,
  type FluidHighResolutionCalibrationFrontierOptions,
} from "./fluidHighResolutionCalibrationFrontier";
import type {
  FluidInstalledHighResolutionTargetResidualsReport,
  TargetResidualComparison,
} from "./fluidInstalledHighResolutionTargetResiduals";

describe("high-resolution calibration frontier gate", () => {
  it("passes by classifying drop target semantics separately from foam tuning", () => {
    const report = createFluidHighResolutionCalibrationFrontierReport(validOptions());

    expect(report.gate).toBe("G-FG-50");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.actionSummary.referenceTargetReviewIds).toContain("live-drop-speed-reference");
    expect(report.actionSummary.physicsTuningCandidateIds).toContain("live-foam-settled-buoyancy-error");
  });

  it("rejects weak source target residual or visual provenance", () => {
    const source = validSource();
    source.gate = "G-FG-47" as "G-FG-48";
    source.sourceVisualWatchdog.liveGrid = "768x432";
    const report = createFluidHighResolutionCalibrationFrontierReport({
      ...validOptions(),
      source,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("source target residual gate was G-FG-47");
    expect(report.failures.join(" ")).toContain("source visual watchdog live grid was 768x432");
  });

  it("rejects a frontier that no longer includes the required near-watch residuals", () => {
    const source = validSource();
    source.comparisons = source.comparisons.map((comparison) =>
      comparison.id === "live-foam-settled-buoyancy-error" ? { ...comparison, targetErrorRatio: 0.2 } : comparison
    );
    source.summary.worstTargetErrorRatio = 0.6973;
    const report = createFluidHighResolutionCalibrationFrontierReport({
      ...validOptions(),
      source,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("missing required frontier comparison live-foam-settled-buoyancy-error");
    expect(report.failures.join(" ")).toContain("foam settled buoyancy error must be a physics tuning candidate");
  });

  it("rejects attempts to treat concrete drop speed as a blind physics tuning item", () => {
    const source = validSource();
    source.comparisons = source.comparisons.map((comparison) =>
      comparison.id === "live-drop-speed-reference" ? { ...comparison, id: "live-drop-speed-reference-renamed" } : comparison
    );
    const report = createFluidHighResolutionCalibrationFrontierReport({
      ...validOptions(),
      source,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("missing required frontier comparison live-drop-speed-reference");
    expect(report.failures.join(" ")).toContain("drop speed residual must be a reference target review");
  });

  it("rejects a frontier with weak tolerance-margin no-regression evidence", () => {
    const source = validSource();
    source.summary.closestToleranceMarginRatio = 0.12;
    const report = createFluidHighResolutionCalibrationFrontierReport({
      ...validOptions(),
      source,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("closest tolerance margin 0.1200 was below 0.3");
  });
});

function validOptions(): FluidHighResolutionCalibrationFrontierOptions {
  return {
    generatedAt: "2026-06-09T00:00:00.000Z",
    source: validSource(),
    sourcePath: "docs/evidence/FG-48-installed-high-resolution-target-residuals-2026-06-08.json",
  };
}

function validSource(): FluidInstalledHighResolutionTargetResidualsReport {
  const comparisons = [
    comparison("live-drop-speed-reference", "drop", "target-midpoint", 0.6973137466910289, 0.3026862533089699),
    comparison("live-foam-settled-buoyancy-error", "damping", "lower-is-better", 0.6873015062027468, 0.31269849379725323),
    comparison("live-concrete-terminal-speed-reference", "sink", "target-midpoint", 0.3221873497984048, 0.6778126502015952),
    comparison("live-leaky-drum-sink-time-ratio-reference", "sink", "lower-is-better", 0.4059720256416371, 0.594027974358363),
    comparison("live-foam-settled-draft-error", "damping", "lower-is-better", 0.2331256974278143, 0.7668743025721857),
    comparison("live-ice-hydrostatic-draft-error", "float", "lower-is-better", 0.0918622978184791, 0.9081377021815209),
    comparison("live-splash-height-reference", "splash", "target-midpoint", 0.05597887558366321, 0.9440211244163368),
    comparison("live-ice-equilibrium-submerged-fraction-reference", "float", "target-midpoint", 0, 1),
    comparison("live-foam-equilibrium-window", "damping", "exact", 0, 1),
    comparison("live-concrete-sink-phase", "sink", "exact", 0, 1),
  ];

  return {
    comparisons,
    failures: [],
    gate: "G-FG-48",
    generatedAt: "2026-06-09T00:00:00.000Z",
    pass: true,
    sourceResidualBudget: {
      closestMarginRatio: 0.1837245956369582,
      comparisonCount: 10,
      failures: [],
      gate: "G-FG-46",
      pass: true,
      sourcePath: "docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json",
      worstNormalizedResidual: 0.8162754043630418,
    },
    sourceVisualWatchdog: {
      blankSampleIds: [],
      flatSampleIds: [],
      gate: "G-FG-47",
      liveGrid: "1024x576",
      pass: true,
      sampleCount: 6,
      sourcePath: "docs/evidence/FG-47-installed-high-resolution-visual-watchdog-2026-06-08.json",
      waterFrameDelta: 440,
    },
    summary: {
      categories: ["damping", "drop", "float", "sink", "splash"],
      closestToleranceMarginRatio: 0.3026862533089699,
      comparisonCount: 10,
      objectiveCounts: {
        exact: 2,
        "lower-is-better": 4,
        "target-midpoint": 4,
      },
      targetWatchComparisonIds: [],
      toleranceWatchComparisonIds: [],
      worstTargetErrorRatio: 0.6973137466910289,
    },
    thresholds: {
      maxTargetErrorRatio: 0.85,
      minToleranceMarginRatio: 0.05,
      watchTargetErrorRatio: 0.7,
      watchToleranceMarginRatio: 0.12,
    },
  };
}

function comparison(
  id: string,
  category: TargetResidualComparison["category"],
  objective: TargetResidualComparison["objective"],
  targetErrorRatio: number,
  toleranceMarginRatio: number
): TargetResidualComparison {
  return {
    actual: targetErrorRatio,
    category,
    expected: {
      max: 1,
      min: 0,
    },
    halfWidth: 0.5,
    id,
    marginRatio: toleranceMarginRatio,
    nearestBoundMargin: toleranceMarginRatio,
    normalizedResidual: targetErrorRatio,
    objective,
    pass: true,
    risk: "ok",
    targetErrorRatio,
    targetMidpoint: 0.5,
    targetRisk: targetErrorRatio >= 0.7 ? "watch" : "ok",
    targetValue: 0,
    toleranceMarginRatio,
    unit: "ratio",
  };
}
