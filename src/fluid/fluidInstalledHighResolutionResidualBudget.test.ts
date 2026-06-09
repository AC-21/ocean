import { describe, expect, it } from "vitest";
import {
  createFluidInstalledHighResolutionResidualBudgetReport,
  type FluidInstalledHighResolutionResidualBudgetOptions,
} from "./fluidInstalledHighResolutionResidualBudget";
import type { FluidInstalledHighResolutionOperatorReadoutReport } from "./fluidInstalledHighResolutionOperatorReadout";
import type { FluidInstalledHighResolutionReferencePacingReport } from "./fluidInstalledHighResolutionReferencePacing";
import type { FluidReferenceOutcomeComparison } from "./fluidUltraReferenceOutcomes";

describe("installed high-resolution residual budget gate", () => {
  it("passes with structured high-resolution reference comparisons and operator snapshot evidence", () => {
    const report = createFluidInstalledHighResolutionResidualBudgetReport(validOptions());

    expect(report.gate).toBe("G-FG-46");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.summary.categories).toEqual(["damping", "drop", "float", "sink", "splash"]);
    expect(report.summary.comparisonCount).toBe(10);
    expect(report.summary.watchComparisonIds).toContain("live-ice-hydrostatic-draft-error");
    expect(report.summary.worstNormalizedResidual).toBeGreaterThan(0.9);
    expect(report.summary.closestMarginRatio).toBeGreaterThan(0.05);
  });

  it("rejects missing reference categories and comparison ids", () => {
    const sourceReference = validSourceReference();
    sourceReference.coreReference.comparisons = sourceReference.coreReference.comparisons.filter((comparison) => comparison.category !== "splash");
    sourceReference.coreReference.summary.comparisonCount = sourceReference.coreReference.comparisons.length;
    sourceReference.summary.referenceComparisonCount = sourceReference.coreReference.comparisons.length;
    const report = createFluidInstalledHighResolutionResidualBudgetReport({
      ...validOptions(),
      sourceReference,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("missing residual comparison live-splash-height-reference");
    expect(report.failures.join(" ")).toContain("missing residual category splash");
    expect(report.failures.join(" ")).toContain("UI-only evidence is not accepted");
  });

  it("rejects values outside a reference band", () => {
    const sourceReference = validSourceReference();
    sourceReference.coreReference.comparisons = sourceReference.coreReference.comparisons.map((comparison) =>
      comparison.id === "live-drop-speed-reference" ? { ...comparison, actual: 13.2, pass: false } : comparison
    );
    const report = createFluidInstalledHighResolutionResidualBudgetReport({
      ...validOptions(),
      sourceReference,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("live-drop-speed-reference source comparison did not pass");
    expect(report.failures.join(" ")).toContain("live-drop-speed-reference was outside");
  });

  it("rejects values that are technically inside the band but too close to the tolerance edge", () => {
    const sourceReference = validSourceReference();
    sourceReference.coreReference.comparisons = sourceReference.coreReference.comparisons.map((comparison) =>
      comparison.id === "live-ice-hydrostatic-draft-error" ? { ...comparison, actual: 0.054, pass: true } : comparison
    );
    const report = createFluidInstalledHighResolutionResidualBudgetReport({
      ...validOptions(),
      sourceReference,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("live-ice-hydrostatic-draft-error margin ratio");
    expect(report.failures.join(" ")).toContain("too close to tolerance edge");
  });

  it("rejects operator readouts backed only by UI text", () => {
    const operatorReadout = validOperatorReadout();
    operatorReadout.scenarios = operatorReadout.scenarios.map((scenario) => ({
      ...scenario,
      samples: [],
    }));
    const report = createFluidInstalledHighResolutionResidualBudgetReport({
      ...validOptions(),
      operatorReadout,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("UI-only readouts are not accepted");
  });

  it("rejects fallback grids and missing no-readback provenance", () => {
    const sourceReference = validSourceReference();
    sourceReference.runtime.liveGrid = "768x432";
    sourceReference.coreReference.noFullGridReadbackPerFrame = false;
    sourceReference.coreReference.cases[0].telemetry.noFullGridReadbackPerFrame = false;
    const operatorReadout = validOperatorReadout();
    operatorReadout.runtime.liveGrid = "768x432";
    operatorReadout.scenarios[0].telemetry.pressureNoFullGridReadback = false;
    const report = createFluidInstalledHighResolutionResidualBudgetReport({
      ...validOptions(),
      operatorReadout,
      sourceReference,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("source reference live grid was 768x432");
    expect(report.failures.join(" ")).toContain("core reference used full-grid readback");
    expect(report.failures.join(" ")).toContain("operator readout live grid was 768x432");
    expect(report.failures.join(" ")).toContain("operator readout lost pressure or particle no-readback telemetry");
  });
});

function validOptions(): FluidInstalledHighResolutionResidualBudgetOptions {
  return {
    generatedAt: "2026-06-08T00:00:00.000Z",
    operatorReadout: validOperatorReadout(),
    operatorReadoutPath: "docs/evidence/FG-45-installed-high-resolution-operator-readout-2026-06-08.json",
    sourceReference: validSourceReference(),
    sourceReferencePath: "docs/evidence/FG-42-installed-high-resolution-reference-pacing-2026-06-08.json",
  };
}

function validSourceReference(): FluidInstalledHighResolutionReferencePacingReport {
  return {
    coreReference: {
      cases: Array.from({ length: 5 }, (_, index) => ({
        telemetry: {
          noFullGridReadbackPerFrame: true,
          particlesNoFullGridReadbackPerFrame: true,
        },
        id: `case-${index}`,
        pass: true,
      })),
      comparisons: referenceComparisons(),
      failures: [],
      gate: "G-FG-40",
      noFullGridReadbackPerFrame: true,
      pass: true,
      summary: {
        capabilityGrid: "768x432",
        caseCount: 5,
        categories: ["damping", "drop", "float", "sink", "splash"],
        comparisonCount: 10,
        liveGrid: "1024x576",
      },
    },
    failures: [],
    gate: "G-FG-42",
    pass: true,
    runtime: {
      liveGrid: "1024x576",
      renderer: "webgpu-grid-primary-v1",
      runtimeGridOverride: { cellsX: 1024, cellsY: 576 },
      waterContext: "webgpu",
    },
    summary: {
      categories: ["damping", "drop", "float", "sink", "splash"],
      referenceCaseCount: 5,
      referenceComparisonCount: 10,
    },
  } as unknown as FluidInstalledHighResolutionReferencePacingReport;
}

function validOperatorReadout(): FluidInstalledHighResolutionOperatorReadoutReport {
  return {
    failures: [],
    gate: "G-FG-45",
    pass: true,
    runtime: {
      liveGrid: "1024x576",
      renderer: "webgpu-grid-primary-v1",
      waterContext: "webgpu",
    },
    scenarios: ["foam", "concrete", "drum"].map((id) => ({
      clickedDrop: true,
      clickedPreset: true,
      finalSnapshot: {
        phase: "floating",
        predictionOutcome: id === "concrete" ? "sinks-immediately" : "floats-indefinitely",
      },
      id,
      samples: [{}],
      telemetry: {
        particlesNoFullGridReadback: true,
        pressureNoFullGridReadback: true,
      },
    })),
    summary: {
      outcomeClasses: ["floats-indefinitely", "sinks-immediately", "waterlogs-then-sinks"],
      scenarioCount: 3,
    },
  } as unknown as FluidInstalledHighResolutionOperatorReadoutReport;
}

function referenceComparisons(): FluidReferenceOutcomeComparison[] {
  return [
    comparison("live-drop-speed-reference", "drop", 12.2987408697401, 11.023081064747732, 12.526228482667877, "m/s"),
    comparison("live-splash-height-reference", "splash", 2.1240271407175224, 0.8236857697731332, 3.578584361264341, "m"),
    comparison("live-ice-equilibrium-submerged-fraction-reference", "float", 0.8946341463414634, 0.8596341463414634, 0.9296341463414635, "fraction"),
    comparison("live-ice-hydrostatic-draft-error", "float", 0.0021233509041691523, 0, 0.055, "m"),
    comparison("live-foam-settled-draft-error", "damping", 0.014377377067889302, 0, 0.055, "m"),
    comparison("live-foam-settled-buoyancy-error", "damping", 0.06750860447000614, 0, 0.08, "ratio"),
    comparison("live-foam-equilibrium-window", "damping", 1, 1, 1, "boolean"),
    comparison("live-concrete-terminal-speed-reference", "sink", 3.3726264597690814, 1, 8, "m/s"),
    comparison("live-concrete-sink-phase", "sink", 1, 1, 1, "boolean"),
    comparison("live-leaky-drum-sink-time-ratio-reference", "sink", 0.2232846141029004, 0, 0.55, "ratio"),
  ];
}

function comparison(
  id: FluidReferenceOutcomeComparison["id"],
  category: FluidReferenceOutcomeComparison["category"],
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
  };
}
