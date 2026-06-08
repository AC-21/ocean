import { describe, expect, it } from "vitest";
import { createFluidExperimentalLiveGridReport, type FluidExperimentalLiveGridScenarioInput } from "./fluidExperimentalLiveGrid";

const thresholds = {
  maxDroppedDebtS: 1e-9,
  maxDroppedFrameRatio: 0.1,
  maxDuplicateWaterFrameRatio: 0.1,
  maxLongTaskDurationMs: 20,
  maxP95FrameMs: 24,
  maxP99FrameMs: 30,
  maxSimTimeRatio: 1.25,
  minActiveSimTimeRatio: 0.7,
  minAverageFps: 55,
  minSamples: 6,
  minWaterFrameDelta: 6,
  targetFrameMs: 1000 / 60,
};

describe("experimental high-resolution live-grid gate", () => {
  it("passes only when a packaged ultra renderer uses the explicit 1024x576 live grid", () => {
    const report = createFluidExperimentalLiveGridReport({
      capabilityGrid: { cellsX: 768, cellsY: 432 },
      generatedAt: "2026-06-08T00:00:00.000Z",
      launchMode: "packaged-app",
      preferredTier: "ultra",
      runtimeGrid: { cellsX: 1024, cellsY: 576 },
      runtimeGridOverride: { cellsX: 1024, cellsY: 576 },
      scenarios: [scenario("idle", false), scenario("impact", true)],
      selectedTier: "ultra",
      thresholds,
    });

    expect(report.gate).toBe("G-FG-39");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.capabilityGrid).toEqual({ cellsX: 768, cellsY: 432 });
    expect(report.runtimeGrid).toEqual({ cellsX: 1024, cellsY: 576 });
    expect(report.displayPacing.pass).toBe(true);
  });

  it("fails if the runtime grid override is missing or the live canvas stayed at ultra dimensions", () => {
    const report = createFluidExperimentalLiveGridReport({
      capabilityGrid: { cellsX: 768, cellsY: 432 },
      launchMode: "packaged-app",
      preferredTier: "ultra",
      runtimeGrid: { cellsX: 768, cellsY: 432 },
      runtimeGridOverride: null,
      scenarios: [scenario("idle", false, { observedRuntimeGrid: "768x432", runtimeGridOverride: "none" })],
      selectedTier: "ultra",
      thresholds,
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("experimental runtime grid override was missing");
    expect(report.failures).toContain("live renderer grid must be 1024 x 576, got 768 x 432");
    expect(report.failures).toContain("idle observed runtime grid 768x432");
  });

  it("fails Canvas fallback, particle inactivity, and full-grid readback evidence", () => {
    const report = createFluidExperimentalLiveGridReport({
      capabilityGrid: { cellsX: 768, cellsY: 432 },
      launchMode: "packaged-app",
      preferredTier: "ultra",
      runtimeGrid: { cellsX: 1024, cellsY: 576 },
      runtimeGridOverride: { cellsX: 1024, cellsY: 576 },
      scenarios: [
        scenario("impact", true, {
          particlesActiveSeen: false,
          particlesNoFullGridReadback: false,
          pressureNoFullGridReadback: false,
          renderMode: "fallback",
          renderer: "legacy-canvas-diagnostic-v1",
          waterContext: "2d",
        }),
      ],
      selectedTier: "ultra",
      thresholds,
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("impact never observed active particle splash telemetry");
    expect(report.failures).toContain("impact pressure path used a full-grid readback");
    expect(report.failures).toContain("impact particle path used a full-grid readback");
    expect(report.failures.some((failure) => failure.includes("primary WebGPU renderer"))).toBe(true);
  });
});

function scenario(
  id: string,
  expectedActivePhysics: boolean,
  patch: Partial<FluidExperimentalLiveGridScenarioInput["telemetry"] & {
    observedRuntimeGrid: string | null;
    particlesNoFullGridReadback: boolean;
    pressureNoFullGridReadback: boolean;
    runtimeGridOverride: string | null;
  }> = {}
): FluidExperimentalLiveGridScenarioInput {
  const samples = Array.from({ length: 10 }, (_entry, index) => ({
    atMs: index * 16.4,
    couplingActive: expectedActivePhysics,
    droppedDebtS: 0,
    dtMs: index === 0 ? 0 : 16.4,
    longTaskCount: 0,
    longTaskDurationMs: 0,
    maxSubstepsObserved: expectedActivePhysics ? 2 : 0,
    particlesActive: expectedActivePhysics,
    phase: expectedActivePhysics ? "falling" : "ready",
    physicsTimeS: expectedActivePhysics ? index * 0.0164 : 0,
    pressureActive: true,
    renderMode: "webgpu",
    renderer: "webgpu-grid-primary-v1",
    tier: "ultra",
    totalSubsteps: expectedActivePhysics ? index * 2 : 0,
    waterContext: "webgpu",
    waterFrame: index,
  }));
  return {
    expectedActivePhysics,
    id,
    label: id,
    observedRuntimeGrid: patch.observedRuntimeGrid ?? "1024x576",
    particlesNoFullGridReadback: patch.particlesNoFullGridReadback ?? true,
    pressureNoFullGridReadback: patch.pressureNoFullGridReadback ?? true,
    runtimeGridOverride: patch.runtimeGridOverride ?? "1024x576",
    samples,
    telemetry: {
      couplingActiveSeen: patch.couplingActiveSeen ?? expectedActivePhysics,
      finalPhase: patch.finalPhase ?? (expectedActivePhysics ? "settled" : "ready"),
      longTaskSupported: patch.longTaskSupported ?? true,
      particlesActiveSeen: patch.particlesActiveSeen ?? expectedActivePhysics,
      pressureActiveSeen: patch.pressureActiveSeen ?? true,
      renderMode: patch.renderMode ?? "webgpu",
      renderer: patch.renderer ?? "webgpu-grid-primary-v1",
      timeScale: patch.timeScale ?? 1,
      waterContext: patch.waterContext ?? "webgpu",
    },
  };
}
