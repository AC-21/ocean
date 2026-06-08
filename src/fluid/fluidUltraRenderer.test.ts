import { describe, expect, it } from "vitest";
import { createFluidUltraRendererReport, type FluidUltraRendererOptions } from "./fluidUltraRenderer";
import type { DisplayPacingSample, FluidDisplayPacingScenarioInput } from "./fluidDisplayPacing";

describe("fluid ultra renderer gate", () => {
  it("passes when packaged display pacing runs entirely on the ultra renderer tier", () => {
    const report = createFluidUltraRendererReport(baseOptions());

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-21");
    expect(report.selectedTier).toBe("ultra");
    expect(report.selectedGrid).toEqual({ cellsX: 768, cellsY: 432 });
    expect(report.summary.scenarioCount).toBe(2);
  });

  it("rejects a downgraded selected tier even if display pacing is smooth", () => {
    const report = createFluidUltraRendererReport({
      ...baseOptions(),
      selectedGrid: { cellsX: 512, cellsY: 288 },
      selectedTier: "high",
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("selected tier must be ultra");
    expect(report.failures.join(" ")).toContain("768 x 432");
  });

  it("rejects display samples that were not collected from ultra renderer telemetry", () => {
    const options = baseOptions();
    const report = createFluidUltraRendererReport({
      ...options,
      scenarios: [
        options.scenarios[0],
        {
          ...options.scenarios[1],
          samples: options.scenarios[1].samples.map((sample, index) => ({ ...sample, tier: index % 2 === 0 ? "ultra" : "high" })),
        },
      ],
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("display samples");
  });
});

function baseOptions(): FluidUltraRendererOptions {
  return {
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
    preferredTier: "ultra",
    scenarios: [scenarioFor("idle-ultra-display-pacing", false), scenarioFor("concrete-ultra-impact-display-pacing", true)],
    selectedGrid: { cellsX: 768, cellsY: 432 },
    selectedTier: "ultra",
  };
}

function scenarioFor(id: string, expectedActivePhysics: boolean): FluidDisplayPacingScenarioInput {
  const samples = smoothSamples(expectedActivePhysics);
  return {
    expectedActivePhysics,
    id,
    label: id,
    samples,
    telemetry: {
      couplingActiveSeen: expectedActivePhysics,
      finalPhase: samples[samples.length - 1].phase,
      longTaskSupported: true,
      particlesActiveSeen: expectedActivePhysics,
      pressureActiveSeen: true,
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      timeScale: 1,
      waterContext: "webgpu",
    },
  };
}

function smoothSamples(active: boolean): DisplayPacingSample[] {
  return Array.from({ length: 180 }, (_, index) => ({
    atMs: index * 8.333,
    couplingActive: active && index > 20,
    droppedDebtS: 0,
    dtMs: index === 0 ? 8.333 : 8.333 + (index % 4) * 0.02,
    longTaskCount: 0,
    longTaskDurationMs: 0,
    maxSubstepsObserved: active ? 1 : 0,
    particlesActive: active && index > 24,
    phase: active ? (index < 20 ? "falling" : "floating") : "ready",
    physicsTimeS: active ? index / 120 : 0,
    pressureActive: true,
    renderMode: "webgpu",
    renderer: "webgpu-grid-primary-v1",
    tier: "ultra",
    totalSubsteps: active ? index : 0,
    waterContext: "webgpu",
    waterFrame: index,
  }));
}
