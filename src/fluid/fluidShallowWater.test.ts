import { describe, expect, it } from "vitest";
import {
  createShallowWaterStepPlan,
  seededShallowWaterFields,
  shallowWaterBufferRoles,
  shallowWaterStepShader,
  summarizeShallowWaterFields,
} from "./fluidShallowWater";

describe("conservative shallow-water grid contract", () => {
  it("allocates ping-pong height and momentum fields plus a dry mask", () => {
    const plan = createShallowWaterStepPlan({ tier: "standard", steps: 64 });

    expect(plan.cellsX).toBe(256);
    expect(plan.cellsY).toBe(144);
    expect(plan.bufferRoles).toEqual([
      "height",
      "heightScratch",
      "momentumX",
      "momentumXScratch",
      "momentumY",
      "momentumYScratch",
      "dryMask",
    ]);
    expect(plan.estimatedStorageBytes).toBe(plan.bytesPerField * shallowWaterBufferRoles.length);
    expect(plan.cfl).toBeGreaterThan(0);
    expect(plan.cfl).toBeLessThanOrEqual(0.58);
  });

  it("seeds wet and dry cells with positive mass and momentum diagnostics", () => {
    const plan = createShallowWaterStepPlan({ tier: "standard" });
    const fields = seededShallowWaterFields(plan);
    const diagnostics = summarizeShallowWaterFields(plan, fields.height, fields.momentumX, fields.momentumY, fields.dryMask, null);

    expect(diagnostics.initialMassM3).toBeGreaterThan(0);
    expect(diagnostics.initialMomentumAbsM3ps).toBeGreaterThan(0);
    expect(diagnostics.initialDryCellCount).toBeGreaterThan(0);
    expect(diagnostics.dryCellsWithWater).toBe(0);
    expect(diagnostics.negativeDepthCells).toBe(0);
    expect(diagnostics.wetCellCount).toBe(plan.cellCount - diagnostics.initialDryCellCount);
  });

  it("reports mass drift and momentum damping against an initial diagnostic snapshot", () => {
    const plan = createShallowWaterStepPlan({ tier: "standard" });
    const fields = seededShallowWaterFields(plan);
    const initial = summarizeShallowWaterFields(plan, fields.height, fields.momentumX, fields.momentumY, fields.dryMask, null);
    const dampedMomentumX = fields.momentumX.map((value) => value * 0.75);
    const dampedMomentumY = fields.momentumY.map((value) => value * 0.75);
    const final = summarizeShallowWaterFields(plan, fields.height, dampedMomentumX, dampedMomentumY, fields.dryMask, initial);

    expect(final.massRelativeDrift).toBeLessThan(1e-8);
    expect(final.momentumDampingRatio).toBeCloseTo(0.75, 4);
    expect(final.finalDryCellCount).toBe(initial.initialDryCellCount);
  });

  it("contains a WebGPU compute shader with conservative height and momentum state", () => {
    expect(shallowWaterStepShader).toContain("@compute");
    expect(shallowWaterStepShader).toContain("hIn");
    expect(shallowWaterStepShader).toContain("hOut");
    expect(shallowWaterStepShader).toContain("mxIn");
    expect(shallowWaterStepShader).toContain("mxOut");
    expect(shallowWaterStepShader).toContain("myIn");
    expect(shallowWaterStepShader).toContain("myOut");
    expect(shallowWaterStepShader).toContain("dryMask");
    expect(shallowWaterStepShader).toContain("dFluxX");
    expect(shallowWaterStepShader).not.toMatch(/canvas|getContext|2d/i);
  });

  it("plans bounded pressure-gradient acceleration with slope and momentum limiters", () => {
    const plan = createShallowWaterStepPlan({ pressureGradient: true, tier: "standard" });
    const fields = seededShallowWaterFields(plan);
    const diagnostics = summarizeShallowWaterFields(plan, fields.height, fields.momentumX, fields.momentumY, fields.dryMask, null);

    expect(plan.solver).toBe("bounded-pressure-gradient-v1");
    expect(plan.pressureGradient).toBe(true);
    expect(plan.pressureGain).toBeGreaterThan(0);
    expect(plan.slopeLimit).toBeGreaterThan(0);
    expect(plan.maxMomentumPerDepthMps).toBeGreaterThan(0);
    expect(diagnostics.pressure.active).toBe(true);
    expect(diagnostics.pressure.pressureWorkEstimateJ).toBeGreaterThan(0);
    expect(diagnostics.pressure.slopeLimitedCells).toBeGreaterThan(0);
    expect(shallowWaterStepShader).toContain("pressureGain");
    expect(shallowWaterStepShader).toContain("slopeLimit");
    expect(shallowWaterStepShader).toContain("maxMomentumPerDepth");
  });
});
