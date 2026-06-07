import { describe, expect, it } from "vitest";
import {
  oceanDepthToneAt,
  oceanRouteMotionSummary,
  oceanShipResponseSummary,
  oceanSurfaceRenderSummary,
  oceanSurfaceSignalKeys,
  oceanSurfaceVisualSummary,
  sampleRouteOcean,
  shipResponseSignalKeys,
} from "./ocean";

describe("production ocean surface signals", () => {
  it("reports the gameplay signals the Pixi water surface is expected to render", () => {
    const summary = oceanSurfaceVisualSummary(18, 2.4, 6);

    expect(summary.signalKeys).toEqual([...oceanSurfaceSignalKeys]);
    expect(summary.signalKeys).toContain("swell");
    expect(summary.signalKeys).toContain("current");
    expect(summary.signalKeys).toContain("roughness");
    expect(summary.signalKeys).toContain("storm");
    expect(summary.signalKeys).toContain("foam");
    expect(summary.signalKeys).toContain("route-risk");
    expect(summary.signalKeys).toContain("depth");
    expect(summary.averageCurrentStrength).toBeGreaterThan(0.05);
    expect(summary.averageWaveEnergy).toBeGreaterThan(0.08);
    expect(summary.averageRoughness).toBeGreaterThan(0.1);
    expect(summary.averageFoam).toBeGreaterThanOrEqual(0);
    expect(summary.maxStormIntensity).toBeGreaterThanOrEqual(0);
    expect(summary.depthContrast).toBeGreaterThan(0.18);
  });

  it("keeps harbor shelves visually distinct from deeper storm water", () => {
    const harborShelf = oceanDepthToneAt(0.18, 0.63);
    const northwallDeep = oceanDepthToneAt(0.78, 0.22);
    const orchidDrop = oceanDepthToneAt(0.73, 0.72);

    expect(harborShelf).toBeLessThan(northwallDeep);
    expect(orchidDrop).toBeGreaterThan(harborShelf);
    expect(Math.max(northwallDeep, orchidDrop) - harborShelf).toBeGreaterThan(0.2);
  });

  it("reports v2 sampled-water renderer signals for surface detail", () => {
    const summary = oceanSurfaceRenderSummary(22, 1.8, 7);

    expect(summary.rendererVersion).toBe("production-ocean-surface-v2");
    expect(summary.surfaceTileSamples).toBe(49);
    expect(summary.currentRibbonStrength).toBeGreaterThan(0.04);
    expect(summary.foamCoverage).toBeGreaterThan(0.02);
    expect(summary.normalVariance).toBeGreaterThan(0.08);
    expect(summary.stormCoverage).toBeGreaterThanOrEqual(0);
    expect(summary.signalKeys).toEqual([...oceanSurfaceSignalKeys]);
  });

  it("reports ocean-driven ship response and route curvature signals", () => {
    const route = oceanRouteMotionSummary(1000, 700, 22, 2.1, "grayhaven", "stormhook", 10);
    const ship = oceanShipResponseSummary(0.58, 0.42, 22, 2.1, -0.72);

    expect(route.signalKeys).toEqual([...shipResponseSignalKeys]);
    for (const signal of ["bob", "roll", "yaw", "wake", "drift", "foam", "route-curvature", "current-assist", "storm"]) {
      expect(route.signalKeys).toContain(signal);
    }
    expect(route.curvature).toBeGreaterThan(0);
    expect(route.averageWaveEnergy).toBeGreaterThan(0.08);
    expect(Number.isFinite(route.currentAssist)).toBe(true);
    expect(ship.waveEnergy).toBeGreaterThan(0.08);
    expect(ship.driftStrength).toBeGreaterThan(0.01);
    expect(Number.isFinite(ship.wakeDeflection)).toBe(true);
    expect(Number.isFinite(ship.responseStrength)).toBe(true);
  });

  it("reports bounded route sea-state forces for sailing physics", () => {
    let softest = Infinity;
    let hardest = -Infinity;
    let highestPeak = 0;

    for (let day = 1; day <= 30; day += 3) {
      for (const [fromId, toId] of [
        ["grayhaven", "stormhook"],
        ["saffron", "orchid"],
        ["glassport", "lowmarket"],
      ] as const) {
        const route = sampleRouteOcean(day, fromId, toId);
        softest = Math.min(softest, route.seaState.cargoSlam);
        hardest = Math.max(hardest, route.seaState.cargoSlam);
        highestPeak = Math.max(highestPeak, route.seaState.peakWaveHeight);

        expect(route.seaState.beamSea).toBeGreaterThanOrEqual(0);
        expect(route.seaState.beamSea).toBeLessThanOrEqual(1);
        expect(route.seaState.cargoSlam).toBeGreaterThanOrEqual(0);
        expect(route.seaState.cargoSlam).toBeLessThanOrEqual(1);
        expect(route.seaState.followingSea).toBeGreaterThanOrEqual(-1);
        expect(route.seaState.followingSea).toBeLessThanOrEqual(1);
        expect(route.seaState.peakWaveHeight).toBeGreaterThanOrEqual(0);
      }
    }

    expect(hardest).toBeGreaterThan(softest);
    expect(highestPeak).toBeGreaterThan(4);
  });

  it("makes rough northern water produce stronger ship-response inputs than harbor shelf water", () => {
    const harbor = oceanShipResponseSummary(0.18, 0.63, 18, 1.4, -0.45);
    const northwall = oceanShipResponseSummary(0.78, 0.22, 18, 1.4, -0.45);

    expect(northwall.roughness).toBeGreaterThan(harbor.roughness);
    expect(northwall.waveEnergy).toBeGreaterThan(harbor.waveEnergy);
    expect(northwall.foam).toBeGreaterThanOrEqual(harbor.foam);
  });
});
