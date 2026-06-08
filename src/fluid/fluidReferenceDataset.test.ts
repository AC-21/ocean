import { describe, expect, it } from "vitest";
import referenceDatasetRaw from "../../data/fluid-reference-cases.json";
import { createFluidReferenceDatasetReport, loadFluidReferenceDataset } from "./fluidReferenceDataset";

describe("fluid reference dataset gate", () => {
  it("ingests the structured reference dataset", () => {
    const dataset = loadFluidReferenceDataset();

    expect(dataset.datasetId).toBe("ocean-impact-reference-v1");
    expect(dataset.sources.length).toBeGreaterThanOrEqual(8);
    expect(dataset.cases.length).toBeGreaterThanOrEqual(6);
    expect(dataset.cases.flatMap((entry) => entry.measurements).length).toBeGreaterThanOrEqual(7);
  });

  it("passes with sourced, unit-aware, replayable cases for every required behavior", () => {
    const report = createFluidReferenceDatasetReport({ generatedAt: "2026-06-08T00:00:00.000Z" });

    expect(report.gate).toBe("G-FG-10");
    expect(report.pass).toBe(true);
    expect(report.categories).toEqual(["damping", "drop", "float", "sink", "splash"]);
    expect(report.sources.externalCount).toBeGreaterThanOrEqual(5);
    expect(report.summary.failedCases).toEqual([]);
    expect(report.summary.failedMeasurements).toEqual([]);
  });

  it("records actual values and resolved expected bands", () => {
    const report = createFluidReferenceDatasetReport({ generatedAt: "2026-06-08T00:00:00.000Z" });
    const measurements = report.results.flatMap((entry) => entry.measurements);
    const impactSpeed = measurements.find((entry) => entry.id === "water-entry-speed");
    const splashHeight = measurements.find((entry) => entry.id === "splash-crown-height");

    expect(impactSpeed?.actual ?? 0).toBeGreaterThan(10);
    expect(impactSpeed?.expected.formula).toContain("sqrt");
    expect(splashHeight?.actual ?? 0).toBeGreaterThan(1);
    expect(splashHeight?.expected.max ?? 0).toBeGreaterThan(splashHeight?.expected.min ?? 0);
    for (const measurement of measurements) {
      expect(measurement.unit.length).toBeGreaterThan(0);
      expect(measurement.uncertainty.length).toBeGreaterThan(20);
      expect(measurement.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it("fails if a measurement references a missing source", () => {
    const dataset = structuredClone(referenceDatasetRaw);
    dataset.cases[0].measurements[0].sourceIds = ["missing-source"];
    const report = createFluidReferenceDatasetReport({ dataset, generatedAt: "2026-06-08T00:00:00.000Z" });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("missing source");
  });

  it("fails if a required behavior category is absent", () => {
    const dataset = structuredClone(referenceDatasetRaw);
    dataset.cases = dataset.cases.filter((entry) => entry.category !== "damping");
    const report = createFluidReferenceDatasetReport({ dataset, generatedAt: "2026-06-08T00:00:00.000Z" });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("missing category damping");
  });
});
