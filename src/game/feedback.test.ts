import { describe, expect, it } from "vitest";
import { feedbackPulseFor, feedbackPulseForLog, feedbackTaxonomy } from "./feedback";
import { createInitialState } from "./reducer";

describe("feedback pulse", () => {
  it("locks the animation and audio taxonomy categories required for the vertical slice", () => {
    expect(Object.keys(feedbackTaxonomy).sort()).toEqual(
      expect.arrayContaining([
        "contract",
        "customs",
        "damage",
        "game-over",
        "pirate",
        "profit",
        "loss",
        "rank-up",
        "save",
        "storm",
        "upgrade",
      ])
    );

    for (const spec of Object.values(feedbackTaxonomy)) {
      expect(spec.audioCue).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(["ambient", "normal", "high", "critical"]).toContain(spec.priority);
      expect(["calm", "pop", "shake", "surge", "flash", "drop"]).toContain(spec.motion);
    }
  });

  it("turns profitable and losing trade logs into distinct feedback tones", () => {
    const profit = feedbackPulseForLog({ day: 6, text: "Sold 3 Tea for $270; profit $60." });
    expect(profit.kind).toBe("profit");
    expect(profit.tone).toBe("gain");
    expect(profit.category).toBe("profit");
    expect(profit.audioCue).toBe("coin-profit");
    expect(profit.motion).toBe("surge");
    expect(profit.metric).toBe("$60");

    const loss = feedbackPulseForLog({ day: 7, text: "Sold 4 Iron for $180; loss $44." });
    expect(loss.kind).toBe("profit");
    expect(loss.tone).toBe("loss");
    expect(loss.category).toBe("loss");
    expect(loss.audioCue).toBe("coin-loss");
    expect(loss.motion).toBe("drop");
    expect(loss.metric).toBe("$44");
  });

  it("surfaces upgrade and damage logs as immediate run beats", () => {
    const upgrade = feedbackPulseForLog({ day: 9, text: "Installed Weather Glass. Build +1 nav; Route -1d, -4% risk." });
    expect(upgrade.kind).toBe("upgrade");
    expect(upgrade.tone).toBe("progress");
    expect(upgrade.category).toBe("upgrade");
    expect(upgrade.audioCue).toBe("upgrade-installed");
    expect(upgrade.metric).toBe("+1 nav");

    const damage = feedbackPulseForLog({ day: 10, text: "Heavy seas cost 6 hull on the crossing to Stormhook." });
    expect(damage.kind).toBe("damage");
    expect(damage.tone).toBe("loss");
    expect(damage.category).toBe("damage");
    expect(damage.audioCue).toBe("hull-hit");
    expect(damage.metric).toBe("-6 hull");
  });

  it("classifies contracts, ranks, storms, inspections, and missed deadlines", () => {
    const contract = feedbackPulseForLog({ day: 12, text: "Completed escort contract for Freeport Compact; earned $820." });
    expect(contract.kind).toBe("contract");
    expect(contract.tone).toBe("gain");
    expect(contract.category).toBe("contract");
    expect(contract.audioCue).toBe("contract-paid");
    expect(contract.metric).toBe("$820");

    const rank = feedbackPulseForLog({ day: 14, text: "Navigator became Seasoned Wayfinder after Sea watch; forecasts sharpen." });
    expect(rank.kind).toBe("progress");
    expect(rank.tone).toBe("progress");
    expect(rank.category).toBe("rank-up");
    expect(rank.audioCue).toBe("rank-up");
    expect(rank.title).toBe("Crew Ranked Up");

    const storm = feedbackPulseForLog({ day: 16, text: "Storm Front: A storm line crosses the route; choose how hard to carry canvas." });
    expect(storm.kind).toBe("encounter");
    expect(storm.tone).toBe("risk");
    expect(storm.category).toBe("storm");
    expect(storm.audioCue).toBe("storm-warning");
    expect(storm.title).toBe("Storm Water");

    const inspection = feedbackPulseForLog({ day: 18, text: "Admiralty Court customs hailed the ship outside Stormhook." });
    expect(inspection.kind).toBe("encounter");
    expect(inspection.tone).toBe("risk");
    expect(inspection.category).toBe("customs");
    expect(inspection.audioCue).toBe("customs-hail");
    expect(inspection.title).toBe("Inspection Pressure");

    const missed = feedbackPulseForLog({ day: 20, text: "Missed Charter Bank contract deadline. Penalty $120." });
    expect(missed.kind).toBe("damage");
    expect(missed.tone).toBe("loss");
    expect(missed.category).toBe("damage");
    expect(missed.title).toBe("Penalty Posted");
  });

  it("prioritizes live encounters and voyages over older log rows", () => {
    const threatened = createInitialState();
    threatened.log = [{ day: 3, text: "Sold 3 Tea for $270; profit $60." }];
    threatened.encounter = {
      kind: "pirate",
      name: "The Salt Widow",
      strength: 72,
      bribe: 180,
      bounty: 540,
      portName: "Saffron Quay",
    };

    const encounterPulse = feedbackPulseFor(threatened);
    expect(encounterPulse.kind).toBe("encounter");
    expect(encounterPulse.tone).toBe("risk");
    expect(encounterPulse.category).toBe("pirate");
    expect(encounterPulse.motion).toBe("shake");
    expect(encounterPulse.title).toBe("Pirate Contact");
    expect(encounterPulse.metric).toBe("$540");

    const underway = createInitialState();
    underway.log = [{ day: 4, text: "Loaded 8 Tea for $360; average basis $45." }];
    underway.voyage = {
      fromId: "grayhaven",
      toId: "saffron",
      days: 2,
      risk: 0.24,
      seaLabel: "soft water",
      progress: 0.42,
      duration: 1.4,
    };

    const voyagePulse = feedbackPulseFor(underway);
    expect(voyagePulse.kind).toBe("route");
    expect(voyagePulse.category).toBe("route");
    expect(voyagePulse.title).toBe("Crossing Underway");
    expect(voyagePulse.metric).toBe("42%");
  });

  it("classifies save and game-over beats for future sound and recap animation", () => {
    const saved = feedbackPulseForLog({ day: 11, text: "Run saved to this device." });
    expect(saved.kind).toBe("save");
    expect(saved.category).toBe("save");
    expect(saved.audioCue).toBe("save-confirm");
    expect(saved.motion).toBe("calm");

    const closed = createInitialState();
    closed.day = 61;
    closed.gameOver = true;
    const gameOver = feedbackPulseFor(closed);
    expect(gameOver.category).toBe("game-over");
    expect(gameOver.priority).toBe("critical");
    expect(gameOver.audioCue).toBe("game-over");
  });

  it("skips routine docking rows so post-sail reward beats stay visible", () => {
    const state = createInitialState();
    state.day = 8;
    state.log = [
      { day: 8, text: "Docked at Saffron Quay." },
      { day: 8, text: "Reward: dockside tip - Iron shortage until day 14." },
      { day: 8, text: "Crossing experience: +12 XP." },
    ];

    const pulse = feedbackPulseFor(state);

    expect(pulse.kind).toBe("economy");
    expect(pulse.category).toBe("market");
    expect(pulse.title).toBe("Dockside Lead");
    expect(pulse.metric).toBe("Day 14");
  });
});
