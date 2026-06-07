import { describe, expect, it, vi } from "vitest";
import { pirateTacticalReadFor } from "./encounters";
import { createInitialState, reduceGame } from "./reducer";

describe("pirate encounter tactics", () => {
  it("makes armed builds visibly better at warning pirates off", () => {
    const plain = createPirateEncounterState();
    const armed = createPirateEncounterState();
    armed.currentShip = "iron_barge";
    armed.ownedShips.push("iron_barge");
    armed.equipment = ["gun_deck", "signal_cannon"];
    armed.captainSkills.gunnery = 2;
    armed.factionStanding.admiralty = 8;

    const plainRead = pirateTacticalReadFor(plain);
    const armedRead = pirateTacticalReadFor(armed);

    expect(plainRead?.warnChance).toBeGreaterThan(0);
    expect(armedRead?.warnChance).toBeGreaterThan(plainRead?.warnChance ?? 1);
    expect(armedRead?.riskLabel).toContain("warn");
  });

  it("makes Long Nines a visible pirate deterrent beyond raw hull", () => {
    const plain = createPirateEncounterState();
    const longNines = createPirateEncounterState();
    longNines.equipment = ["long_nines"];

    const plainRead = pirateTacticalReadFor(plain);
    const longNinesRead = pirateTacticalReadFor(longNines);

    expect(longNinesRead?.battleRating).toBeGreaterThan(plainRead?.battleRating ?? 0);
    expect(longNinesRead?.fightChance).toBeGreaterThan(plainRead?.fightChance ?? 1);
    expect(longNinesRead?.warnChance).toBeGreaterThan(plainRead?.warnChance ?? 1);
  });

  it("recognizes escort duty and turns a successful warning into patrol follow-up", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
    try {
      let state = createPirateEncounterState();
      state.contracts.push({
        id: "escort-duty",
        kind: "escort",
        originPortId: "grayhaven",
        destinationPortId: "stormhook",
        factionId: "admiralty",
        goodId: "iron",
        units: 1,
        deadline: 18,
        reward: 140,
        penalty: 40,
        routeRiskModifier: -0.08,
        status: "active",
      });
      state.equipment = ["signal_cannon"];
      state.factionStanding.admiralty = 4;

      expect(pirateTacticalReadFor(state)?.escortDuty).toBe(true);

      state = reduceGame(state, { type: "warnPirates" });

      expect(state.currentPort).toBe("stormhook");
      expect(state.contracts.some((contract) => contract.recoverySource === "pirate" && contract.originPortId === "stormhook")).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("Escort papers turned the pirate hail"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("resolves a successful warning shot as a low-damage patrol bounty", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
    try {
      let state = createPirateEncounterState();
      state.currentShip = "iron_barge";
      state.ownedShips.push("iron_barge");
      state.equipment = ["gun_deck", "signal_cannon"];
      state.captainSkills.gunnery = 3;
      state.hull = 125;
      state.cash = 400;

      state = reduceGame(state, { type: "warnPirates" });

      expect(state.encounter).toBeNull();
      expect(state.currentPort).toBe("stormhook");
      expect(state.cash).toBeGreaterThan(400);
      expect(state.hull).toBeLessThan(125);
      expect(state.log.some((entry) => entry.text.includes("Warned off The Red Ledger"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("punishes a failed warning shot without using the full fight branch", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createPirateEncounterState();
      state.cash = 500;
      state.hull = 100;

      state = reduceGame(state, { type: "warnPirates" });

      expect(state.encounter).toBeNull();
      expect(state.currentPort).toBe("stormhook");
      expect(state.cash).toBeLessThan(500);
      expect(state.hull).toBeLessThan(100);
      expect(state.log.some((entry) => entry.text.includes("called the bluff"))).toBe(true);
      expect(state.contracts.some((contract) => contract.recoverySource === "pirate" && contract.originPortId === "stormhook")).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("posts a patrol recovery offer after paying pirates", () => {
    let state = createPirateEncounterState();
    state.cash = 600;

    state = reduceGame(state, { type: "bribe" });

    expect(state.encounter).toBeNull();
    expect(state.currentPort).toBe("stormhook");
    expect(state.cash).toBe(180);
    expect(state.contracts.some((contract) => contract.recoverySource === "pirate" && contract.brief?.includes("Recovery work"))).toBe(true);
  });

  it("lets brokerage builds parley through pirates for a reduced toll", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
    try {
      let state = createPirateEncounterState();
      state.cash = 700;
      state.captainSkills.brokerage = 3;
      state.equipment = ["customs_ledger"];
      const read = pirateTacticalReadFor(state)!;

      state = reduceGame(state, { type: "parleyPirates" });

      expect(read.parleyCost).toBeLessThan(420);
      expect(state.cash).toBe(700 - read.parleyCost);
      expect(state.currentPort).toBe("stormhook");
      expect(state.factionStanding.freeports).toBeGreaterThan(0);
      expect(state.log.some((entry) => entry.text.includes("Parleyed with The Red Ledger"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("makes failed pirate parley cost cargo and post recovery work", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      let state = createPirateEncounterState();
      state.cash = 700;
      state.cargo.silk = 2;
      state.cargoBasis.silk = 90;
      const read = pirateTacticalReadFor(state)!;

      state = reduceGame(state, { type: "parleyPirates" });

      expect(state.cash).toBeLessThan(700 - read.parleyCost);
      expect(state.cargo.silk ?? 0).toBeLessThan(2);
      expect(state.currentPort).toBe("stormhook");
      expect(state.contracts.some((contract) => contract.recoverySource === "pirate" && contract.originPortId === "stormhook")).toBe(true);
      expect(state.log.some((entry) => entry.text.includes("soured on the parley"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("gives fast hulls a distinct clean-wake escape payoff", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
    try {
      let state = createPirateEncounterState();
      state.currentShip = "clipper_kite";
      state.ownedShips.push("clipper_kite");
      state.captainSkills.navigation = 2;

      state = reduceGame(state, { type: "run" });

      expect(state.currentPort).toBe("stormhook");
      expect(state.log.some((entry) => entry.text.includes("Fast-water escape mapped a clean wake"))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });
});

function createPirateEncounterState() {
  const state = createInitialState();
  state.pendingArrival = "stormhook";
  state.encounter = {
    kind: "pirate",
    name: "The Red Ledger",
    strength: 120,
    bribe: 420,
    bounty: 640,
    portName: "Stormhook",
  };
  return state;
}
