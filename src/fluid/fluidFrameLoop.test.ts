import { describe, expect, it } from "vitest";
import { createFluidFrameLoopState, defaultFluidFrameLoopConfig, frameLoopStats, planFluidFrameStep } from "./fluidFrameLoop";

describe("fluid frame loop planner", () => {
  it("uses fixed 120 Hz physics steps instead of variable render-sized steps", () => {
    const state = createFluidFrameLoopState(0);
    const first = planFluidFrameStep(state, 8.333, { active: true, timeScale: 1 });
    const second = planFluidFrameStep(state, 16.666, { active: true, timeScale: 1 });

    expect(first.stepDtS).toBe(defaultFluidFrameLoopConfig.fixedStepS);
    expect(second.stepDtS).toBe(defaultFluidFrameLoopConfig.fixedStepS);
    expect(first.substeps + second.substeps).toBe(1);
    expect(state.totalSubsteps).toBe(1);
  });

  it("reports interpolation alpha from leftover accumulated simulation time", () => {
    const state = createFluidFrameLoopState(0);
    const plan = planFluidFrameStep(state, 12.5, { active: true, timeScale: 1 });
    expect(plan.substeps).toBe(1);
    expect(plan.accumulatedSimS).toBeCloseTo(0.0125 - defaultFluidFrameLoopConfig.fixedStepS, 5);
    expect(plan.interpolationAlpha).toBeGreaterThan(0);
    expect(plan.interpolationAlpha).toBeLessThan(1);
  });

  it("bounds catch-up work under extreme time scale so one frame cannot spiral", () => {
    const state = createFluidFrameLoopState(0);
    const plan = planFluidFrameStep(state, 100, { active: true, timeScale: 120 });
    const stats = frameLoopStats(state, plan);

    expect(plan.substeps).toBe(defaultFluidFrameLoopConfig.maxSubstepsPerFrame);
    expect(plan.accumulatedSimS).toBeGreaterThan(0);
    expect(plan.droppedDebtS).toBeGreaterThan(0);
    expect(stats.maxSubstepsObserved).toBe(defaultFluidFrameLoopConfig.maxSubstepsPerFrame);
  });

  it("clears simulation debt while paused or inactive", () => {
    const state = createFluidFrameLoopState(0);
    planFluidFrameStep(state, 100, { active: true, timeScale: 10 });
    expect(state.accumulatedSimS).toBeGreaterThan(0);

    const inactive = planFluidFrameStep(state, 116.667, { active: false, timeScale: 10 });
    expect(inactive.substeps).toBe(0);
    expect(state.accumulatedSimS).toBe(0);
  });
});
