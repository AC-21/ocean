import { describe, expect, it } from "vitest";
import { routePhysicsDebugFor } from "./physicsDebug";
import { createInitialState } from "./reducer";
import { routeConditions, routePhysicsProfile, routeRisk, routeWearEstimate } from "./routing";

describe("route physics debug", () => {
  it("reports route physics from the shared ocean and route model", () => {
    const state = createInitialState();
    state.day = 18;
    state.currentPort = "grayhaven";
    state.selectedPort = "stormhook";
    state.sailPlan = "hard";
    state.cargo.iron = 5;
    state.cargoBasis.iron = 42;
    state.crew = ["navigator", "boatswain"];
    state.crewXp = { navigator: 90, boatswain: 170 };
    state.crewTraits = { navigator: ["storm_scarred"], boatswain: ["loyal"] };

    const debug = routePhysicsDebugFor(state, "grayhaven", "stormhook");
    const conditions = routeConditions(state, "grayhaven", "stormhook");
    const profile = routePhysicsProfile(state, "grayhaven", "stormhook");
    const wear = routeWearEstimate(state, "grayhaven", "stormhook");

    expect(debug.fromId).toBe("grayhaven");
    expect(debug.toId).toBe("stormhook");
    expect(debug.speedMultiplier).toBe(Number(conditions.speedMultiplier.toFixed(3)));
    expect(debug.speedDelta).toBe(conditions.speedDelta);
    expect(debug.profile).toEqual(profile);
    expect(debug.risk).toBe(Number(routeRisk(state, "grayhaven", "stormhook").toFixed(3)));
    expect(debug.wear).toBe(wear.hullWear);
    expect(debug.wind.strength).toBeGreaterThan(0);
    expect(debug.current.strength).toBeGreaterThanOrEqual(0);
    expect(debug.water.waveEnergy).toBeGreaterThanOrEqual(0);
    expect(debug.water.stormIntensity).toBeGreaterThanOrEqual(0);
    expect(debug.water.seaState).toEqual(profile.seaState);
    expect(debug.water.seaState.cargoSlam).toBeGreaterThanOrEqual(0);
  });

  it("samples ship motion along quarter, mid, and three-quarter route points", () => {
    const state = createInitialState();
    state.day = 22;
    const debug = routePhysicsDebugFor(state, "glassport", "orchid");

    expect(debug.samples.map((sample) => sample.progress)).toEqual([0.25, 0.5, 0.75]);
    for (const sample of debug.samples) {
      expect(sample.normX).toBeGreaterThanOrEqual(0);
      expect(sample.normX).toBeLessThanOrEqual(1);
      expect(sample.normY).toBeGreaterThanOrEqual(0);
      expect(sample.normY).toBeLessThanOrEqual(1);
      expect(Number.isFinite(sample.bob)).toBe(true);
      expect(Number.isFinite(sample.roll)).toBe(true);
      expect(Number.isFinite(sample.yaw)).toBe(true);
      expect(Number.isFinite(sample.wakeAngle)).toBe(true);
      expect(Number.isFinite(sample.hullResponse)).toBe(true);
      expect(sample.wakeLength).toBeGreaterThan(0);
      expect(sample.wakeSpread).toBeGreaterThan(0);
      expect(Number.isFinite(sample.wakeTurbulence)).toBe(true);
      expect(sample.waveEnergy).toBeGreaterThanOrEqual(0);
    }
  });
});
