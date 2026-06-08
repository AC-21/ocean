import { describe, expect, it } from "vitest";
import { oceanPhysicsLiveSnapshotFor, oceanPhysicsMotionSnapshotFor, preferredFluidTierFromSearch, runtimeFluidTierSelectionFromSearch } from "./OceanPhysicsApp";
import { cloneObjectSpec, createSimulation, defaultOceanSettings, objectPresets, startDrop, stepSimulation } from "./physicsOcean";

const calmSettings = {
  ...defaultOceanSettings,
  currentSpeedMps: 0,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

describe("ocean physics live snapshot", () => {
  it("parses an explicit WebGPU fluid tier from the app URL", () => {
    expect(preferredFluidTierFromSearch("?fluidTier=ultra")).toBe("ultra");
    expect(preferredFluidTierFromSearch("?fluidTier=standard")).toBe("standard");
    expect(preferredFluidTierFromSearch("?fluidTier=auto&calibratedFluidTier=ultra")).toBeUndefined();
    expect(preferredFluidTierFromSearch("?fluidTier=banana")).toBeUndefined();
    expect(preferredFluidTierFromSearch("")).toBeUndefined();

    expect(runtimeFluidTierSelectionFromSearch("?fluidTier=standard&calibratedFluidTier=ultra")).toMatchObject({
      mode: "explicit",
      preferredTier: "standard",
      requestedTier: "standard",
    });
    expect(runtimeFluidTierSelectionFromSearch("?fluidTier=auto&calibratedFluidTier=ultra")).toMatchObject({
      mode: "calibrated-auto",
      preferredTier: "ultra",
      requestedTier: "auto",
    });
    expect(runtimeFluidTierSelectionFromSearch("")).toMatchObject({
      mode: "default-high",
      preferredTier: "high",
      requestedTier: "default",
    });
  });

  it("exposes reference-ready float prediction and diagnostic fields", () => {
    const iceBlock = cloneObjectSpec(requiredPreset("ice-block"));
    const state = createSimulation(iceBlock, 1, 0);
    const snapshot = oceanPhysicsLiveSnapshotFor({
      dropHeightM: 1,
      releaseAngleRad: 0,
      selectedPresetId: iceBlock.id,
      settings: calmSettings,
      spec: iceBlock,
      state,
      waterRenderMode: "webgpu",
    });

    expect(snapshot.version).toBe("ocean-physics-live-v1");
    expect(snapshot.spec.id).toBe("ice-block");
    expect(snapshot.prediction.outcome).toBe("floats-indefinitely");
    expect(snapshot.prediction.initialSubmergedDepthM).toBeGreaterThan(0);
    expect(snapshot.diagnostics.equilibriumSubmergedFraction).toBeCloseTo(iceBlock.densityKgM3 / calmSettings.waterDensityKgM3, 4);
    expect(snapshot.settings.waveHeightM).toBe(0);
    expect(snapshot.waterRenderMode).toBe("webgpu");
  });

  it("captures live impact speed and splash height once the object enters water", () => {
    const concrete = cloneObjectSpec(requiredPreset("concrete-cube"));
    let state = startDrop(createSimulation(concrete, 8, 0));
    for (let index = 0; index < 400 && state.impact === null; index += 1) {
      state = stepSimulation(state, concrete, calmSettings, 1 / 120);
    }

    const snapshot = oceanPhysicsLiveSnapshotFor({
      dropHeightM: 8,
      releaseAngleRad: 0,
      selectedPresetId: concrete.id,
      settings: calmSettings,
      spec: concrete,
      state,
      waterRenderMode: "webgpu",
    });

    expect(snapshot.impact?.impactSpeedMps).toBeGreaterThan(10);
    expect(snapshot.impact?.splashHeightM).toBeGreaterThan(0);
    expect(snapshot.liveFloatDurationS).toBeGreaterThanOrEqual(0);
    expect(snapshot.phase).not.toBe("ready");
  });

  it("patches fast motion fields while keeping cached prediction diagnostics", () => {
    const foam = cloneObjectSpec(requiredPreset("foam-rescue-block"));
    const initialState = createSimulation(foam, 1.35, 0.18);
    const initialSnapshot = oceanPhysicsLiveSnapshotFor({
      dropHeightM: 1.35,
      releaseAngleRad: 0.18,
      selectedPresetId: foam.id,
      settings: calmSettings,
      spec: foam,
      state: initialState,
      waterRenderMode: "webgpu",
    });
    let state = startDrop(initialState);
    for (let index = 0; index < 20; index += 1) {
      state = stepSimulation(state, foam, calmSettings, 1 / 120);
    }

    const motionSnapshot = oceanPhysicsMotionSnapshotFor(initialSnapshot, {
      dropHeightM: 1.35,
      releaseAngleRad: 0.18,
      selectedPresetId: foam.id,
      settings: calmSettings,
      spec: foam,
      state,
      waterRenderMode: "webgpu",
    });

    expect(motionSnapshot.timeS).toBeGreaterThan(initialSnapshot.timeS);
    expect(motionSnapshot.object.centerYM).toBeLessThan(initialSnapshot.object.centerYM);
    expect(motionSnapshot.diagnostics.submergedFraction).toBeGreaterThanOrEqual(0);
    expect(motionSnapshot.prediction).toBe(initialSnapshot.prediction);
    expect(motionSnapshot.equilibrium.draftErrorM).toBe(initialSnapshot.equilibrium.draftErrorM);
  });
});

function requiredPreset(id: string) {
  const preset = objectPresets.find((entry) => entry.id === id);
  if (!preset) throw new Error(`Missing preset ${id}`);
  return preset;
}
