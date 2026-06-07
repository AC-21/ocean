import { describe, expect, it } from "vitest";
import { gridObjectCouplingFor, type FluidGridObjectCouplingInput } from "./fluidGridCoupling";
import { createFluidGridStepPlan } from "./fluidGridGpu";
import { gridSplashCouplingFor, nextSplashMemory, type FluidGridSplashInput } from "./fluidGridSplash";

describe("fluid grid splash coupling", () => {
  it("turns local object-grid energy into foam, spray, and a crown", () => {
    const objectCoupling = gridObjectCouplingFor(objectInput());
    const splash = gridSplashCouplingFor(splashInput(), objectCoupling.summary, objectCoupling.samples);

    expect(splash.summary.coupling).toBe("grid-splash-v1");
    expect(splash.summary.active).toBe(true);
    expect(splash.summary.boundedDiagnostics).toBe(true);
    expect(splash.summary.gridEnergyJ).toBeGreaterThan(0);
    expect(splash.summary.foamCells).toBeGreaterThan(0);
    expect(splash.summary.foamInjection).toBeGreaterThan(0);
    expect(splash.summary.sprayDropletCount).toBeGreaterThan(0);
    expect(splash.summary.sprayMassKg).toBeGreaterThan(0);
    expect(splash.summary.crownHeightM).toBeGreaterThan(0);
    expect(splash.summary.entrainedAirFraction).toBeGreaterThan(0);
    expect(splash.samples.length).toBe(splash.summary.gridSampleCount);
    expect(splash.samples.length).toBeLessThanOrEqual(12_288);
  });

  it("scales breakup and spray count with Weber and Froude energy", () => {
    const objectCoupling = gridObjectCouplingFor(objectInput());
    const gentle = gridSplashCouplingFor(
      splashInput({
        ejectedWaterKg: 1.6,
        froudeNumber: 0.8,
        impactStrength: 0.22,
        splashEnergyJ: 120,
        splashHeightM: 0.24,
        weberNumber: 900,
      }),
      objectCoupling.summary,
      objectCoupling.samples
    );
    const violent = gridSplashCouplingFor(
      splashInput({
        ejectedWaterKg: 22,
        froudeNumber: 3.1,
        impactStrength: 0.92,
        splashEnergyJ: 7_500,
        splashHeightM: 2.1,
        weberNumber: 240_000,
      }),
      objectCoupling.summary,
      objectCoupling.samples
    );

    expect(violent.summary.surfaceBreakupFactor).toBeGreaterThan(gentle.summary.surfaceBreakupFactor);
    expect(violent.summary.foamEnergyJ).toBeGreaterThan(gentle.summary.foamEnergyJ * 5);
    expect(violent.summary.sprayDropletCount).toBeGreaterThan(gentle.summary.sprayDropletCount);
    expect(violent.summary.crownHeightM).toBeGreaterThan(gentle.summary.crownHeightM);
  });

  it("feeds secondary droplet reentry back into grid impulse and memory", () => {
    const objectCoupling = gridObjectCouplingFor(objectInput());
    const memory = { accumulatedReentryEnergyJ: 8, accumulatedReentryMassKg: 0.004, peakFoamEnergyJ: 12 };
    const splash = gridSplashCouplingFor(
      splashInput({
        sprayReentryCount: 6,
        sprayReentryEnergyJ: 42,
        sprayReentryMassKg: 0.031,
      }),
      objectCoupling.summary,
      objectCoupling.samples,
      memory
    );
    const next = nextSplashMemory(memory, splash.summary);

    expect(splash.summary.reentryCoupledEnergyJ).toBeGreaterThan(0);
    expect(splash.summary.secondaryImpulseMagnitude).toBeGreaterThan(0);
    expect(splash.samples.some((sample) => sample.impulseMps > 0)).toBe(true);
    expect(next.accumulatedReentryEnergyJ).toBeGreaterThan(memory.accumulatedReentryEnergyJ);
    expect(next.accumulatedReentryMassKg).toBeGreaterThan(memory.accumulatedReentryMassKg);
  });
});

function objectInput(patch: Partial<FluidGridObjectCouplingInput> = {}): FluidGridObjectCouplingInput {
  const plan = createFluidGridStepPlan({ tier: "high", steps: 1 });
  return {
    buoyancyN: 2_600,
    canvasHeightPx: 720,
    canvasWidthPx: 1180,
    currentSpeedMps: 0.18,
    displacedVolumeM3: 0.08,
    displacedVolumeRateM3ps: 0.42,
    dragForceXN: -20,
    dragForceYN: 180,
    gravityMps2: 9.80665,
    impactStrength: 0.72,
    massKg: 895,
    netForceN: 1_100,
    objectAngleRad: -0.12,
    objectCenterXPx: 590,
    objectCenterYPx: 338,
    objectDepthM: 0.72,
    objectHalfHeightPx: 18,
    objectHalfWidthPx: 18,
    objectHeightM: 0.72,
    objectVxMps: 0.34,
    objectVyMps: -4.8,
    objectWidthM: 0.72,
    plan,
    scalePxPerM: 48,
    shape: "box",
    slamForceN: 2_400,
    submergedFraction: 0.42,
    surfaceYPx: 304,
    timeS: 1.24,
    waterDensityKgM3: 1025,
    waterDepthM: 22,
    waveHeightM: 0.85,
    ...patch,
  };
}

function splashInput(patch: Partial<FluidGridSplashInput> = {}): FluidGridSplashInput {
  return {
    currentSpeedMps: 0.18,
    ejectedWaterKg: 11.2,
    froudeNumber: 2.4,
    gravityMps2: 9.80665,
    impactStrength: 0.72,
    objectVxMps: 0.34,
    objectVyMps: -4.8,
    plan: createFluidGridStepPlan({ tier: "high", steps: 1 }),
    sprayParticleCount: 74,
    sprayReentryCount: 0,
    sprayReentryEnergyJ: 0,
    sprayReentryMassKg: 0,
    splashEnergyJ: 2_800,
    splashHeightM: 1.3,
    surfaceTensionNpm: 0.073,
    timeS: 1.24,
    waterDensityKgM3: 1025,
    weberNumber: 82_000,
    ...patch,
  };
}
