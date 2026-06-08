import { describe, expect, it } from "vitest";
import {
  createFluidDisplayPacingReport,
  summarizeDisplayPacing,
  type DisplayPacingSample,
  type FluidDisplayPacingScenarioInput,
} from "./fluidDisplayPacing";

describe("fluid display pacing gate", () => {
  it("accepts smooth normal-speed display pacing with advancing water frames and physics time", () => {
    const samples = smoothSamples();
    const summary = summarizeDisplayPacing(samples, true);

    expect(summary.pass).toBe(true);
    expect(summary.stability).toBe("smooth");
    expect(summary.displayRefreshEstimateHz).toBeGreaterThan(110);
    expect(summary.waterFrameDelta).toBeGreaterThan(100);
    expect(summary.simulatedTimeRatio).toBeGreaterThan(0.9);
    expect(summary.maxDroppedDebtS).toBe(0);
  });

  it("rejects choppy tail latency even when the average frame rate remains high", () => {
    const samples = smoothSamples().map((sample, index) => ({
      ...sample,
      dtMs: index % 11 === 0 ? 42 : sample.dtMs,
    }));
    const summary = summarizeDisplayPacing(samples, true);

    expect(summary.averageFps).toBeGreaterThan(55);
    expect(summary.pass).toBe(false);
    expect(summary.p95FrameMs).toBeGreaterThan(24);
    expect(summary.droppedFrameCount).toBeGreaterThan(0);
  });

  it("rejects frozen water frames and dropped simulation debt", () => {
    const samples = smoothSamples().map((sample, index) => ({
      ...sample,
      droppedDebtS: index > 60 ? 0.02 : 0,
      waterFrame: Math.floor(index / 4),
    }));
    const summary = summarizeDisplayPacing(samples, true);

    expect(summary.pass).toBe(false);
    expect(summary.duplicateWaterFrameRatio).toBeGreaterThan(0.12);
    expect(summary.maxDroppedDebtS).toBeGreaterThan(0);
  });

  it("uses the observed physics-time span when a scenario resets before sampling ends", () => {
    const samples = smoothSamples().map((sample, index) => ({
      ...sample,
      physicsTimeS: index < 160 ? index / 120 : 0,
    }));
    const summary = summarizeDisplayPacing(samples, true);

    expect(summary.simulatedTimeRatio).toBeGreaterThan(0.6);
    expect(summary.pass).toBe(true);
  });

  it("passes the packaged display report only with WebGPU telemetry and 1x scenarios", () => {
    const scenario = scenarioFor("concrete-impact-display", true, smoothSamples());
    const report = createFluidDisplayPacingReport({
      launchMode: "packaged-app",
      scenarios: [scenario],
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-19");
    expect(report.summary.scenarioCount).toBe(1);

    const badReport = createFluidDisplayPacingReport({
      launchMode: "packaged-app",
      scenarios: [
        {
          ...scenario,
          telemetry: { ...scenario.telemetry, renderMode: "fallback", timeScale: 2 },
        },
      ],
    });
    expect(badReport.pass).toBe(false);
    expect(badReport.failures.join(" ")).toContain("primary WebGPU");
    expect(badReport.failures.join(" ")).toContain("1x");
  });
});

function smoothSamples(): DisplayPacingSample[] {
  return Array.from({ length: 180 }, (_, index) => ({
    atMs: index * 8.333,
    couplingActive: index > 20,
    droppedDebtS: 0,
    dtMs: index === 0 ? 8.333 : 8.333 + (index % 5) * 0.02,
    longTaskCount: 0,
    longTaskDurationMs: 0,
    maxSubstepsObserved: 1,
    phase: index < 20 ? "falling" : "floating",
    particlesActive: index > 20,
    physicsTimeS: index / 120,
    pressureActive: true,
    renderMode: "webgpu",
    renderer: "webgpu-grid-primary-v1",
    tier: "high",
    totalSubsteps: index,
    waterContext: "webgpu",
    waterFrame: index,
  }));
}

function scenarioFor(id: string, expectedActivePhysics: boolean, samples: DisplayPacingSample[]): FluidDisplayPacingScenarioInput {
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
