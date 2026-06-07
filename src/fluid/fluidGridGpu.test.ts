import { describe, expect, it } from "vitest";
import { createFluidGridStepPlan, fluidGridBufferRoles, fluidGridStepShader } from "./fluidGridGpu";

describe("GPU fluid grid step contract", () => {
  it("allocates the physical fields plus a height scratch buffer for ping-pong stepping", () => {
    const plan = createFluidGridStepPlan({ tier: "standard", steps: 90 });
    expect(plan.cellsX).toBe(256);
    expect(plan.cellsY).toBe(144);
    expect(plan.cellCount).toBe(256 * 144);
    expect(plan.bufferRoles).toEqual(["height", "heightScratch", "velocity", "foam", "obstacle", "depth", "impulse"]);
    expect(plan.estimatedStorageBytes).toBe(plan.bytesPerField * fluidGridBufferRoles.length);
    expect(plan.steps).toBe(90);
  });

  it("keeps the standard and high tiers inside a stable 2D wave CFL target", () => {
    const standard = createFluidGridStepPlan({ tier: "standard" });
    const high = createFluidGridStepPlan({ tier: "high" });
    expect(standard.cfl).toBeGreaterThan(0);
    expect(standard.cfl).toBeLessThanOrEqual(0.7);
    expect(high.cfl).toBeCloseTo(standard.cfl, 8);
    expect(high.dispatchX * high.dispatchY).toBeGreaterThan(standard.dispatchX * standard.dispatchY);
  });

  it("contains a real WebGPU compute shader with grid buffers and no Canvas dependency", () => {
    expect(fluidGridStepShader).toContain("@compute");
    expect(fluidGridStepShader).toContain("heightIn");
    expect(fluidGridStepShader).toContain("velocity");
    expect(fluidGridStepShader).toContain("foam");
    expect(fluidGridStepShader).toContain("obstacle");
    expect(fluidGridStepShader).toContain("depth");
    expect(fluidGridStepShader).toContain("impulse");
    expect(fluidGridStepShader).not.toMatch(/canvas|getContext|2d/i);
  });
});
