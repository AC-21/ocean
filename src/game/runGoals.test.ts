import { describe, expect, it } from "vitest";
import { currentRunGoalFor, runGoalsFor } from "./runGoals";
import { createInitialState } from "./reducer";

describe("run goals", () => {
  it("guides a fresh run toward first profit before later milestones", () => {
    const state = createInitialState();

    const goals = runGoalsFor(state);

    expect(goals.map((goal) => goal.id)).toEqual(["profit", "risk", "recover", "upgrade", "close"]);
    expect(goals[0]).toMatchObject({ id: "profit", status: "active", metric: "open" });
    expect(currentRunGoalFor(state).id).toBe("profit");
  });

  it("marks profit, pressure, recovery, and build pivots from actual run state", () => {
    const state = createInitialState();
    state.cash = 2200;
    state.equipment = ["weather_glass"];
    state.crew = ["boatswain"];
    state.log = [
      { day: 8, text: "Repaired 12 hull for $84." },
      { day: 7, text: "Pirate sails cut across the route to Stormhook." },
      { day: 6, text: "Sold 3 Tea for $330; profit $126." },
    ];

    const goals = runGoalsFor(state);

    expect(goals.find((goal) => goal.id === "profit")?.status).toBe("done");
    expect(goals.find((goal) => goal.id === "risk")?.status).toBe("done");
    expect(goals.find((goal) => goal.id === "recover")?.status).toBe("done");
    expect(goals.find((goal) => goal.id === "upgrade")?.status).toBe("done");
    expect(currentRunGoalFor(state).id).toBe("close");
  });

  it("promotes close-ledger pressure late in the run", () => {
    const state = createInitialState();
    state.day = 45;
    state.log = [{ day: 12, text: "Sold 2 Tools for $280; profit $96." }];

    const close = runGoalsFor(state).find((goal) => goal.id === "close");

    expect(close?.status).toBe("active");
    expect(close?.metric).toBe("day 45/60");
  });
});
