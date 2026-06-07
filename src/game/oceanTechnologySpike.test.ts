import { describe, expect, it } from "vitest";
import { createOceanTechnologySpikeReport } from "./oceanTechnologySpike";
import type { OceanBenchmarkEvidence } from "./oceanVisualCalibration";

const passingBenchmark: OceanBenchmarkEvidence = {
  source: "reports/ocean-benchmark-latest.json",
  status: "passed",
  minAverageFps: 28.4,
  minColorBuckets: 13,
  renderers: ["shader-mesh-v2", "low-power-graphics-v2"],
  cases: [
    { id: "default-desktop", averageFps: 38.6, minAverageFps: 30, pixelColors: 24, renderer: "shader-mesh-v2" },
    { id: "compact-desktop", averageFps: 55.3, minAverageFps: 30, pixelColors: 29, renderer: "shader-mesh-v2" },
    { id: "low-power", averageFps: 28.4, minAverageFps: 24, pixelColors: 13, renderer: "low-power-graphics-v2" },
    { id: "compact-low-power", averageFps: 28.5, minAverageFps: 24, pixelColors: 24, renderer: "low-power-graphics-v2" },
  ],
};

describe("ocean technology spike", () => {
  const report = createOceanTechnologySpikeReport({
    benchmark: passingBenchmark,
    generatedAt: "2026-06-07T00:00:00.000Z",
  });

  it("compares the current Pixi path against plausible water and physics package classes", () => {
    expect(report.schema).toBe(1);
    expect(report.oceanFieldId).toBe("analytic-tradewinds-v1");
    expect(report.candidates.map((candidate) => candidate.id)).toEqual(
      expect.arrayContaining([
        "pixi-analytic-current",
        "narrow-oceanfield-extension",
        "rigid-body-physics-package",
        "three-water-renderer",
        "fluid-solver-package",
      ])
    );
    expect(report.bestExternalPackage.dependencyImpact).not.toBe("none");
  });

  it("keeps the current renderer decision gated by live visual, route, ship, and GPU evidence", () => {
    expect(report.inputs.benchmarkStatus).toBe("passed");
    expect(report.inputs.visualDecision).toBe("calibrated-pixi-water");
    expect(report.gates.waveSampling.pass).toBe(true);
    expect(report.gates.shipResponse.pass).toBe(true);
    expect(report.gates.wakeSignals.pass).toBe(true);
    expect(report.gates.visualCalibration.pass).toBe(true);
    expect(report.gates.routeReadability.pass).toBe(true);
    expect(report.gates.gpuBudget.pass).toBe(true);
    expect(report.gates.singleRendererFit.pass).toBe(true);
    expect(report.gates.allCoreGates.pass).toBe(true);
  });

  it("recommends extending OceanField before installing a package", () => {
    expect(report.winner.id).toBe("narrow-oceanfield-extension");
    expect(report.packageComparison.externalPackageMateriallyImproves).toBe(false);
    expect(report.packageComparison.scoreMarginForCurrentPath).toBeGreaterThan(0.35);
    expect(report.decision.recommendation).toBe("extend-oceanfield-no-package");
    expect(report.decision.verdict).toBe("continue");
    expect(report.nextSteps.join(" ")).toContain("persistent wake");
  });

  it("holds the decision if live benchmark evidence is not attached", () => {
    const missingBenchmark = createOceanTechnologySpikeReport({
      generatedAt: "2026-06-07T00:00:00.000Z",
    });
    expect(missingBenchmark.gates.visualCalibration.pass).toBe(false);
    expect(missingBenchmark.gates.gpuBudget.pass).toBe(false);
    expect(missingBenchmark.decision.recommendation).toBe("rework-current-evidence");
  });
});
