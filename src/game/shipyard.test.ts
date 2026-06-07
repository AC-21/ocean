import { describe, expect, it } from "vitest";
import { buildFitDeltaForStats, previewShip, topBuildFitsForStats } from "./shipyard";
import { createInitialState } from "./reducer";
import type { ShipStats } from "./types";

describe("shipyard build planning", () => {
  it("classifies obvious hull stat profiles into readable build archetypes", () => {
    const fastCourier: ShipStats = {
      cargoCap: 18,
      cannons: 1,
      crewCap: 2,
      hullMax: 88,
      navigation: 4,
      negotiation: 0,
      openWater: 3,
      speed: 7,
    };
    const armoredHauler: ShipStats = {
      cargoCap: 58,
      cannons: 5,
      crewCap: 4,
      hullMax: 148,
      navigation: 1,
      negotiation: 1,
      openWater: 3,
      speed: 1,
    };
    const heavyCargo: ShipStats = {
      cargoCap: 72,
      cannons: 1,
      crewCap: 5,
      hullMax: 112,
      navigation: 0,
      negotiation: 1,
      openWater: 1,
      speed: 1,
    };
    const patrolCutter: ShipStats = {
      cargoCap: 24,
      cannons: 4,
      crewCap: 3,
      hullMax: 104,
      navigation: 3,
      negotiation: 2,
      openWater: 4,
      speed: 4,
    };

    expect(topBuildFitsForStats(fastCourier, "clipper_kite", 1)[0].id).toBe("fast_courier");
    expect(topBuildFitsForStats(armoredHauler, "iron_barge", 1)[0].id).toBe("armored_hauler");
    expect(topBuildFitsForStats(heavyCargo, "league_carrier", 1)[0].id).toBe("heavy_cargo");
    expect(topBuildFitsForStats(patrolCutter, "harbor_cutter", 1)[0].id).toBe("patrol_cutter");
  });

  it("summarizes build deltas when a refit or hull changes strategy fit", () => {
    const before: ShipStats = {
      cargoCap: 20,
      cannons: 1,
      crewCap: 2,
      hullMax: 100,
      navigation: 0,
      negotiation: 0,
      openWater: 1,
      speed: 1,
    };
    const after: ShipStats = {
      ...before,
      cargoCap: 32,
      crewCap: 3,
      navigation: 2,
      speed: 2,
    };

    const deltas = buildFitDeltaForStats(before, after, "ledger_brig");

    expect(deltas.some((delta) => delta.id === "contract_runner" && delta.delta > 0)).toBe(true);
    expect(deltas[0].delta).not.toBe(0);
  });

  it("previews route-fit deltas and build identities for ship purchases", () => {
    const state = createInitialState();
    state.cash = 6000;
    state.selectedPort = "stormhook";

    const preview = previewShip(state, "iron_barge");

    expect(preview?.buildFits.length).toBe(2);
    expect(preview?.buildFits[0].label).toBe("Armored Hauler");
    expect(preview?.route).toBeTruthy();
    expect(preview?.routeDelta).toBeTruthy();
    expect(
      preview?.routeDelta &&
        [preview.routeDelta.days, preview.routeDelta.risk, preview.routeDelta.speed, preview.routeDelta.wear].some((value) => Math.abs(value) > 0)
    ).toBe(true);
  });

  it("gives the League Carrier a distinct heavy-cargo build target", () => {
    const state = createInitialState();
    state.cash = 6000;
    state.selectedPort = "lowmarket";

    const preview = previewShip(state, "league_carrier");

    expect(preview?.buildFits[0].label).toBe("Heavy Cargo");
    expect(preview?.stats.cargoCap).toBeGreaterThan(55);
    expect(preview?.identity).toContain("Heavy Freighter");
    expect(preview?.upgradePath).toContain("cargo hoist");
  });

  it("gives the Harbor Cutter a compact patrol build with route safety and cargo tradeoffs", () => {
    const state = createInitialState();
    state.cash = 4000;
    state.selectedPort = "stormhook";

    const preview = previewShip(state, "harbor_cutter");
    const brigPreview = previewShip(state, "ledger_brig");

    expect(preview?.buildFits[0].label).toBe("Patrol Cutter");
    expect(preview?.identity).toContain("Patrol Cutter");
    expect(preview?.upgradePath).toContain("customs ledger");
    expect(preview?.stats.cargoCap).toBeLessThan(brigPreview?.stats.cargoCap ?? 0);
    expect(preview?.stats.cannons).toBeGreaterThan(brigPreview?.stats.cannons ?? 99);
    expect(preview?.routeDelta?.risk ?? 0).toBeGreaterThan(0);
  });
});
