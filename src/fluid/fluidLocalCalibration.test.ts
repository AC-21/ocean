import { describe, expect, it } from "vitest";
import { createFluidLocalCalibrationReport, summarizeFramePacing, type FramePacingSample } from "./fluidLocalCalibration";
import type { FluidGridBenchmarkReport } from "./fluidGridGpu";
import type { FluidCapabilityReport } from "./webgpuCapability";

describe("local GPU calibration gate", () => {
  it("accepts steady frame pacing with low tail latency and advancing WebGPU frames", () => {
    const summary = summarizeFramePacing(makeSamples(150, 16.2), { ...localThresholds(), minSamples: 120 });
    expect(summary.pass).toBe(true);
    expect(summary.stability).toBe("smooth");
    expect(summary.averageFps).toBeGreaterThan(60);
    expect(summary.droppedFrameRatio).toBe(0);
    expect(summary.duplicateWaterFrameRatio).toBe(0);
  });

  it("rejects choppy frame pacing even when the average FPS looks passable", () => {
    const samples = makeSamples(150, 16.2).map((sample, index) => ({
      ...sample,
      dtMs: index % 12 === 0 ? 42 : sample.dtMs,
      atMs: index === 0 ? 0 : sample.atMs + Math.floor(index / 12) * 25.8,
    }));
    const summary = summarizeFramePacing(samples, { ...localThresholds(), minSamples: 120 });
    expect(summary.pass).toBe(false);
    expect(summary.stability).not.toBe("smooth");
    expect(summary.p95FrameMs).toBeGreaterThan(24);
    expect(summary.droppedFrameCount).toBeGreaterThan(0);
  });

  it("requires timestamp-query evidence when the local adapter exposes it", () => {
    const report = createFluidLocalCalibrationReport({
      capability: capability(["timestamp-query"]),
      generatedAt: "2026-06-08T00:00:00.000Z",
      gridBenchmark: gridBenchmark({ timestampQueryEnabled: false, sampleCount: 0 }),
      scenarios: [scenario("concrete-drop", makeSamples(150, 16.2))],
      thresholds: { ...localThresholds(), minSamples: 120 },
    });
    expect(report.pass).toBe(false);
    expect(report.failures).toContain("Local adapter exposes timestamp-query, but the calibration run did not record GPU timestamp samples.");
  });

  it("passes the local gate when frame pacing, WebGPU renderer telemetry, and GPU timing are all inside budget", () => {
    const report = createFluidLocalCalibrationReport({
      capability: capability(["timestamp-query"]),
      generatedAt: "2026-06-08T00:00:00.000Z",
      gridBenchmark: gridBenchmark({ timestampQueryEnabled: true, sampleCount: 90 }),
      scenarios: [scenario("idle", makeSamples(150, 16.2)), scenario("concrete-drop", makeSamples(180, 16.3))],
      thresholds: { ...localThresholds(), minSamples: 120 },
    });
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.gpuEvidence.timestampQueryUsed).toBe(true);
  });
});

function localThresholds() {
  return {
    maxDroppedFrameRatio: 0.06,
    maxDuplicateWaterFrameRatio: 0.12,
    maxP95FrameMs: 24,
    maxP99FrameMs: 36,
    minAverageFps: 55,
    targetFrameMs: 1000 / 60,
  };
}

function makeSamples(count: number, dtMs: number): FramePacingSample[] {
  const samples: FramePacingSample[] = [];
  let atMs = 0;
  for (let index = 0; index < count; index += 1) {
    atMs += dtMs;
    samples.push({
      atMs,
      dtMs,
      phase: "falling",
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      tier: "high",
      waterContext: "webgpu",
      waterFrame: index + 1,
    });
  }
  return samples;
}

function scenario(id: string, samples: FramePacingSample[]) {
  return {
    id,
    label: id,
    samples,
    telemetry: {
      finalPhase: "floating",
      fluidCapability: "webgpu-ready",
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      tier: "high",
      waterContext: "webgpu",
    },
  };
}

function capability(features: string[]): FluidCapabilityReport {
  return {
    adapterInfo: "apple / metal-3",
    adapterName: "apple / metal-3",
    backend: "webgpu-compute",
    fallbackReason: null,
    features,
    forbiddenProductionRenderers: ["canvas-2d"],
    generatedAt: "2026-06-08T00:00:00.000Z",
    grid: { cellsX: 512, cellsY: 288, estimatedBytes: 4_718_592, tier: "high" },
    limits: {
      maxBufferSize: 268_435_456,
      maxComputeInvocationsPerWorkgroup: 256,
      maxComputeWorkgroupSizeX: 256,
      maxComputeWorkgroupSizeY: 256,
      maxComputeWorkgroupsPerDimension: 65_535,
      maxStorageBufferBindingSize: 134_217_728,
    },
    requiredBrowserApis: ["navigator.gpu"],
    selectedTier: "high",
    status: "webgpu-ready",
  };
}

function gridBenchmark(gpuTiming: Pick<FluidGridBenchmarkReport["gpuTiming"], "sampleCount" | "timestampQueryEnabled">): FluidGridBenchmarkReport {
  return {
    backend: "webgpu-compute",
    capability: null,
    generatedAt: "2026-06-08T00:00:00.000Z",
    gpuTiming: {
      averageStepMs: gpuTiming.timestampQueryEnabled ? 0.08 : null,
      maxStepMs: gpuTiming.timestampQueryEnabled ? 0.14 : null,
      minStepMs: gpuTiming.timestampQueryEnabled ? 0.04 : null,
      p95StepMs: gpuTiming.timestampQueryEnabled ? 0.12 : null,
      sampleCount: gpuTiming.sampleCount,
      timestampQueryEnabled: gpuTiming.timestampQueryEnabled,
    },
    noFullGridReadbackPerFrame: true,
    pass: true,
    plan: {
      bufferRoles: ["height", "heightScratch", "velocity", "foam", "obstacle", "depth", "impulse"],
      bytesPerField: 589_824,
      cellCount: 147_456,
      cellSizeM: 0.05,
      cellsX: 512,
      cellsY: 288,
      cfl: 0.566,
      dispatchX: 64,
      dispatchY: 36,
      dtS: 1 / 120,
      estimatedStorageBytes: 4_128_768,
      steps: 80,
      tier: "high",
      waveSpeedMps: 2.4,
      workgroupSizeX: 8,
      workgroupSizeY: 8,
    },
    readback: {
      maxAbsFoam: 0.08,
      maxAbsHeightM: 0.012,
      maxAbsVelocityMps: 0.03,
      meanAbsHeightM: 0.0004,
      sampledAfterSteps: 80,
    },
    stepTiming: { averageStepMs: 0.09, totalMs: 7.2 },
    threshold: {
      maxAverageStepMs: 4,
      maxCfl: 0.7,
      minNonzeroHeightM: 0.0001,
    },
  };
}
