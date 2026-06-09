import { describe, expect, it } from "vitest";
import {
  createFluidInstalledHighResolutionOperatorReadoutReport,
  type FluidInstalledHighResolutionOperatorReadoutOptions,
  type FluidInstalledHighResolutionOperatorReadoutScenarioInput,
  type OperatorReadoutOutcome,
} from "./fluidInstalledHighResolutionOperatorReadout";
import type { InstalledHighResolutionReferencePacingSample } from "./fluidInstalledHighResolutionReferencePacing";

describe("installed high-resolution operator readout gate", () => {
  it("passes when visible controls and readouts prove float, sink, and waterlogging outcomes", () => {
    const report = createFluidInstalledHighResolutionOperatorReadoutReport(operatorOptions());

    expect(report.gate).toBe("G-FG-45");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.summary.outcomeClasses).toEqual(["floats-indefinitely", "sinks-immediately", "waterlogs-then-sinks"]);
  });

  it("rejects stale source visibility or fallback high-resolution evidence", () => {
    const report = createFluidInstalledHighResolutionOperatorReadoutReport({
      ...operatorOptions(),
      sourceVisibility: {
        ...operatorOptions().sourceVisibility,
        gate: "G-FG-43",
        liveGrid: "768x432",
        viewport: {
          averageLuma: 2,
          colorBuckets: 1,
          status: "blank",
          variety: "flat",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("source visibility gate was G-FG-43");
    expect(report.failures.join(" ")).toContain("source visibility live grid was 768x432");
    expect(report.failures.join(" ")).toContain("source viewport status was blank");
  });

  it("rejects an API-only scenario that never clicked visible controls", () => {
    const report = createFluidInstalledHighResolutionOperatorReadoutReport({
      ...operatorOptions(),
      scenarios: operatorOptions().scenarios.map((scenario, index) =>
        index === 0
          ? {
              ...scenario,
              clickedDrop: false,
              clickedPreset: false,
            }
          : scenario
      ),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("did not click a visible preset control");
    expect(report.failures.join(" ")).toContain("did not click the visible Drop control");
  });

  it("rejects stale operator readouts that disagree with the physics outcome", () => {
    const report = createFluidInstalledHighResolutionOperatorReadoutReport({
      ...operatorOptions(),
      scenarios: operatorOptions().scenarios.map((scenario) =>
        scenario.id === "operator-concrete-sink-readout"
          ? {
              ...scenario,
              readouts: {
                ...scenario.readouts,
                floatResult: "Indefinite if intact",
                predictedSink: "Indefinite",
              },
            }
          : scenario
      ),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("float result did not read as sinking or sank");
    expect(report.failures.join(" ")).toContain("predicted sink readout was Indefinite");
  });

  it("rejects Canvas fallback or missing no-readback telemetry", () => {
    const report = createFluidInstalledHighResolutionOperatorReadoutReport({
      ...operatorOptions(),
      scenarios: operatorOptions().scenarios.map((scenario) =>
        scenario.id === "operator-leaky-drum-waterlogging-readout"
          ? {
              ...scenario,
              samples: smoothSamples("canvas-fallback", "2d", "fallback"),
              telemetry: {
                ...scenario.telemetry,
                particlesNoFullGridReadback: false,
                renderMode: "fallback",
                renderer: "canvas-2d-diagnostic",
                waterContext: "2d",
              },
            }
          : scenario
      ),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("operator samples used renderers");
    expect(report.failures.join(" ")).toContain("did not finish on the primary WebGPU renderer");
    expect(report.failures.join(" ")).toContain("particle path used full-grid readback");
  });
});

function operatorOptions(): FluidInstalledHighResolutionOperatorReadoutOptions {
  return {
    launcher: {
      executablePath: "/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      resolvesToInstalledBundle: true,
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    runtime: {
      capabilityGrid: {
        cellsX: 768,
        cellsY: 432,
      },
      liveGrid: "1024x576",
      renderer: "webgpu-grid-primary-v1",
      runtimeGridOverride: {
        cellsX: 1024,
        cellsY: 576,
      },
      selectedTier: "ultra",
      selection: {
        calibratedTier: "ultra",
        mode: "calibrated-auto",
        preferredTier: "ultra",
        reason: "installed calibration profile",
        requestedTier: "auto",
      },
      tier: "ultra",
      waterContext: "webgpu",
      waterFrames: 240,
    },
    scenarios: [
      operatorScenario("operator-foam-float-readout", "foam-rescue-block", "Closed-cell foam block", "floats-indefinitely"),
      operatorScenario("operator-concrete-sink-readout", "concrete-cube", "Concrete cube", "sinks-immediately"),
      operatorScenario("operator-leaky-drum-waterlogging-readout", "leaky-steel-drum", "Leaky sealed steel drum", "waterlogs-then-sinks"),
    ],
    sourceVisibility: {
      failures: [],
      gate: "G-FG-44",
      liveGrid: "1024x576",
      pass: true,
      sourcePath: "reports/fluid-installed-high-resolution-desktop-visibility-latest.json",
      viewport: {
        averageLuma: 217.22,
        colorBuckets: 25,
        status: "nonblank",
        variety: "varied",
      },
      window: {
        frontmost: true,
        visible: true,
      },
    },
  };
}

function operatorScenario(
  id: string,
  presetId: string,
  presetName: string,
  expectedOutcome: OperatorReadoutOutcome
): FluidInstalledHighResolutionOperatorReadoutScenarioInput {
  const sinkSeconds = expectedOutcome === "waterlogs-then-sinks" ? 11260.5 : expectedOutcome === "sinks-immediately" ? 0 : null;
  const finalPhase = expectedOutcome === "sinks-immediately" ? "sinking" : "floating";
  return {
    clickedDrop: true,
    clickedPreset: true,
    expectedOutcome,
    finalSnapshot: {
      impactSpeedMps: expectedOutcome === "sinks-immediately" ? 4.62 : 4.88,
      liveFloatDurationS: expectedOutcome === "sinks-immediately" ? null : 2.4,
      phase: finalPhase,
      predictionOutcome: expectedOutcome,
      secondsUntilSink: sinkSeconds,
      selectedPresetId: presetId,
      splashHeightM: expectedOutcome === "sinks-immediately" ? 1.02 : 0.68,
      waterFillFraction: expectedOutcome === "waterlogs-then-sinks" ? 0.03 : 0,
    },
    id,
    initialSnapshot: {
      impactSpeedMps: null,
      liveFloatDurationS: null,
      phase: "ready",
      predictionOutcome: expectedOutcome,
      secondsUntilSink: sinkSeconds,
      selectedPresetId: presetId,
      splashHeightM: null,
      waterFillFraction: 0,
    },
    label: presetName,
    presetId,
    presetName,
    readouts: {
      floatResult:
        expectedOutcome === "sinks-immediately"
          ? "Sinking"
          : expectedOutcome === "waterlogs-then-sinks"
            ? "Predicted 3h 7m"
            : "Floating for 2.4s",
      grid: "768 x 432",
      impact: expectedOutcome === "sinks-immediately" ? "4.62 m/s" : "4.88 m/s",
      liveAfloat: expectedOutcome === "sinks-immediately" ? "-" : "2.4s",
      liveState: expectedOutcome === "sinks-immediately" ? "Sinking" : "Floating",
      predictedSink: expectedOutcome === "sinks-immediately" ? "Immediate" : expectedOutcome === "waterlogs-then-sinks" ? "3h 7m" : "Indefinite",
      renderer: "WebGPU grid",
      splash: expectedOutcome === "sinks-immediately" ? "1.02 m" : "0.68 m",
    },
    samples: smoothSamples(),
    telemetry: {
      canvasGrid: "1024x576",
      couplingActiveSeen: true,
      particlesActiveSeen: true,
      particlesNoFullGridReadback: true,
      pressureActiveSeen: true,
      pressureNoFullGridReadback: true,
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      runtimeGridOverride: "1024x576",
      waterContext: "webgpu",
    },
  };
}

function smoothSamples(
  renderer = "webgpu-grid-primary-v1",
  waterContext = "webgpu",
  renderMode = "webgpu"
): InstalledHighResolutionReferencePacingSample[] {
  return Array.from({ length: 96 }, (_, index) => ({
    atMs: index * 8.33,
    canvasGrid: "1024x576",
    capabilityGrid: "768x432",
    capabilitySelectedTier: "ultra",
    couplingActive: index > 8,
    droppedDebtS: 0,
    dtMs: index === 0 ? 0 : 8.33,
    longTaskCount: 0,
    longTaskDurationMs: 0,
    maxSubstepsObserved: 1,
    particlesActive: index > 10,
    particlesNoFullGridReadback: true,
    phase: index < 5 ? "falling" : "floating",
    physicsTimeS: index * 0.00833,
    pressureActive: index > 8,
    pressureNoFullGridReadback: true,
    renderMode,
    renderer,
    runtimeGridOverride: "1024x576",
    tier: "ultra",
    tierSelectionMode: "calibrated-auto",
    tierSelectionPreferredTier: "ultra",
    tierSelectionRequestedTier: "auto",
    totalSubsteps: index,
    waterContext,
    waterFrame: index + 20,
  }));
}
