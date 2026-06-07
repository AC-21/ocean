import { describe, expect, it } from "vitest";
import { compareBalanceSnapshots, createBalanceSnapshot, defaultBalanceTargets, formatMetricValue } from "./balanceTelemetry";
import type { SimulationReport } from "./simulator";

describe("balance telemetry", () => {
  it("creates target-band snapshots from simulator reports", () => {
    const report = makeReport({
      winRate: 0.42,
      averageFinalScore: 1625,
      medianFinalScore: 1309,
      bankruptcyRate: 0.079,
      averageDaysSurvived: 35,
      averageCompletedContracts: 9,
      upgradedRunRate: 0.363,
    });

    const snapshot = createBalanceSnapshot(report, { generatedAt: "2026-06-06T00:00:00.000Z", label: "current" });

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.generatedAt).toBe("2026-06-06T00:00:00.000Z");
    expect(snapshot.report).toBe(report);
    expect(snapshot.targets).toBe(defaultBalanceTargets);
    expect(snapshot.summary.dominantGood).toBe("Medicine");
    expect(snapshot.targetResults.find((result) => result.key === "winRate")?.status).toBe("below");
    expect(snapshot.targetResults.find((result) => result.key === "bankruptcyRate")?.status).toBe("within");
    expect(snapshot.targetResults.find((result) => result.key === "averageCompletedContracts")?.status).toBe("above");
    expect(snapshot.summary.outsideTargets).toBeGreaterThan(0);
    expect(snapshot.summary.needsAttention.some((entry) => entry.includes("Win rate"))).toBe(true);
  });

  it("compares snapshots and records dominant good changes", () => {
    const before = createBalanceSnapshot(makeReport({ averageFinalScore: 1800, winRate: 0.44 }), { generatedAt: "a", label: "before" });
    const after = createBalanceSnapshot(
      makeReport({
        averageFinalScore: 2400,
        winRate: 0.5,
        mostProfitableGoods: [{ goodId: "spice", name: "Spice", profit: 1000 }],
      }),
      { generatedAt: "b", label: "after" }
    );

    const comparison = compareBalanceSnapshots(before, after, "c");

    expect(comparison.generatedAt).toBe("c");
    expect(comparison.beforeLabel).toBe("before");
    expect(comparison.afterLabel).toBe("after");
    expect(comparison.seedChanged).toBe(false);
    expect(comparison.dominantGoodBefore).toBe("Medicine");
    expect(comparison.dominantGoodAfter).toBe("Spice");
    expect(comparison.metricDeltas.find((delta) => delta.key === "averageFinalScore")?.delta).toBe(600);
    expect(comparison.metricDeltas.find((delta) => delta.key === "winRate")?.delta).toBe(0.06);
  });

  it("formats metric units for reports", () => {
    expect(formatMetricValue(0.428, "ratio")).toBe("43%");
    expect(formatMetricValue(1625, "score")).toBe("$1,625");
    expect(formatMetricValue(35.25, "days")).toBe("35.3d");
    expect(formatMetricValue(2.75, "contracts")).toBe("2.8");
  });
});

function makeReport(overrides: Partial<SimulationReport> = {}): SimulationReport {
  return {
    runs: 100,
    seedStart: 9000,
    winRate: 0.5,
    averageFinalScore: 2200,
    medianFinalScore: 1900,
    bankruptcyRate: 0.08,
    averageDaysSurvived: 48,
    averageCompletedContracts: 4,
    upgradedRunRate: 0.5,
    mostProfitableGoods: [{ goodId: "medicine", name: "Medicine", profit: 1200 }],
    deadEndStates: { "completed-window": 92, bankrupt: 8 },
    ...overrides,
  };
}
