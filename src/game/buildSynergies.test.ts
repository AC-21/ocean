import { describe, expect, it } from "vitest";
import {
  activeBuildSynergiesFor,
  buildSynergyEffectsFor,
  buildSynergyProgressFor,
  validateBuildSynergyCatalog,
} from "./buildSynergies";
import { createInitialState } from "./reducer";
import { deriveShipStats } from "./stats";

describe("build synergies", () => {
  it("keeps every synergy requirement pointed at real ships, refits, and crew", () => {
    expect(validateBuildSynergyCatalog()).toBe(true);
  });

  it("activates a named League freight build and applies live stat effects", () => {
    const state = createInitialState();
    state.currentShip = "league_carrier";
    state.equipment = ["cargo_hoist"];
    state.crew = ["quartermaster"];

    const active = activeBuildSynergiesFor(state);
    const effects = buildSynergyEffectsFor(state);
    const stats = deriveShipStats(state);

    expect(active.map((synergy) => synergy.id)).toContain("league_freightline");
    expect(effects).toMatchObject({ cargoCap: 8, negotiation: 1 });
    expect(stats.cargoCap).toBeGreaterThanOrEqual(94);
    expect(stats.negotiation).toBeGreaterThanOrEqual(3);
  });

  it("shows near-complete progress with useful missing requirements", () => {
    const state = createInitialState();
    state.currentShip = "clipper_kite";
    state.equipment = ["deep_rigging"];

    const progress = buildSynergyProgressFor(state);
    const windknife = progress.find((entry) => entry.id === "freeport_windknife");

    expect(windknife).toMatchObject({
      active: false,
      label: "Freeport Windknife",
      progress: 2,
      requirementCount: 3,
    });
    expect(windknife?.missing).toEqual(["route specialist"]);
  });
});
