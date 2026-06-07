import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calibrationEvidenceArtifacts, createFluidCalibrationReport, type FluidCalibrationEvidenceCheck } from "./fluidCalibration";

describe("fluid calibration gate", () => {
  it("passes deterministic near-realism calibration cases against accepted physical bounds", () => {
    const report = createFluidCalibrationReport({ evidenceText: currentEvidenceText(), generatedAt: "2026-06-07T00:00:00.000Z" });

    expect(report.gate).toBe("G-FG-06");
    expect(report.pass).toBe(true);
    expect(report.summary.caseCount).toBeGreaterThanOrEqual(7);
    expect(report.summary.evidenceCount).toBe(5);
    expect(report.summary.failedCases).toEqual([]);
    expect(report.summary.failedEvidence).toEqual([]);
    expect(report.cases.map((entry) => entry.id)).toContain("impact-speed-concrete-8m");
    expect(report.cases.map((entry) => entry.id)).toContain("high-weber-splash-height-band");
    expect(report.cases.map((entry) => entry.id)).toContain("foam-block-settling-draft");
  });

  it("fails the gate if required WebGPU evidence markers are missing", () => {
    const evidence = currentEvidenceText();
    evidence["FG-05"] = "{}";
    const report = createFluidCalibrationReport({ evidenceText: evidence, generatedAt: "2026-06-07T00:00:00.000Z" });

    expect(report.pass).toBe(false);
    expect(report.summary.failedEvidence).toContain("FG-05");
  });
});

function currentEvidenceText(): Partial<Record<FluidCalibrationEvidenceCheck["id"], string>> {
  return Object.fromEntries(
    (Object.entries(calibrationEvidenceArtifacts) as Array<[FluidCalibrationEvidenceCheck["id"], string]>).map(([id, artifact]) => [
      id,
      readFileSync(artifact, "utf8"),
    ])
  ) as Partial<Record<FluidCalibrationEvidenceCheck["id"], string>>;
}
