import { describe, expect, it } from "vitest";
import {
  createFluidInstalledHighResolutionFloatSinkEnvelopeReport,
  type FloatSinkEnvelopeCaseInput,
  type FloatSinkOutcomeKind,
  type FloatSinkPredictionEvidence,
  type FluidInstalledHighResolutionFloatSinkEnvelopeOptions,
} from "./fluidInstalledHighResolutionFloatSinkEnvelope";
import type { InstalledHighResolutionReferencePacingSample } from "./fluidInstalledHighResolutionReferencePacing";

describe("installed high-resolution float/sink envelope gate", () => {
  it("passes when every object preset has a live high-resolution float or sink outcome envelope", () => {
    const report = createFluidInstalledHighResolutionFloatSinkEnvelopeReport(validOptions());

    expect(report.gate).toBe("G-FG-43");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.summary.presetCount).toBe(8);
    expect(report.summary.outcomes).toEqual(["floats-indefinitely", "sinks-immediately", "waterlogs-then-sinks"]);
  });

  it("rejects missing presets and wrong outcome classes", () => {
    const cases = validCases().filter((entry) => entry.presetId !== "pine-log");
    cases[0] = {
      ...cases[0],
      prediction: {
        ...cases[0].prediction,
        outcome: "sinks-immediately",
        secondsUntilSink: 0,
      },
    };
    const report = createFluidInstalledHighResolutionFloatSinkEnvelopeReport({
      ...validOptions(),
      cases,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("missing preset pine-log");
    expect(report.failures.join(" ")).toContain("foam-rescue-block prediction outcome was sinks-immediately");
  });

  it("rejects fallback renderer samples and manual environment overrides", () => {
    const cases = validCases().map((entry) => ({
      ...entry,
      telemetry: {
        ...entry.telemetry,
        canvasGrid: "768x432",
        renderer: "legacy-canvas-diagnostic-v1",
        runtimeGridOverride: null,
        samples: entry.telemetry.samples.map((sample) => ({
          ...sample,
          canvasGrid: "768x432",
          renderer: "legacy-canvas-diagnostic-v1",
          runtimeGridOverride: null,
          tierSelectionMode: "default-high",
          waterContext: "2d",
        })),
        waterContext: "2d",
      },
    }));
    const report = createFluidInstalledHighResolutionFloatSinkEnvelopeReport({
      ...validOptions(),
      cases,
      launchEnv: {
        envCalibratedTierPresent: true,
        envExperimentalGridPresent: true,
        envRequestedTierPresent: true,
        envUserDataOverridePresent: true,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_EXPERIMENTAL_FLUID_GRID must be absent");
    expect(report.failures.join(" ")).toContain("foam-rescue-block canvas grid was 768x432");
    expect(report.failures.join(" ")).toContain("samples did not all observe calibrated-auto");
  });

  it("rejects a black high-resolution viewport even when WebGPU telemetry is alive", () => {
    const report = createFluidInstalledHighResolutionFloatSinkEnvelopeReport({
      ...validOptions(),
      visual: {
        pixelProbe: {
          averageLuma: 2,
          colorBuckets: 1,
          height: 720,
          opaqueSamples: 3200,
          samples: 3200,
          status: "blank",
          variety: "flat",
          width: 1280,
        },
        screenshotPath: "reports/black-high-resolution-ocean.png",
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("screen may appear black");
    expect(report.failures.join(" ")).toContain("expected visible water");
  });

  it("accepts very low-draft foam convergence when normalized buoyancy error is noisy", () => {
    const cases = validCases();
    cases[0] = {
      ...cases[0],
      live: {
        ...cases[0].live,
        equilibrium: {
          buoyancyErrorRatio: 0.18,
          draftErrorM: -0.004,
          withinTolerance: false,
        },
        liveFloatDurationS: 7.8,
        settledAtS: null,
      },
      prediction: {
        ...cases[0].prediction,
        equilibriumSubmergedFraction: 0.056,
      },
    };
    const report = createFluidInstalledHighResolutionFloatSinkEnvelopeReport({
      ...validOptions(),
      cases,
    });

    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
  });

  it("rejects waterlogging cases without finite predictions or accelerated threshold proof", () => {
    const cases = validCases().map((entry) =>
      entry.presetId === "leaky-steel-drum"
        ? {
            ...entry,
            acceleratedWaterlogging: undefined,
            prediction: {
              ...entry.prediction,
              criticalWaterFillFraction: null,
              secondsUntilSink: null,
            },
          }
        : entry
    );
    const report = createFluidInstalledHighResolutionFloatSinkEnvelopeReport({
      ...validOptions(),
      cases,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("leaky-steel-drum waterlogging preset did not predict finite sink time");
    expect(report.failures.join(" ")).toContain("leaky-steel-drum missing accelerated waterlogging proof");
  });
});

function validOptions(): FluidInstalledHighResolutionFloatSinkEnvelopeOptions {
  return {
    cases: validCases(),
    generatedAt: "2026-06-08T00:00:00.000Z",
    installedProfile: {
      pass: true,
      runtimeGrid: {
        capabilityGrid: "768x432",
        cellsX: 1024,
        cellsY: 576,
        liveGrid: "1024x576",
        sourceGate: "G-FG-40",
        sourceGeneratedAt: "2026-06-08T00:00:00.000Z",
      },
      schema: "ocean-fluid-calibration-profile-v1",
      selectedTier: "ultra",
      sourceGate: "G-FG-23",
    },
    launchEnv: {
      envCalibratedTierPresent: false,
      envExperimentalGridPresent: false,
      envRequestedTierPresent: false,
      envUserDataOverridePresent: false,
    },
    launcher: {
      executablePath: "/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      resolvesToInstalledBundle: true,
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    runtime: {
      capabilityGrid: { cellsX: 768, cellsY: 432 },
      liveGrid: "1024x576",
      renderer: "webgpu-grid-primary-v1",
      runtimeGridOverride: { cellsX: 1024, cellsY: 576 },
      selectedTier: "ultra",
      selection: {
        calibratedTier: "ultra",
        mode: "calibrated-auto",
        preferredTier: "ultra",
        reason: "local calibration selected tier",
        requestedTier: "auto",
      },
      tier: "ultra",
      waterContext: "webgpu",
      waterFrames: 24,
    },
    storage: {
      defaultStorage: true,
      fileName: "fluid-calibration.v1.json",
      persistedRawBytes: 2581,
      profileHadRuntimeGrid: true,
      readByMainProcess: true,
      storageBasePath: "/Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game",
      verificationReadMatched: true,
    },
    visual: {
      pixelProbe: {
        averageLuma: 126,
        colorBuckets: 24,
        height: 1412,
        opaqueSamples: 2795,
        samples: 2795,
        status: "nonblank",
        variety: "varied",
        width: 1364,
      },
      screenshotPath: "reports/fluid-installed-high-resolution-float-sink-envelope-latest.png",
    },
  };
}

function validCases(): FloatSinkEnvelopeCaseInput[] {
  return [
    stableFloater("foam-rescue-block", "Closed-cell foam block"),
    stableFloater("pine-log", "Pine log"),
    stableFloater("ice-block", "Fresh-water ice block"),
    waterlogger("leaky-steel-drum", "Leaky sealed steel drum"),
    waterlogger("hardwood-crate", "Hardwood crate"),
    sinker("concrete-cube", "Concrete cube"),
    sinker("steel-sphere", "Solid steel sphere"),
    stableFloater("aluminum-canister", "Sealed aluminum canister"),
  ];
}

function stableFloater(presetId: string, presetName: string): FloatSinkEnvelopeCaseInput {
  return {
    expectedOutcome: "floats-indefinitely",
    live: live("floating", { draftErrorM: 0.02, terminalVelocityMps: null, waterFillFraction: 0 }),
    prediction: prediction("floats-indefinitely", { secondsUntilSink: null }),
    presetId,
    presetName,
    telemetry: telemetry(),
  };
}

function sinker(presetId: string, presetName: string): FloatSinkEnvelopeCaseInput {
  return {
    expectedOutcome: "sinks-immediately",
    live: live("sinking", { terminalVelocityMps: 3.2, waterFillFraction: 0 }),
    prediction: prediction("sinks-immediately", { initialSubmergedDepthM: null, secondsUntilSink: 0 }),
    presetId,
    presetName,
    telemetry: telemetry(),
  };
}

function waterlogger(presetId: string, presetName: string): FloatSinkEnvelopeCaseInput {
  const basePrediction = prediction("waterlogs-then-sinks", {
    criticalWaterFillFraction: 0.42,
    maxWaterFillFraction: 0.7,
    secondsUntilSink: 800,
    waterFillRatePerMinute: 0.02,
  });
  return {
    acceleratedWaterlogging: {
      final: live("sinking", { terminalVelocityMps: 0.9, waterFillFraction: 0.45 }),
      prediction: {
        ...basePrediction,
        secondsUntilSink: 12,
        waterFillRatePerMinute: 12,
      },
      telemetry: telemetry(),
    },
    expectedOutcome: "waterlogs-then-sinks",
    live: live("floating", { draftErrorM: 0.03, terminalVelocityMps: null, waterFillFraction: 0.04 }),
    prediction: basePrediction,
    presetId,
    presetName,
    telemetry: telemetry(),
  };
}

function prediction(outcome: FloatSinkOutcomeKind, overrides: Partial<FloatSinkPredictionEvidence> = {}): FloatSinkPredictionEvidence {
  return {
    ...predictionBase(),
    outcome,
    ...overrides,
  };
}

function predictionBase(): FloatSinkPredictionEvidence {
  return {
    criticalWaterFillFraction: null,
    effectiveDensityKgM3: 700,
    equilibriumSubmergedFraction: 0.68,
    fullWaterloggedDensityKgM3: 900,
    initialSubmergedDepthM: 0.4,
    maxWaterFillFraction: 0.3,
    outcome: "floats-indefinitely",
    secondsUntilSink: null,
    waterFillRatePerMinute: 0,
  };
}

function live(
  phase: string,
  overrides: Partial<FloatSinkEnvelopeCaseInput["live"]> & { draftErrorM?: number; terminalVelocityMps?: number | null; waterFillFraction?: number } = {}
) {
  return {
    diagnostics: {
      effectiveDensityKgM3: 700,
      equilibriumSubmergedFraction: 0.68,
      terminalVelocityMps: overrides.terminalVelocityMps ?? null,
    },
    equilibrium: {
      buoyancyErrorRatio: 0.04,
      draftErrorM: overrides.draftErrorM ?? null,
      withinTolerance: true,
    },
    impactSpeedMps: 5,
    liveFloatDurationS: phase === "sinking" ? 0.5 : 3,
    phase,
    sankAtS: null,
    settledAtS: phase === "floating" ? 2.4 : null,
    waterFillFraction: overrides.waterFillFraction ?? 0,
  };
}

function telemetry() {
  return {
    canvasGrid: "1024x576",
    couplingActiveSeen: true,
    particlesActiveSeen: true,
    pressureActiveSeen: true,
    renderer: "webgpu-grid-primary-v1",
    runtimeGridOverride: "1024x576",
    samples,
    waterContext: "webgpu",
  };
}

const samples: InstalledHighResolutionReferencePacingSample[] = Array.from({ length: 140 }, (_entry, index) => ({
  atMs: index * 8.33,
  canvasGrid: "1024x576",
  capabilityGrid: "768x432",
  capabilitySelectedTier: "ultra",
  couplingActive: index > 8,
  droppedDebtS: 0,
  dtMs: 8.33,
  longTaskCount: 0,
  longTaskDurationMs: 0,
  maxSubstepsObserved: 1,
  particlesActive: index > 8,
  particlesNoFullGridReadback: true,
  phase: "floating",
  physicsTimeS: index * 0.00833,
  pressureActive: true,
  pressureNoFullGridReadback: true,
  renderMode: "webgpu",
  renderer: "webgpu-grid-primary-v1",
  runtimeGridOverride: "1024x576",
  tier: "ultra",
  tierSelectionMode: "calibrated-auto",
  tierSelectionPreferredTier: "ultra",
  tierSelectionRequestedTier: "auto",
  totalSubsteps: index + 1,
  waterContext: "webgpu",
  waterFrame: index + 1,
}));
