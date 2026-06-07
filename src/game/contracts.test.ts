import { describe, expect, it } from "vitest";
import {
  contractBoardSlotsForPort,
  contractChainLabel,
  contractChainPoliticalReward,
  contractChainRewardText,
  contractChainTemplates,
  contractPlanSummary,
  contractRouteFitSummary,
  createNextContractChainOffer,
  refreshContracts,
  routeContractFocus,
  routeContractOfferFocus,
} from "./contracts";
import { ports } from "./data";
import { priceFor } from "./economy";
import { createInitialState } from "./reducer";
import type { Contract } from "./types";

describe("contract planning", () => {
  it("summarizes local offer cost, hold pressure, route risk, deadline slack, and destination upside", () => {
    const state = createInitialState();
    state.cash = 1000;
    state.market.grayhaven.tea = 30;
    state.market.glassport.tea = 92;
    state.marketStock.grayhaven.tea = 8;
    const contract: Contract = {
      id: "tea-run",
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

    const plan = contractPlanSummary(state, contract);
    const livePrice = priceFor(state, "grayhaven", "tea");

    expect(plan.status).toBe("loadable");
    expect(plan.cargoCost).toBe(plan.missing * livePrice);
    expect(plan.destinationImport).toBe(true);
    expect(plan.destinationMargin).toBeGreaterThan(0);
    expect(plan.holdCapacity).toBeGreaterThan(plan.holdAfter - 1);
    expect(plan.routeDays).toBeGreaterThan(0);
    expect(plan.deadlineSlack).toBe(contract.deadline - state.day - plan.routeDays);
    expect(plan.netValue).toBe(plan.rewardShare - plan.cargoCost);
  });

  it("surfaces route-first local offers with route fit facts before acceptance", () => {
    const state = createInitialState();
    state.cash = 900;
    state.currentPort = "grayhaven";
    state.selectedPort = "glassport";
    state.market.grayhaven.tea = 28;
    state.market.glassport.tea = 94;
    state.marketStock.grayhaven.tea = 10;
    const cleanOffer: Contract = {
      id: "clean-offer",
      originPortId: "grayhaven",
      destinationPortId: "glassport",
      factionId: "charter",
      goodId: "tea",
      units: 2,
      deadline: 13,
      reward: 360,
      penalty: 130,
      status: "available",
    };
    const blockedOffer: Contract = {
      ...cleanOffer,
      id: "blocked-offer",
      units: 30,
      reward: 7200,
    };
    state.contracts = [blockedOffer, cleanOffer];

    const focus = routeContractOfferFocus(state, "glassport");
    const fit = contractRouteFitSummary(state, cleanOffer);

    expect(focus?.contract.id).toBe("clean-offer");
    expect(focus?.plan.status).toBe("loadable");
    expect(focus?.fit.label).not.toBe("Blocked fit");
    expect(fit.cargoCost).toBe(fit.requiredCargo * priceFor(state, "grayhaven", "tea"));
    expect(fit.deadlineSlack).toBeGreaterThanOrEqual(0);
    expect(fit.routeRisk).toBeGreaterThan(0);
    expect(fit.holdAfter).toBeLessThanOrEqual(fit.holdCapacity);
    expect(fit.destinationUpsidePerUnit).toBeGreaterThan(0);
  });

  it("marks offers blocked when cash, stock, or hold cannot support the missing cargo", () => {
    const state = createInitialState();
    state.cash = 0;
    state.marketStock.grayhaven.tea = 0;
    const contract: Contract = {
      id: "blocked-run",
      originPortId: "grayhaven",
      destinationPortId: "glassport",
      factionId: "charter",
      goodId: "tea",
      units: 3,
      deadline: 9,
      reward: 300,
      penalty: 100,
      status: "available",
    };

    const plan = contractPlanSummary(state, contract);

    expect(plan.status).toBe("blocked");
    expect(plan.purchasable).toBe(false);
    expect(plan.marketAvailable).toBe(0);
    expect(plan.missing).toBe(3);
  });

  it("plans active multi-stop contracts against the next undelivered stop", () => {
    const state = createInitialState();
    state.currentPort = "saffron";
    state.selectedPort = "saffron";
    state.cargo.tea = 2;
    const contract: Contract = {
      id: "multi-plan",
      kind: "multi_stop",
      originPortId: "grayhaven",
      destinationPortId: "glassport",
      factionId: "charter",
      goodId: "tea",
      units: 3,
      deadline: 14,
      reward: 450,
      penalty: 180,
      status: "active",
      stops: [
        { portId: "saffron", goodId: "tea", units: 1, delivered: 1, reward: 150 },
        { portId: "glassport", goodId: "tea", units: 2, delivered: 0, reward: 300 },
      ],
    };

    const plan = contractPlanSummary(state, contract);

    expect(plan.stop.portId).toBe("glassport");
    expect(plan.status).toBe("in-transit");
    expect(plan.missing).toBe(0);
    expect(plan.routeDays).toBeGreaterThan(0);
    expect(plan.rewardShare).toBe(300);
  });

  it("focuses the route command on the most actionable contract stop", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.cash = 1000;
    state.market.grayhaven.tea = 30;
    state.marketStock.grayhaven.tea = 8;
    state.contracts = [
      {
        id: "tea-job",
        originPortId: "grayhaven",
        destinationPortId: "glassport",
        factionId: "charter",
        goodId: "tea",
        units: 2,
        deadline: 9,
        reward: 300,
        penalty: 120,
        status: "active",
      },
    ];

    const loadFocus = routeContractFocus(state, "glassport");

    expect(loadFocus?.contract.id).toBe("tea-job");
    expect(loadFocus?.plan.status).toBe("loadable");
    expect(loadFocus?.plan.missing).toBe(2);

    state.cargo.tea = 2;
    const sailFocus = routeContractFocus(state, "glassport");
    expect(sailFocus?.plan.status).toBe("in-transit");

    state.currentPort = "glassport";
    state.selectedPort = "glassport";
    const readyFocus = routeContractFocus(state, "glassport");
    expect(readyFocus?.status.ready).toBe(true);
  });

  it("caps neutral refreshed boards to one ordinary listing per port", () => {
    const state = createInitialState();
    state.contracts = ports.flatMap((port) => [
      makeContract(`${port.id}-tight`, port.id, 180, state.day + 6),
      makeContract(`${port.id}-rich`, port.id, 420, state.day + 12),
    ]);

    const refreshed = refreshContracts(state);

    for (const port of ports) {
      const localOffers = refreshed.filter((contract) => contract.status === "available" && contract.originPortId === port.id);
      expect(contractBoardSlotsForPort(state, port.id)).toBe(1);
      expect(localOffers).toHaveLength(1);
      expect(localOffers[0].id).toBe(`${port.id}-tight`);
    }
  });

  it("earns a second local board slot from trusted mid-game standing", () => {
    const state = createInitialState();
    state.day = 24;
    state.currentPort = "grayhaven";
    state.contracts = [];
    state.factionStanding.charter = 14;

    const refreshed = refreshContracts(state);
    const grayhavenOffers = refreshed.filter((contract) => contract.status === "available" && contract.originPortId === "grayhaven");
    const saffronOffers = refreshed.filter((contract) => contract.status === "available" && contract.originPortId === "saffron");

    expect(contractBoardSlotsForPort(state, "grayhaven")).toBe(2);
    expect(grayhavenOffers).toHaveLength(2);
    expect(contractBoardSlotsForPort(state, "saffron")).toBe(1);
    expect(saffronOffers).toHaveLength(1);
  });

  it("adds a second listing only at the current neutral harbor during the upgrade window", () => {
    const state = createInitialState();
    state.day = 24;
    state.currentPort = "grayhaven";
    state.contracts = [];

    const refreshed = refreshContracts(state);
    const grayhavenOffers = refreshed.filter((contract) => contract.status === "available" && contract.originPortId === "grayhaven");
    const saffronOffers = refreshed.filter((contract) => contract.status === "available" && contract.originPortId === "saffron");

    expect(contractBoardSlotsForPort(state, "grayhaven")).toBe(2);
    expect(grayhavenOffers).toHaveLength(2);
    expect(contractBoardSlotsForPort(state, "saffron")).toBe(1);
    expect(saffronOffers).toHaveLength(1);
  });

  it("preserves active and recent contract history while trimming available pressure", () => {
    const state = createInitialState();
    const active = makeContract("active-run", "grayhaven", 300, state.day + 8);
    active.status = "active";
    const completed = makeContract("completed-run", "saffron", 240, state.day + 8);
    completed.status = "completed";
    state.contracts = [
      active,
      completed,
      makeContract("grayhaven-a", "grayhaven", 180, state.day + 6),
      makeContract("grayhaven-b", "grayhaven", 420, state.day + 12),
    ];

    const refreshed = refreshContracts(state);

    expect(refreshed.find((contract) => contract.id === "active-run")?.status).toBe("active");
    expect(refreshed.find((contract) => contract.id === "completed-run")?.status).toBe("completed");
    expect(refreshed.filter((contract) => contract.status === "available" && contract.originPortId === "grayhaven")).toHaveLength(1);
  });

  it("creates named multi-stage contract chain offers with final rare rewards", () => {
    const state = createInitialState();
    state.contracts = [];

    expect(contractChainTemplates).toHaveLength(3);
    expect(contractChainTemplates.every((template) => template.stages.length === 3)).toBe(true);

    const first = createNextContractChainOffer(state, "grayhaven", "charter_audit");
    expect(first?.chain).toMatchObject({
      id: "charter_audit",
      giver: "Maribel Quill",
      title: "Ledger Audit",
      stage: 1,
      stages: 3,
    });
    expect(first?.originPortId).toBe("grayhaven");
    expect(first?.destinationPortId).toBe("glassport");
    expect(contractChainLabel(first!)).toBe("Maribel Quill: Ledger Audit 1/3");
    expect(createNextContractChainOffer({ ...state, contracts: [first!] }, "grayhaven", "charter_audit")).toBeNull();

    const completedFirst: Contract = { ...first!, status: "completed", completedDay: state.day };
    const second = createNextContractChainOffer({ ...state, contracts: [completedFirst] }, "glassport", "charter_audit");
    expect(second?.chain?.stage).toBe(2);
    expect(second?.chain?.hook).toContain("warehouse leak");

    const completedSecond: Contract = { ...second!, status: "completed", completedDay: state.day + 1 };
    const final = createNextContractChainOffer(
      { ...state, contracts: [completedFirst, completedSecond] },
      "orchid",
      "charter_audit"
    );

    expect(final?.chain?.stage).toBe(3);
    expect(final?.chain?.rareReward).toBe("Charter credit note");
    expect(final?.chain?.rewardCash).toBe(180);
    expect(contractChainRewardText(final!)).toContain("Charter credit note");
    expect(contractChainRewardText(final!)).toContain("bonus $180");
    expect(contractChainPoliticalReward(final!)?.kind).toBe("permit");
  });

  it("refreshes boards without duplicating an available or active chain stage", () => {
    const state = createInitialState();
    state.contracts = [];
    const offer = createNextContractChainOffer(state, "grayhaven", "charter_audit")!;
    state.contracts = [{ ...offer, status: "active" }];

    const refreshed = refreshContracts(state);
    const liveCharterStages = refreshed.filter((contract) => {
      return contract.chain?.id === "charter_audit" && (contract.status === "available" || contract.status === "active");
    });

    expect(liveCharterStages).toHaveLength(1);
    expect(liveCharterStages[0].chain?.stage).toBe(1);
  });
});

function makeContract(id: string, originPortId: string, reward: number, deadline: number): Contract {
  const destinationPortId = ports.find((port) => port.id !== originPortId)?.id ?? "glassport";
  return {
    id,
    originPortId,
    destinationPortId,
    factionId: "charter",
    goodId: "tea",
    units: 2,
    deadline,
    reward,
    penalty: Math.round(reward * 0.4),
    status: "available",
  };
}
