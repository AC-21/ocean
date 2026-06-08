import { describe, expect, it } from "vitest";
import {
  createFluidSolverDecisionReport,
  fluidSolverOptions,
  fluidSolverReferences,
} from "./fluidSolverArchitecture";

describe("fluid solver architecture gate", () => {
  it("selects the hybrid GPU heightfield plus local particle architecture", () => {
    const report = createFluidSolverDecisionReport("2026-06-08T00:00:00.000Z");

    expect(report.gate).toBe("G-FG-09");
    expect(report.pass).toBe(true);
    expect(report.recommendedOptionId).toBe("hybrid-heightfield-particles");
    expect(report.recommendation).toContain("WebGPU shallow-water/free-surface grid");
    expect(report.recommendation).toContain("localized particle splash");
  });

  it("records primary solver references with source URLs", () => {
    const report = createFluidSolverDecisionReport("2026-06-08T00:00:00.000Z");

    expect(report.primaryReferences.length).toBeGreaterThanOrEqual(5);
    expect(report.primaryReferences).toEqual(fluidSolverReferences);
    for (const reference of report.primaryReferences) {
      expect(reference.primary).toBe(true);
      expect(reference.url).toMatch(/^https:\/\//);
      expect(reference.relevance.length).toBeGreaterThan(30);
    }
    expect(report.primaryReferences.map((entry) => entry.id)).toContain("chentanez-muller-2010-heightfield-particles");
    expect(report.primaryReferences.map((entry) => entry.id)).toContain("brodtkorb-saetra-altinakar-2012-gpu-shallow-water");
    expect(report.primaryReferences.map((entry) => entry.id)).toContain("macklin-muller-2013-position-based-fluids");
  });

  it("rejects heavy or incomplete solver families as the immediate production path", () => {
    const report = createFluidSolverDecisionReport("2026-06-08T00:00:00.000Z");
    const rejectedIds = new Set(report.options.filter((entry) => entry.status === "rejected").map((entry) => entry.id));
    const requiredRejected = ["full-3d-eulerian", "particle-only-pbf-sph", "stable-fluids-eulerian"] as const;

    for (const optionId of requiredRejected) {
      expect(rejectedIds.has(optionId)).toBe(true);
      expect(report.rejectionSummary[optionId]).toBeTruthy();
    }
    expect(report.rejectionSummary["full-3d-eulerian"]).toContain("research horizon");
    expect(report.rejectionSummary["particle-only-pbf-sph"]).toContain("particle-only");
    expect(report.rejectionSummary["stable-fluids-eulerian"]).toContain("production architecture");
  });

  it("scores the recommended option above the alternatives", () => {
    const recommended = fluidSolverOptions.find((entry) => entry.id === "hybrid-heightfield-particles");
    const alternatives = fluidSolverOptions.filter((entry) => entry.id !== "hybrid-heightfield-particles");

    expect(recommended).toBeDefined();
    for (const option of alternatives) {
      expect(recommended?.totalScore).toBeGreaterThan(option.totalScore);
    }
  });

  it("names follow-on gates tied to reference evidence instead of visual polish", () => {
    const report = createFluidSolverDecisionReport("2026-06-08T00:00:00.000Z");

    expect(report.solverStages.map((entry) => entry.id)).toEqual([
      "surface-grid",
      "rigid-body-coupling",
      "particle-splash-layer",
      "bounded-readback",
      "calibration-loop",
    ]);
    expect(report.nextMilestones.map((entry) => entry.gate)).toEqual(["G-FG-10", "G-FG-11", "G-FG-12", "G-FG-13"]);
    expect(report.nextMilestones.map((entry) => entry.exitEvidence).join(" ")).toContain("reference");
  });
});
