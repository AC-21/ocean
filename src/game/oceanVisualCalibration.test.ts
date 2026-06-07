import { describe, expect, it } from "vitest";
import { createOceanVisualCalibrationReport, type OceanBenchmarkEvidence } from "./oceanVisualCalibration";

const passingBenchmark: OceanBenchmarkEvidence = {
  source: "reports/ocean-benchmark-latest.json",
  status: "passed",
  minAverageFps: 31,
  minColorBuckets: 13,
  renderers: ["shader-mesh-v2", "low-power-graphics-v2"],
  cases: [
    { id: "default-desktop", averageFps: 38, minAverageFps: 30, pixelColors: 25, renderer: "shader-mesh-v2" },
    { id: "compact-desktop", averageFps: 54, minAverageFps: 30, pixelColors: 31, renderer: "shader-mesh-v2" },
    { id: "low-power", averageFps: 28, minAverageFps: 24, pixelColors: 13, renderer: "low-power-graphics-v2" },
    { id: "compact-low-power", averageFps: 29, minAverageFps: 24, pixelColors: 23, renderer: "low-power-graphics-v2" },
  ],
};

describe("ocean visual calibration", () => {
  const report = createOceanVisualCalibrationReport({
    benchmark: passingBenchmark,
    generatedAt: "2026-06-07T00:00:00.000Z",
  });

  it("ties the water calibration to approved ocean references and the shared field", () => {
    expect(report.schema).toBe(1);
    expect(report.styleVersion).toBe("harborline-art-v1");
    expect(report.oceanFieldId).toBe("analytic-tradewinds-v1");
    expect(report.approvedReferences.map((reference) => reference.id)).toEqual(
      expect.arrayContaining(["realistic-teal-ocean", "isometric-map-composition"])
    );
  });

  it("keeps the shader palette in a realistic teal-gray range", () => {
    expect(report.palette.tealGrayPass).toBe(true);
    expect(report.palette.averageHue).toBeGreaterThanOrEqual(170);
    expect(report.palette.averageHue).toBeLessThanOrEqual(205);
    expect(report.palette.averageSaturation).toBeLessThanOrEqual(0.72);
    expect(report.palette.lumaRange.max - report.palette.lumaRange.min).toBeGreaterThanOrEqual(125);
  });

  it("requires visible ocean signals and route-risk spread from the production OceanField", () => {
    expect(report.fieldSignals.pass).toBe(true);
    expect(report.fieldSignals.depthContrast).toBeGreaterThanOrEqual(0.28);
    expect(report.fieldSignals.averageFoam).toBeGreaterThan(0);
    expect(report.routeRiskReadability.pass).toBe(true);
    expect(report.routeRiskReadability.samples).toBeGreaterThanOrEqual(120);
    expect(report.routeRiskReadability.highRiskRoute.visualRisk).toBeGreaterThan(report.routeRiskReadability.lowRiskRoute.visualRisk);
    expect(report.routeRiskReadability.riskSpread).toBeGreaterThanOrEqual(0.28);
  });

  it("accepts Pixi-first water only when live map benchmark evidence is attached", () => {
    expect(report.liveMapSurface.status).toBe("passed");
    expect(report.liveMapSurface.renderers).toEqual(expect.arrayContaining(["shader-mesh-v2", "low-power-graphics-v2"]));
    expect(report.liveMapSurface.minAverageFps).toBeGreaterThanOrEqual(24);
    expect(report.decision.recommendation).toBe("calibrated-pixi-water");

    const withoutLiveProof = createOceanVisualCalibrationReport({ generatedAt: "2026-06-07T00:00:00.000Z" });
    expect(withoutLiveProof.decision.recommendation).toBe("ready-for-live-check");
  });
});
