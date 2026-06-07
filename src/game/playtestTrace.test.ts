import { describe, expect, it } from "vitest";
import { runPlaytestTrace } from "./playtestTrace";

describe("Harborline playtest trace", () => {
  it("keeps the one-more-route cadence from collapsing into repeated pure waits", () => {
    const report = runPlaytestTrace(12000, { decisionBudget: 70 });

    expect(report.arrivalsChecked).toBeGreaterThan(0);
    expect(report.voyagesCompleted).toBeGreaterThan(0);
    expect(report.maxPureWaitStreak).toBeLessThan(2);
    expect(report.violations).toEqual([]);
    expect(report.reasonsSeen.profit ?? 0).toBeGreaterThan(0);
    expect(report.reasonsSeen.rumor ?? 0).toBeGreaterThan(0);
  });
});
