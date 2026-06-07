import { describe, expect, it } from "vitest";
import {
  fluidGridGates,
  fluidGridMilestones,
  fluidGridTiers,
  gateForMilestone,
  productionFluidCapability,
  tasksForMilestone,
} from "./fluidGridContract";

describe("fluid grid remap contract", () => {
  it("requires WebGPU compute for the production water path", () => {
    expect(productionFluidCapability.backend).toBe("webgpu-compute");
    expect(productionFluidCapability.computeRequired).toBe(true);
    expect(productionFluidCapability.primaryCanvasContext).toBe("webgpu");
    expect(productionFluidCapability.requiredBrowserApis).toContain("navigator.gpu");
    expect(productionFluidCapability.forbiddenProductionRenderers).toContain("canvas-2d");
  });

  it("tracks every remap milestone with a gate and at least one task", () => {
    for (const milestone of fluidGridMilestones) {
      const gate = gateForMilestone(milestone.id);
      expect(gate.blocks).toBe(milestone.id);
      expect(gate.passBar.length).toBeGreaterThan(20);
      expect(tasksForMilestone(milestone.id).length).toBeGreaterThan(0);
    }
  });

  it("keeps the gate ledger one-to-one with milestones", () => {
    const milestoneGateIds = new Set(fluidGridMilestones.map((milestone) => milestone.gate));
    expect(fluidGridGates).toHaveLength(fluidGridMilestones.length);
    for (const gate of fluidGridGates) {
      expect(milestoneGateIds.has(gate.id)).toBe(true);
    }
  });

  it("defines a high-resolution tier beyond the current Canvas 2D design target", () => {
    const standard = fluidGridTiers.find((tier) => tier.id === "standard");
    const high = fluidGridTiers.find((tier) => tier.id === "high");
    expect(standard).toBeDefined();
    expect(high).toBeDefined();
    expect((high?.cellsX ?? 0) * (high?.cellsY ?? 0)).toBeGreaterThan((standard?.cellsX ?? 0) * (standard?.cellsY ?? 0) * 3);
    expect(high?.minimumAverageFps).toBeGreaterThanOrEqual(30);
  });
});
