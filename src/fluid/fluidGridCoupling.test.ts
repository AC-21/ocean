import { describe, expect, it } from "vitest";
import { gridObjectCouplingFor, type FluidGridObjectCouplingInput } from "./fluidGridCoupling";
import { createFluidGridStepPlan } from "./fluidGridGpu";

describe("fluid grid object coupling", () => {
  it("writes a bounded object footprint and impact impulse for a water entry", () => {
    const coupling = gridObjectCouplingFor(couplingInput());

    expect(coupling.summary.coupling).toBe("object-grid-v1");
    expect(coupling.summary.active).toBe(true);
    expect(coupling.summary.footprintCells).toBeGreaterThan(0);
    expect(coupling.summary.footprintCells).toBeLessThanOrEqual(8192);
    expect(coupling.summary.impulseCells).toBeGreaterThan(0);
    expect(coupling.summary.impulseMagnitude).toBeGreaterThan(0);
    expect(coupling.summary.verticalForceDeltaN).toBeGreaterThan(0);
    expect(Number.isFinite(coupling.summary.horizontalForceDeltaN)).toBe(true);
    expect(coupling.summary.bounds.xStart).toBeGreaterThanOrEqual(1);
    expect(coupling.summary.bounds.yStart).toBeGreaterThanOrEqual(1);
    expect(coupling.summary.bounds.xEnd).toBeLessThan(couplingInput().plan.cellsX - 1);
    expect(coupling.summary.bounds.yEnd).toBeLessThan(couplingInput().plan.cellsY - 1);
  });

  it("scales impulse with entry speed and impact strength", () => {
    const softEntry = gridObjectCouplingFor(
      couplingInput({
        impactStrength: 0.12,
        objectVyMps: -0.9,
      })
    );
    const hardEntry = gridObjectCouplingFor(
      couplingInput({
        impactStrength: 0.86,
        objectVyMps: -6.4,
      })
    );

    expect(hardEntry.summary.impulseMagnitude).toBeGreaterThan(softEntry.summary.impulseMagnitude * 2);
    expect(hardEntry.summary.appliedImpulseNs).toBeGreaterThan(softEntry.summary.appliedImpulseNs);
  });

  it("does not write grid cells while the object is still clear of the water", () => {
    const coupling = gridObjectCouplingFor(
      couplingInput({
        impactStrength: 0,
        objectCenterYPx: 180,
        objectVyMps: -2.4,
        submergedFraction: 0,
      })
    );

    expect(coupling.samples).toHaveLength(0);
    expect(coupling.summary.active).toBe(false);
    expect(coupling.summary.footprintCells).toBe(0);
    expect(coupling.summary.impulseMagnitude).toBe(0);
  });
});

function couplingInput(patch: Partial<FluidGridObjectCouplingInput> = {}): FluidGridObjectCouplingInput {
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
    impactStrength: 0.62,
    massKg: 895,
    netForceN: 1_100,
    objectAngleRad: -0.12,
    objectCenterXPx: 590,
    objectCenterYPx: 338,
    objectDepthM: 0.72,
    objectHalfHeightPx: 18,
    objectHalfWidthPx: 18,
    objectHeightM: 0.72,
    objectVxMps: 0.14,
    objectVyMps: -4.1,
    objectWidthM: 0.72,
    plan,
    scalePxPerM: 48,
    shape: "box",
    slamForceN: 1_900,
    submergedFraction: 0.36,
    surfaceYPx: 304,
    timeS: 1.24,
    waterDensityKgM3: 1025,
    waterDepthM: 22,
    waveHeightM: 0.85,
    ...patch,
  };
}
