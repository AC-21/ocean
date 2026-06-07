import { describe, expect, it } from "vitest";
import { createInitialState } from "./reducer";
import { classifyDeadEndState, simulateRuns } from "./simulator";

describe("Harborline balance simulator", () => {
  it("summarizes seeded automated runs", () => {
    const report = simulateRuns(25, { seedStart: 9000 });

    expect(report.runs).toBe(25);
    expect(report.winRate).toBeGreaterThanOrEqual(0);
    expect(report.winRate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(report.averageFinalScore)).toBe(true);
    expect(report.bankruptcyRate).toBeGreaterThanOrEqual(0);
    expect(report.bankruptcyRate).toBeLessThanOrEqual(1);
    expect(report.mostProfitableGoods.length).toBeGreaterThan(0);
    expect(Object.values(report.deadEndStates).reduce((sum, value) => sum + value, 0)).toBe(25);
  });

  it("classifies positive-score early ship losses separately from completed ledgers", () => {
    const lost = createInitialState();
    lost.gameOver = true;
    lost.log.unshift({ day: 18, text: "The ship was lost at sea. Final net worth: $900." });

    const closed = createInitialState();
    closed.gameOver = true;
    closed.log.unshift({ day: 61, text: "The 60-day ledger closed. Final net worth: $1900." });

    expect(classifyDeadEndState(lost, 900, "running")).toBe("ship-loss");
    expect(classifyDeadEndState(closed, 1900, "running")).toBe("completed-window");
  });
});
