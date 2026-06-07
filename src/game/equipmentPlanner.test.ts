import { describe, expect, it } from "vitest";
import { crewFacilityFor, crewFacilitySummary } from "./crew";
import { equipmentCatalog } from "./data";
import { equipmentRecommendationFor, equipmentRecommendationsFor } from "./equipmentPlanner";
import { equipmentFitBonusFor } from "./outfitting";
import { createInitialState } from "./reducer";
import { routeMemoryKey } from "./routeMemory";
import { routeRisk, routeWearEstimate } from "./routing";
import { yardPriceFor } from "./shipyard";
import { deriveShipStats } from "./stats";

describe("equipment recommendations", () => {
  it("ranks refits with route deltas and real yard prices", () => {
    const state = createInitialState();
    state.cash = 1600;
    state.selectedPort = "stormhook";

    const recommendations = equipmentRecommendationsFor(state, 4);

    expect(recommendations.length).toBe(4);
    expect(recommendations.every((recommendation) => recommendation.routeDelta)).toBe(true);
    expect(recommendations.every((recommendation) => recommendation.buildFits.length > 0)).toBe(true);
    expect(recommendations.some((recommendation) => recommendation.buildDelta.some((delta) => delta.delta > 0))).toBe(true);
    expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score);
    expect(recommendations[0].price).toBe(yardPriceFor(state, recommendations[0].item));
    expect(recommendations.some((recommendation) => recommendation.reason === "Lane fit")).toBe(true);
  });

  it("surfaces crew-quarter refits when the ship is at crew capacity", () => {
    const state = createInitialState();
    state.cash = 3000;
    state.crew = ["navigator", "boatswain"];
    state.crewXp = { navigator: 0, boatswain: 0 };

    const recommendations = equipmentRecommendationsFor(state, 5);

    const quartersRecommendation = recommendations.find((recommendation) => recommendation.item.slot === "quarters" && (recommendation.delta.crewCap ?? 0) > 0);
    expect(quartersRecommendation).toBeTruthy();
    expect(quartersRecommendation?.reason).toBe("Crew growth");
  });

  it("values crew comfort facilities when morale is strained", () => {
    const state = createInitialState();
    state.cash = 3000;
    state.crew = ["navigator"];
    state.crewXp = { navigator: 0 };
    state.crewMorale = 38;

    const recommendations = equipmentRecommendationsFor(state, 5);

    const comfort = recommendations.find((recommendation) => recommendation.item.id === "galley_mess");
    expect(comfort).toBeTruthy();
    expect(comfort?.reason).toBe("Crew comfort");
    expect(comfort?.score).toBeGreaterThan(0);
  });

  it("surfaces hold refits when loaded cargo is pressing capacity", () => {
    const state = createInitialState();
    state.cash = 3000;
    state.cargo.tools = 9;

    const cargoHoist = equipmentRecommendationFor(state, {
      id: "cargo_hoist",
      name: "Cargo Hoist",
      factionId: "league",
      cost: 820,
      slot: "deck",
      effects: { cargoCap: 8 },
      note: "more freight without killing dock speed",
    });

    expect(cargoHoist.reason).toBe("Hold pressure");
    expect(cargoHoist.delta.cargoCap).toBeGreaterThan(0);
    expect(cargoHoist.cargoFits).toBe(true);
  });

  it("does not recommend refits that would strand current cargo or crew", () => {
    const state = createInitialState();
    state.cash = 3000;
    state.equipment = ["cargo_hoist"];
    state.cargo.tools = 12;

    const recommendations = equipmentRecommendationsFor(state, 10);

    expect(recommendations.some((recommendation) => recommendation.replacing?.id === "cargo_hoist")).toBe(false);
  });

  it("adds role-specific refits for water, politics, guns, and crew endurance", () => {
    const refitIds = equipmentCatalog.map((item) => item.id);
    expect(refitIds).toEqual(expect.arrayContaining(["drogue_anchor", "customs_ledger", "long_nines", "watch_bunks"]));
    expect(equipmentCatalog.find((item) => item.id === "drogue_anchor")?.slot).toBe("deck");
    expect(equipmentCatalog.find((item) => item.id === "customs_ledger")?.slot).toBe("instrument");
    expect(equipmentCatalog.find((item) => item.id === "long_nines")?.slot).toBe("hardpoint");
    expect(equipmentCatalog.find((item) => item.id === "watch_bunks")?.slot).toBe("quarters");

    const carrier = createInitialState();
    carrier.currentShip = "league_carrier";
    carrier.ownedShips.push("league_carrier");
    carrier.equipment = ["drogue_anchor", "customs_ledger", "watch_bunks"];

    expect(equipmentFitBonusFor("league_carrier", "drogue_anchor")?.label).toBe("Loaded sea bridle");
    expect(equipmentFitBonusFor("league_carrier", "customs_ledger")?.label).toBe("Carrier manifest office");
    expect(equipmentFitBonusFor("league_carrier", "watch_bunks")?.label).toBe("Carrier shift bunks");
    expect(deriveShipStats(carrier)).toMatchObject({
      cargoCap: 66,
      crewCap: 7,
      openWater: 5,
      negotiation: 3,
    });

    const cutter = createInitialState();
    cutter.currentShip = "harbor_cutter";
    cutter.ownedShips.push("harbor_cutter");
    cutter.equipment = ["customs_ledger", "long_nines", "watch_bunks"];

    expect(equipmentFitBonusFor("harbor_cutter", "customs_ledger")?.label).toBe("Inspection papers desk");
    expect(equipmentFitBonusFor("harbor_cutter", "long_nines")?.label).toBe("Cutter chase guns");
    expect(equipmentFitBonusFor("harbor_cutter", "watch_bunks")?.label).toBe("Boarding watch bunks");
    expect(deriveShipStats(cutter)).toMatchObject({
      cannons: 7,
      crewCap: 6,
      navigation: 2,
      negotiation: 2,
    });

    const barge = createInitialState();
    barge.currentShip = "iron_barge";
    barge.ownedShips.push("iron_barge");
    barge.equipment = ["long_nines"];

    expect(equipmentFitBonusFor("iron_barge", "long_nines")?.label).toBe("Fortress gun crew");
    expect(deriveShipStats(barge).cannons).toBe(7);
  });

  it("treats watch bunks as a crew facility and drogue anchors as hard-water control", () => {
    const facility = crewFacilityFor({ equipment: ["watch_bunks"] });
    expect(facility.id).toBe("watch_bunks");
    expect(facility.moraleStrainRelief).toBeGreaterThan(crewFacilityFor({ equipment: ["crew_quarters"] }).moraleStrainRelief);
    expect(facility.xpMultiplier).toBeGreaterThan(1);
    expect(crewFacilitySummary({ equipment: ["watch_bunks"] })).toContain("faster crew XP");

    const before = createInitialState();
    before.selectedPort = "stormhook";
    const after = { ...before, equipment: ["drogue_anchor"] };

    expect(routeRisk(after, "grayhaven", "stormhook")).toBeLessThan(routeRisk(before, "grayhaven", "stormhook"));
    expect(routeWearEstimate(after, "grayhaven", "stormhook").hullWear).toBeLessThan(routeWearEstimate(before, "grayhaven", "stormhook").hullWear);
  });

  it("recommends specialist refits for matching route, politics, pirate, and crew pressure", () => {
    const hardWater = createInitialState();
    hardWater.cash = 3000;
    hardWater.selectedPort = "stormhook";
    expect(equipmentRecommendationFor(hardWater, catalogItem("drogue_anchor")).reason).toBe("Hard-water control");

    const customs = createInitialState();
    customs.cash = 4000;
    customs.selectedPort = "stormhook";
    customs.cargo.spice = 4;
    customs.factionStanding.admiralty = -8;
    customs.politicalEvents.push({
      id: "planner-inspection",
      factionId: "admiralty",
      kind: "inspection",
      riskModifier: 0.12,
      priceModifier: 1.08,
      expires: customs.day + 4,
      text: "Admiralty inspectors are checking spice papers.",
    });
    const neutralCustoms = createInitialState();
    neutralCustoms.cash = 4000;
    const customsLedger = catalogItem("customs_ledger");
    const customsRecommendation = equipmentRecommendationFor(customs, customsLedger);
    expect(customsRecommendation.reason).toBe("Customs edge");
    expect(customsRecommendation.score).toBeGreaterThan(equipmentRecommendationFor(neutralCustoms, customsLedger).score + 12);

    const pirates = createInitialState();
    pirates.cash = 4000;
    pirates.selectedPort = "stormhook";
    pirates.routeMemory[routeMemoryKey("grayhaven", "stormhook")] = {
      fromId: "grayhaven",
      toId: "stormhook",
      trips: 3,
      lastDay: pirates.day,
      totalProjectedProfit: 900,
      bestProjectedProfit: 420,
      worstProjectedProfit: 120,
      totalWear: 8,
      worstWear: 5,
      pirateTrouble: 2,
      inspectionTrouble: 0,
      heavyWeather: 0,
      lastLabel: "Pirate hail",
      lastDetail: "Pirates pressed the lane twice.",
      tone: "risk",
    };
    expect(equipmentRecommendationFor(pirates, catalogItem("long_nines")).reason).toBe("Pirate answer");

    const crew = createInitialState();
    crew.cash = 4000;
    crew.selectedPort = "stormhook";
    crew.crew = ["navigator"];
    crew.crewXp = { navigator: 0 };
    crew.crewMorale = 35;
    crew.crewProfiles.navigator = {
      temperament: "steady",
      preference: "safe_water",
      loyalty: 62,
      strain: 82,
    };
    expect(equipmentRecommendationFor(crew, catalogItem("watch_bunks")).reason).toBe("Crew endurance");
  });
});

function catalogItem(id: string) {
  const item = equipmentCatalog.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing equipment ${id}`);
  return item;
}
