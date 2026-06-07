import { describe, expect, it } from "vitest";
import { insuranceQuoteFor } from "./insurance";
import { loadGame, saveGame, saveKey } from "./persistence";
import { createInitialState, reduceGame, scoreNow } from "./reducer";
import { cargoUnits } from "./routing";
import type { Contract, GameState } from "./types";

describe("Harborline core flow smoke", () => {
  it("plays a deterministic trade-contract-upgrade-save loop", () => {
    const store = installLocalStorage();
    let state = createInitialState(250);
    state.cash = 12000;
    state.debt = 0;
    state.events = [];
    state.politicalEvents = [];
    state.market.grayhaven.tea = 30;
    state.market.glassport.tea = 92;
    state.marketStock.grayhaven.tea = 12;
    state.contracts = [smokeContract];

    state = reduceGame(state, { type: "hireCrew", crewId: "boatswain" });
    expect(state.crew).toContain("boatswain");

    state = reduceGame(state, { type: "buyEquipment", equipmentId: "cargo_hoist" });
    expect(state.equipment).toContain("cargo_hoist");

    state = reduceGame(state, { type: "buyShip", shipId: "ledger_brig" });
    expect(state.ownedShips).toContain("ledger_brig");
    expect(state.currentShip).toBe("ledger_brig");

    state = reduceGame(state, { type: "acceptContract", contractId: smokeContract.id });
    expect(state.selectedPort).toBe("glassport");
    expect(state.contracts[0].status).toBe("active");

    state = reduceGame(state, { type: "buyContractCargo", contractId: smokeContract.id });
    expect(state.cargo.tea).toBe(smokeContract.units);
    expect(cargoUnits(state)).toBe(smokeContract.units);

    const quote = insuranceQuoteFor(state);
    expect(quote?.policy.destinationPortId).toBe("glassport");
    state = reduceGame(state, { type: "buyInsurance" });
    expect(state.cargoInsurance?.destinationPortId).toBe("glassport");

    state = reduceGame(state, { type: "startVoyage" });
    expect(state.voyage?.toId).toBe("glassport");
    state.voyage = { ...state.voyage!, progress: 0.99, duration: 1, risk: 0, wear: 0, watchIndex: 2 };
    state = reduceGame(state, { type: "tickVoyage", dt: 1 });
    expect(state.currentPort).toBe("glassport");
    expect(state.encounter).toBeNull();
    expect(state.cargoInsurance).toBeNull();

    state = reduceGame(state, { type: "completeContract", contractId: smokeContract.id });
    const completed = state.contracts.find((contract) => contract.id === smokeContract.id);
    expect(completed?.status).toBe("completed");
    expect(state.cash).toBeGreaterThan(0);
    expect(scoreNow(state)).toBeGreaterThan(0);

    state.encounter = {
      kind: "pirate",
      name: "Smoke Corsair",
      strength: 12,
      bribe: 40,
      bounty: 80,
      portName: "Glassport",
    };
    state.pendingArrival = "glassport";
    state = reduceGame(state, { type: "bribe" });
    expect(state.encounter).toBeNull();
    expect(state.pendingArrival).toBeNull();
    expect(state.currentPort).toBe("glassport");

    saveGame({ ...state, lastSavedAt: "2026-06-05T17:15:00.000Z" });
    const loaded = loadGame();
    expect(store[saveKey]).toContain("ledger_brig");
    expect(loaded?.currentShip).toBe("ledger_brig");
    expect(loaded?.crew).toContain("boatswain");
    expect(loaded?.equipment).toContain("cargo_hoist");
    expect(loaded?.lastSavedAt).toBe("2026-06-05T17:15:00.000Z");
  });
});

const smokeContract: Contract = {
  id: "smoke-contract",
  originPortId: "grayhaven",
  destinationPortId: "glassport",
  factionId: "charter",
  goodId: "tea",
  units: 2,
  deadline: 12,
  reward: 320,
  penalty: 120,
  status: "available",
};

function installLocalStorage() {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    },
  });
  return store;
}
