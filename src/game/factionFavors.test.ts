import { describe, expect, it } from "vitest";
import { allFactionFavorSpecs, factionFavorQuoteFor } from "./factionFavors";
import { createInitialState } from "./reducer";

describe("faction favors", () => {
  it("defines one distinct favor for each political faction", () => {
    expect(allFactionFavorSpecs().map((spec) => spec.factionId).sort()).toEqual(["admiralty", "charter", "freeports", "league"]);
    expect(allFactionFavorSpecs().map((spec) => spec.kind).sort()).toEqual([
      "ledger_credit",
      "patrol_cover",
      "stevedore_shift",
      "tide_runner_writ",
    ]);
  });

  it("quotes availability from current-port standing, cash, and busy state", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.cash = 1000;

    const locked = factionFavorQuoteFor(state);
    expect(locked?.available).toBe(false);
    expect(locked?.reason).toContain("needs 6.0 standing");

    state.factionStanding.charter = 7;
    const ready = factionFavorQuoteFor(state);
    expect(ready).toMatchObject({
      actionLabel: "Draw",
      available: true,
      factionId: "charter",
      kind: "ledger_credit",
      label: "Ledger Credit",
    });

    state.voyage = { fromId: "grayhaven", toId: "saffron", days: 1, duration: 1, progress: 0.1, risk: 0.1 };
    expect(factionFavorQuoteFor(state)?.reason).toBe("ship busy");
  });
});
