import { describe, expect, it, vi } from "vitest";
import { marketStockCapacity } from "./economy";
import {
  arrivalEventPreviews,
  arrivalWorldEventCandidates,
  drawUnderwayWorldEvent,
  drawWorldEvent,
  underwayEventPreviews,
  underwayWorldEventCandidates,
  worldEventCandidates,
  worldEventPreviews,
} from "./eventDeck";
import { createInitialState, dockCreditPremium, dockFeeFor, reduceGame } from "./reducer";
import { routeMemoryKey } from "./routeMemory";
import { routePhysicsProfile } from "./routing";
import type { Voyage } from "./types";

describe("world event deck", () => {
  it("builds freight-pressure cards from import shortages and export surplus", () => {
    const state = createInitialState();
    state.events = [];
    state.politicalEvents = [];
    state.marketStock.saffron.iron = 0;
    state.marketStock.grayhaven.iron = marketStockCapacity("grayhaven", "iron") + 5;
    state.trends.iron = {
      direction: -1,
      momentum: 1.1,
      label: "warehouse overflow",
      expires: state.day + 10,
    };

    const candidates = worldEventCandidates(state);
    const importCard = candidates.find((candidate) => candidate.id === "import-saffron-iron");
    const exportCard = candidates.find((candidate) => candidate.id === "export-grayhaven-iron");

    expect(importCard).toBeTruthy();
    expect(exportCard).toBeTruthy();
    expect(importCard!.weight).toBeGreaterThan(0);
    expect(exportCard!.weight).toBeGreaterThan(0);

    const importEvent = importCard!.resolve();
    expect(importEvent.cardId).toBe("import-pressure");
    expect(importEvent.effects.some((effect) => effect.kind === "rumor" && effect.event.kind === "shortage")).toBe(true);
    expect(importEvent.effects).toContainEqual({ kind: "stock", portId: "saffron", goodId: "iron", delta: -1 });

    const exportEvent = exportCard!.resolve();
    expect(exportEvent.cardId).toBe("export-surplus");
    expect(exportEvent.effects.some((effect) => effect.kind === "rumor" && effect.event.kind === "glut")).toBe(true);
    expect(exportEvent.effects).toContainEqual({ kind: "stock", portId: "grayhaven", goodId: "iron", delta: 2 });
  });

  it("draws one weighted event from the available deck", () => {
    const state = createInitialState();
    state.events = [];
    state.politicalEvents = [];
    state.marketStock.saffron.iron = 0;

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const event = drawWorldEvent(state);
      expect(event).toBeTruthy();
      expect(event!.effects.length).toBeGreaterThan(0);
      expect(event!.text.length).toBeGreaterThan(20);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("previews weighted world events without resolving them", () => {
    const state = createInitialState();
    state.events = [];
    state.politicalEvents = [];
    state.marketStock.saffron.iron = 0;
    state.marketStock.grayhaven.iron = marketStockCapacity("grayhaven", "iron") + 5;

    const previews = worldEventPreviews(state, 4);

    expect(previews.length).toBeGreaterThan(0);
    expect(previews[0].share).toBeGreaterThanOrEqual(previews.at(-1)!.share);
    expect(previews[0].detail.length).toBeGreaterThan(8);
    expect(previews[0].effects.length).toBeGreaterThan(0);
    expect(["Likely", "Rising", "Possible", "Faint"]).toContain(previews[0].label);
  });

  it("builds harbor cards from contracts and crew identity pressure", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.crew = ["boatswain"];
    state.crewProfiles = {
      boatswain: {
        temperament: "cautious",
        preference: "safe_water",
        loyalty: 58,
        strain: 76,
        demand: "safer_orders",
        demandExpires: state.day + 6,
      },
    };
    state.contracts = [
      {
        id: "clerk-job",
        originPortId: "grayhaven",
        destinationPortId: "saffron",
        factionId: "charter",
        goodId: "tea",
        units: 2,
        deadline: state.day + 2,
        reward: 300,
        penalty: 110,
        status: "active",
      },
    ];

    const candidates = worldEventCandidates(state);
    const contractCard = candidates.find((candidate) => candidate.id === "contract-clerk-clerk-job-grayhaven");
    const crewCard = candidates.find((candidate) => candidate.id === "crew-petition-boatswain-grayhaven");

    expect(contractCard).toBeTruthy();
    expect(crewCard).toBeTruthy();
    expect(contractCard!.resolve().cardId).toBe("harbor-contract-clerk");
    expect(crewCard!.resolve().cardId).toBe("harbor-crew-petition");
    expect(crewCard!.detail).toContain("safer orders");
  });

  it("can resolve a downtime event while waiting in port", () => {
    let state = createInitialState();
    state.day = 3;
    state.cash = 1000;
    state.events = [];
    state.politicalEvents = [];
    state.marketStock.saffron.iron = 0;
    const dockFee = dockFeeFor(state);

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      state = reduceGame(state, { type: "waitDay" });
    } finally {
      randomSpy.mockRestore();
    }

    expect(state.day).toBe(4);
    expect(state.cash).toBeGreaterThanOrEqual(1000 - dockFee * dockCreditPremium);
    expect(state.log.some((entry) => entry.text.startsWith("World event:"))).toBe(true);
    expect(state.events.length + state.politicalEvents.length).toBeGreaterThan(0);
  });

  it("builds arrival cards from cargo, water, manifests, and route memory", () => {
    const state = createInitialState();
    state.currentPort = "glassport";
    state.selectedPort = "glassport";
    state.cargo.tea = 6;
    state.cargoBasis.tea = 20;
    state.cargo.silk = 2;
    state.cargoBasis.silk = 60;
    state.market.glassport.tea = 120;
    state.market.glassport.silk = 180;
    state.crew = ["boatswain"];
    state.crewProfiles = {
      boatswain: {
        temperament: "cautious",
        preference: "safe_water",
        loyalty: 52,
        strain: 62,
        demand: "safer_orders",
        demandExpires: state.day + 6,
      },
    };
    state.factionStanding.charter = -8;
    state.contracts = [
      {
        id: "glass-handoff",
        originPortId: "grayhaven",
        destinationPortId: "glassport",
        factionId: "charter",
        goodId: "tea",
        units: 2,
        deadline: state.day + 4,
        reward: 340,
        penalty: 120,
        status: "active",
      },
    ];
    state.routeMemory[routeMemoryKey("grayhaven", "glassport")] = {
      fromId: "grayhaven",
      toId: "glassport",
      trips: 2,
      lastDay: state.day,
      totalProjectedProfit: 600,
      bestProjectedProfit: 420,
      worstProjectedProfit: 180,
      totalWear: 3,
      worstWear: 2,
      pirateTrouble: 0,
      inspectionTrouble: 0,
      heavyWeather: 0,
      lastLabel: "Good cargo swing",
      lastDetail: "balanced order | +$420 cargo swing | 2 wear | 12% risk",
      tone: "gain",
    };
    const voyage: Voyage = {
      fromId: "grayhaven",
      toId: "glassport",
      days: 3,
      risk: 0.18,
      sailPlan: "balanced",
      progress: 1,
      duration: 1,
    };
    const physics = {
      ...routePhysicsProfile(state, voyage.fromId, voyage.toId),
      pressure: 0.58,
      delayRisk: 0.12,
      cargoRisk: 0.1,
      assist: 0.24,
      crewStrain: 4,
    };

    const candidates = arrivalWorldEventCandidates(state, { voyage, physics, projectedProfit: 520 });
    const previews = arrivalEventPreviews(state, { voyage, physics, projectedProfit: 520 }, 3);

    expect(candidates.some((candidate) => candidate.id === "arrival-cargo-glassport-tea")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "arrival-hard-water-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "arrival-current-packet-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "arrival-manifest-glassport-silk")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "arrival-known-lane-grayhaven-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "arrival-contract-glassport-glass-handoff")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "arrival-crew-reputation-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "arrival-faction-dockside-glassport")).toBe(true);
    expect(previews.length).toBe(3);
    expect(previews[0].detail).toContain("Glassport");
    expect(previews.some((preview) => preview.effects.length > 0)).toBe(true);
  });

  it("builds underway cards from current, crew, cargo, and pressure", () => {
    const state = createInitialState();
    state.day = 8;
    state.crew = ["navigator", "boatswain"];
    state.crewXp = { navigator: 0, boatswain: 0 };
    state.crewProfiles = {
      navigator: {
        temperament: "bold",
        preference: "fast_water",
        loyalty: 52,
        strain: 12,
      },
      boatswain: {
        temperament: "cautious",
        preference: "safe_water",
        loyalty: 52,
        strain: 72,
        demand: "safer_orders",
        demandExpires: state.day + 6,
      },
    };
    state.crewMorale = 68;
    state.cargo.tea = 8;
    state.cargoBasis.tea = 24;
    state.cargo.iron = 2;
    state.cargoBasis.iron = 38;
    state.contracts = [
      {
        id: "underway-contract",
        originPortId: "grayhaven",
        destinationPortId: "glassport",
        factionId: "charter",
        goodId: "tea",
        units: 2,
        deadline: state.day + 3,
        reward: 360,
        penalty: 140,
        status: "active",
      },
    ];
    const voyage: Voyage = {
      fromId: "grayhaven",
      toId: "glassport",
      days: 3,
      risk: 0.36,
      sailPlan: "balanced",
      progress: 0.34,
      duration: 1,
    };
    const physics = {
      ...routePhysicsProfile(state, voyage.fromId, voyage.toId),
      pressure: 0.64,
      delayRisk: 0.14,
      cargoRisk: 0.16,
      assist: 0.28,
      crewStrain: 4,
      label: "Hard water",
      detail: "delay 14% | cargo 16% | crew 4",
    };

    const context = { voyage, physics, progress: 0.34, watchEffect: "strain" as const };
    const candidates = underwayWorldEventCandidates(state, context);
    const previews = underwayEventPreviews(state, context, 4);
    let drawn: ReturnType<typeof drawUnderwayWorldEvent> = null;
    for (let day = 1; day <= 40 && !drawn; day += 1) {
      state.day = day;
      drawn = drawUnderwayWorldEvent(state, context);
    }

    expect(candidates.some((candidate) => candidate.id === "underway-current-grayhaven-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "underway-drill-grayhaven-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "underway-cargo-trim-grayhaven-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "underway-wreckage-grayhaven-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "underway-market-packet-grayhaven-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "underway-contract-grayhaven-glassport-underway-contract")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "underway-crew-read-grayhaven-glassport")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "underway-storm-glass-grayhaven-glassport")).toBe(true);
    expect(previews).toHaveLength(4);
    expect(previews[0].detail).toContain("Glassport");
    expect(drawn).toBeTruthy();
    expect(drawn!.effects.length).toBeGreaterThan(0);
  });

  it("can resolve an arrival event after a clean docking", () => {
    let state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "glassport";
    state.cargo.tea = 6;
    state.cargoBasis.tea = 20;
    state.market.glassport.tea = 120;
    state.voyage = {
      fromId: "grayhaven",
      toId: "glassport",
      days: 1,
      risk: 0,
      sailPlan: "balanced",
      progress: 0.99,
      duration: 1,
    };

    let calls = 0;
    const randomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      calls += 1;
      return calls <= 3 ? 0.99 : 0;
    });
    try {
      state = reduceGame(state, { type: "tickVoyage", dt: 1 });
    } finally {
      randomSpy.mockRestore();
    }

    expect(state.currentPort).toBe("glassport");
    expect(state.log.some((entry) => entry.text.startsWith("Arrival event:"))).toBe(true);
    expect(state.events.some((event) => event.portId === "glassport" && event.goodId === "tea")).toBe(true);
  });

  it("can resolve an underway event during a voyage watch", () => {
    let resolved: ReturnType<typeof createInitialState> | null = null;
    for (let day = 1; day <= 80 && !resolved; day += 1) {
      let state = createInitialState();
      state.day = day;
      state.currentPort = "grayhaven";
      state.selectedPort = "glassport";
      state.sailPlan = "cautious";
      state.crew = ["navigator", "boatswain"];
      state.crewXp = { navigator: 0, boatswain: 0 };
      state.cargo.tea = 8;
      state.cargoBasis.tea = 24;
      state.voyage = {
        fromId: "grayhaven",
        toId: "glassport",
        days: 3,
        risk: 0.42,
        sailPlan: "cautious",
        progress: 0.33,
        duration: 1,
        watchIndex: 0,
        watch: null,
        wear: 0,
        wearLabel: "easy water",
      };

      state = reduceGame(state, { type: "tickVoyage", dt: 0.02 });
      if (state.log.some((entry) => entry.text.startsWith("Underway event:"))) resolved = state;
    }

    expect(resolved).toBeTruthy();
    expect(resolved!.log.some((entry) => entry.text.startsWith("Underway event:"))).toBe(true);
  });
});
