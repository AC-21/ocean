import { describe, expect, it } from "vitest";
import { createOceanPhysicsSpikeReport } from "./oceanPhysicsSpike";

describe("ocean physics spike report", () => {
  const report = createOceanPhysicsSpikeReport({ days: 60, generatedAt: "2026-06-06T00:00:00.000Z" });

  it("measures the production sea-state signals across routes", () => {
    expect(report.schema).toBe(1);
    expect(report.oceanFieldId).toBe("analytic-tradewinds-v1");
    expect(report.routeCount).toBeGreaterThan(20);
    expect(report.waveSampling.pass).toBe(true);
    expect(report.waveSampling.samples).toBe(report.routeCount * report.dayCount);
    expect(report.waveSampling.beamSeaRange.max).toBeGreaterThan(report.waveSampling.beamSeaRange.min);
    expect(report.waveSampling.cargoSlamRange.max).toBeGreaterThan(report.waveSampling.cargoSlamRange.min);
    expect(report.waveSampling.followingSeaRange.max).toBeGreaterThan(report.waveSampling.followingSeaRange.min);
    expect(report.waveSampling.peakWaveHeightRange.max).toBeGreaterThan(4);
  });

  it("shows ship response, route readability, and cargo-slam gameplay impact", () => {
    expect(report.shipResponse.pass).toBe(true);
    expect(report.shipResponse.rough.responseStrength).toBeGreaterThan(report.shipResponse.calm.responseStrength);
    expect(report.routeReadability.pass).toBe(true);
    expect(report.routeReadability.seaStateLabels.length).toBeGreaterThanOrEqual(4);
    expect(report.routeReadability.tacticLabels.length).toBeGreaterThanOrEqual(5);
    expect(report.cargoSlamEffect.pass).toBe(true);
    expect(report.cargoSlamEffect.loadedCargoRisk).toBeGreaterThan(report.cargoSlamEffect.emptyCargoRisk);
    expect(report.cargoSlamEffect.loadedWear).toBeGreaterThanOrEqual(report.cargoSlamEffect.emptyWear);
  });

  it("connects currents and freight pressure to price behavior", () => {
    expect(report.currentAndFreight.pass).toBe(true);
    expect(report.currentAndFreight.followingRouteCount).toBeGreaterThan(0);
    expect(report.currentAndFreight.contraryRouteCount).toBeGreaterThan(0);
    expect(report.currentAndFreight.lanePressureRange.max).toBeGreaterThan(report.currentAndFreight.lanePressureRange.min);
    expect(report.currentAndFreight.importPriceComparisons.some((comparison) => comparison.passed)).toBe(true);
    expect(report.currentAndFreight.exportPriceComparisons.some((comparison) => comparison.passed)).toBe(true);
    expect(report.gpuCost.status).toBe("not-attached");
    expect(report.decision.recommendation).toBe("continue-pixi-first");
  });
});
