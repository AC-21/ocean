import { describe, expect, it } from "vitest";
import { createSailingPhysicsReport } from "./sailingPhysicsReport";

describe("sailing physics report", () => {
  const report = createSailingPhysicsReport({ generatedAt: "2026-06-07T00:00:00.000Z" });

  it("proves route and renderer-facing sailing signals come from one OceanField", () => {
    expect(report.schema).toBe(1);
    expect(report.oceanFieldId).toBe("analytic-tradewinds-v1");
    expect(report.gates.singleOceanModel.pass).toBe(true);
    expect(report.shipCases.length).toBeGreaterThanOrEqual(5);
    for (const shipCase of report.shipCases) {
      expect(shipCase.route.days).toBeGreaterThanOrEqual(2);
      expect(shipCase.route.risk).toBeGreaterThan(0);
      expect(shipCase.route.pressure).toBeGreaterThanOrEqual(0);
      expect(shipCase.water.peakWaveHeight).toBeGreaterThan(4);
      expect(shipCase.motion.signalKeys).toContain("wake-length");
      expect(shipCase.motion.signalKeys).toContain("hull-response");
    }
  });

  it("makes ship classes visibly different in hull response and wake geometry", () => {
    expect(report.gates.shipClassMotion.pass).toBe(true);
    expect(report.gates.wakeDifferentiation.pass).toBe(true);
    expect(report.ranges.wakeLength.max - report.ranges.wakeLength.min).toBeGreaterThanOrEqual(0.2);
    expect(report.ranges.wakeSpread.max - report.ranges.wakeSpread.min).toBeGreaterThanOrEqual(0.1);
    expect(report.comparisons.clipperWakeLengthAdvantage).toBeGreaterThan(0.2);
    expect(report.comparisons.heavyWakeSpreadAdvantage).toBeGreaterThan(0.05);
  });

  it("damps rough-water hulls and changes loaded freighter wakes", () => {
    expect(report.gates.roughHullDamping.pass).toBe(true);
    expect(report.gates.loadedWake.pass).toBe(true);
    expect(report.comparisons.roughHullDampingAdvantage).toBeGreaterThanOrEqual(0.05);
    expect(report.comparisons.loadedCarrierWakeSpreadLift).toBeGreaterThanOrEqual(0.12);
    expect(report.comparisons.loadedCarrierMotionDamping).toBeGreaterThanOrEqual(0.05);
  });

  it("keeps route explanations readable while adding physics-backed motion", () => {
    expect(report.gates.routeReadability.pass).toBe(true);
    expect(report.gates.all.pass).toBe(true);
    expect(report.decision.recommendation).toBe("integrated-oceanfield-sailing-v1");
    expect(report.nextSteps.join(" ")).toContain("persistent wake");
  });
});
