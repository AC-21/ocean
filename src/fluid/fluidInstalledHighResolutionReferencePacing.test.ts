import { describe, expect, it } from "vitest";
import {
  createFluidInstalledHighResolutionReferencePacingReport,
  type FluidInstalledHighResolutionReferencePacingOptions,
  type FluidInstalledHighResolutionReferencePacingScenarioInput,
  type InstalledHighResolutionReferencePacingSample,
} from "./fluidInstalledHighResolutionReferencePacing";
import type { FluidExperimentalReferenceOutcomesReport } from "./fluidExperimentalReferenceOutcomes";
import type { FluidHighResolutionCalibrationReport } from "./fluidHighResolutionCalibration";

describe("installed high-resolution reference pacing gate", () => {
  it("passes when the installed Desktop profile drives high-resolution reference outcomes and smooth pacing", () => {
    const report = createFluidInstalledHighResolutionReferencePacingReport(validOptions());

    expect(report.gate).toBe("G-FG-42");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.summary.categories).toEqual(["damping", "drop", "float", "sink", "splash"]);
    expect(report.summary.referenceCaseCount).toBe(5);
    expect(report.summary.scenarioCount).toBe(5);
  });

  it("rejects stale or incomplete source calibration", () => {
    const sourceCalibration = highResolutionCalibration();
    sourceCalibration.pass = false;
    sourceCalibration.failures = ["runtime grid was missing"];
    sourceCalibration.summary.liveGrid = "768x432";
    sourceCalibration.sourceEvidence.caseCount = 2;
    const report = createFluidInstalledHighResolutionReferencePacingReport({
      ...validOptions(),
      sourceCalibration,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("source calibration runtime grid was missing");
    expect(report.failures.join(" ")).toContain("source calibration live grid was 768x432");
    expect(report.failures.join(" ")).toContain("source calibration case count was 2");
  });

  it("rejects environment overrides and non-default profile storage", () => {
    const report = createFluidInstalledHighResolutionReferencePacingReport({
      ...validOptions(),
      launchEnv: {
        envCalibratedTierPresent: true,
        envExperimentalGridPresent: true,
        envRequestedTierPresent: true,
        envUserDataOverridePresent: true,
      },
      storage: {
        ...validOptions().storage,
        defaultStorage: false,
        profileHadRuntimeGrid: false,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_EXPERIMENTAL_FLUID_GRID must be absent");
    expect(report.failures.join(" ")).toContain("HARBORLINE_USER_DATA_DIR must be absent");
    expect(report.failures.join(" ")).toContain("storage path was not the default Desktop profile");
    expect(report.failures.join(" ")).toContain("stored profile did not include runtimeGrid");
  });

  it("rejects fallback live grids and choppy renderer samples", () => {
    const scenarios = smoothScenarios().map((scenario) => ({
      ...scenario,
      samples: scenario.samples.map((sample, index) => ({
        ...sample,
        canvasGrid: "768x432",
        capabilityGrid: "512x288",
        dtMs: index % 5 === 0 ? 55 : 8.33,
        renderer: "legacy-canvas-diagnostic-v1",
        runtimeGridOverride: null,
        tierSelectionMode: "default-high",
        waterContext: "2d",
      })),
      telemetry: {
        ...scenario.telemetry,
        canvasGrid: "768x432",
        renderMode: "fallback",
        renderer: "legacy-canvas-diagnostic-v1",
        runtimeGridOverride: null,
        waterContext: "2d",
      },
    }));
    const report = createFluidInstalledHighResolutionReferencePacingReport({
      ...validOptions(),
      runtime: {
        ...validOptions().runtime,
        liveGrid: "768x432",
        runtimeGridOverride: null,
      },
      scenarios,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("runtime grid override global did not report 1024 x 576");
    expect(report.failures.join(" ")).toContain("runtime live grid was 768x432");
    expect(report.failures.join(" ")).toContain("display pacing");
    expect(report.failures.join(" ")).toContain("samples did not all render 1024x576 canvas grid");
    expect(report.failures.join(" ")).toContain("samples did not all use WebGPU canvas context");
  });

  it("rejects missing active particles, pressure, coupling, and no-readback telemetry", () => {
    const scenarios = smoothScenarios().map((scenario) =>
      scenario.id === "high-resolution-concrete-drop-splash-pacing"
        ? {
            ...scenario,
            samples: scenario.samples.map((sample) => ({
              ...sample,
              particlesNoFullGridReadback: false,
              pressureNoFullGridReadback: false,
            })),
            telemetry: {
              ...scenario.telemetry,
              couplingActiveSeen: false,
              particlesActiveSeen: false,
              pressureActiveSeen: false,
            },
          }
        : scenario
    );
    const report = createFluidInstalledHighResolutionReferencePacingReport({
      ...validOptions(),
      scenarios,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("high-resolution-concrete-drop-splash-pacing never observed active pressure telemetry");
    expect(report.failures.join(" ")).toContain("high-resolution-concrete-drop-splash-pacing never observed active particle telemetry");
    expect(report.failures.join(" ")).toContain("high-resolution-concrete-drop-splash-pacing never observed active object-grid coupling");
    expect(report.failures.join(" ")).toContain("high-resolution-concrete-drop-splash-pacing observed a full-grid readback flag");
  });
});

function validOptions(): FluidInstalledHighResolutionReferencePacingOptions {
  return {
    coreReference: experimentalReference(),
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
    scenarios: smoothScenarios(),
    sourceCalibration: highResolutionCalibration(),
    storage: {
      defaultStorage: true,
      fileName: "fluid-calibration.v1.json",
      persistedRawBytes: 2581,
      profileHadRuntimeGrid: true,
      readByMainProcess: true,
      storageBasePath: "/Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game",
      verificationReadMatched: true,
    },
  };
}

function highResolutionCalibration(): FluidHighResolutionCalibrationReport {
  return {
    failures: [],
    gate: "G-FG-41",
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchEnv: {
      envCalibratedTierPresent: false,
      envExperimentalGridPresent: false,
      envRequestedTierPresent: false,
      envUserDataOverridePresent: true,
    },
    launchMode: "packaged-app",
    pass: true,
    profile: validOptionsProfile(),
    runtimeProbe: {
      capabilityGrid: { cellsX: 768, cellsY: 432 },
      grid: "1024x576",
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
      waterFrames: 12,
    },
    sourceEvidence: {
      caseCount: 5,
      comparisonCount: 10,
      gate: "G-FG-40",
      liveGrid: "1024x576",
      pass: true,
    },
    storage: {
      fileName: "fluid-calibration.v1.json",
      persistedRawBytes: 2581,
      readByMainProcess: true,
      storageBasePath: "/tmp/ocean-lab-high-resolution-calibration/harborline-game",
      verificationReadMatched: true,
    },
    summary: {
      capabilityGrid: "768x432",
      liveGrid: "1024x576",
      selectedTier: "ultra",
    },
  };
}

function validOptionsProfile() {
  return {
    pass: true,
    runtimeGrid: {
      capabilityGrid: "768x432" as const,
      cellsX: 1024 as const,
      cellsY: 576 as const,
      liveGrid: "1024x576" as const,
      sourceGate: "G-FG-40" as const,
      sourceGeneratedAt: "2026-06-08T00:00:00.000Z",
    },
    schema: "ocean-fluid-calibration-profile-v1" as const,
    selectedTier: "ultra" as const,
    sourceGate: "G-FG-23" as const,
  };
}

function experimentalReference(): FluidExperimentalReferenceOutcomesReport {
  return {
    capability: {
      grid: { cellsX: 768, cellsY: 432 },
      selectedTier: "ultra",
    },
    cases: [
      caseEntry("live-concrete-drop-splash-pressure", "drop+splash"),
      caseEntry("live-ice-static-draft", "float"),
      caseEntry("live-foam-damped-settling", "damping"),
      caseEntry("live-concrete-sink-terminal-band", "sink"),
      caseEntry("live-leaky-drum-sink-time-prediction", "sink"),
    ],
    comparisons: [
      comparison("live-drop-speed-reference", "drop"),
      comparison("live-splash-height-reference", "splash"),
      comparison("live-ice-equilibrium-submerged-fraction-reference", "float"),
      comparison("live-ice-hydrostatic-draft-error", "float"),
      comparison("live-foam-settled-draft-error", "damping"),
      comparison("live-foam-settled-buoyancy-error", "damping"),
      comparison("live-foam-equilibrium-window", "damping"),
      comparison("live-concrete-terminal-speed-reference", "sink"),
      comparison("live-concrete-sink-phase", "sink"),
      comparison("live-leaky-drum-sink-time-ratio-reference", "sink"),
    ],
    consumedCoupling: coupling(),
    failures: [],
    finalStats: {
      context: "webgpu",
      frameCount: 120,
      gridCellsX: 1024,
      gridCellsY: 576,
      lastCoupling: null,
      lastParticleSplash: null,
      lastPressure: pressureSummary(),
      lastSplash: null,
      renderer: "webgpu-grid-primary-v1",
      tier: "ultra",
    },
    frameLoop: null,
    gate: "G-FG-40",
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchMode: "packaged-app",
    noFullGridReadbackPerFrame: true,
    pass: true,
    preferredTier: "ultra",
    runtimeGrid: { cellsX: 1024, cellsY: 576 },
    runtimeGridOverride: { cellsX: 1024, cellsY: 576 },
    selectedTier: "ultra",
    summary: {
      capabilityGrid: "768x432",
      caseCount: 5,
      categories: ["damping", "drop", "float", "sink", "splash"],
      comparisonCount: 10,
      liveGrid: "1024x576",
      pressureForceBoundN: 1000,
    },
    telemetry: telemetry(),
  };
}

function smoothScenarios(): FluidInstalledHighResolutionReferencePacingScenarioInput[] {
  return [
    scenario("high-resolution-concrete-drop-splash-pacing", "live-concrete-drop-splash-pressure", ["drop", "splash"], true),
    scenario("high-resolution-ice-float-pacing", "live-ice-static-draft", ["float"], false),
    scenario("high-resolution-foam-damping-pacing", "live-foam-damped-settling", ["damping"], true),
    scenario("high-resolution-concrete-sink-pacing", "live-concrete-sink-terminal-band", ["sink"], true),
    scenario("high-resolution-leaky-drum-sink-pacing", "live-leaky-drum-sink-time-prediction", ["sink"], true),
  ];
}

function scenario(
  id: string,
  referenceCaseId: string,
  categories: FluidInstalledHighResolutionReferencePacingScenarioInput["categories"],
  expectedParticles: boolean
): FluidInstalledHighResolutionReferencePacingScenarioInput {
  return {
    categories,
    expectedActivePhysics: true,
    expectedCoupling: true,
    expectedParticles,
    expectedPressure: true,
    id,
    label: id,
    referenceCaseId,
    samples: samples(),
    telemetry: {
      canvasGrid: "1024x576",
      couplingActiveSeen: true,
      finalPhase: "floating",
      longTaskSupported: true,
      particlesActiveSeen: true,
      pressureActiveSeen: true,
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      runtimeGridOverride: "1024x576",
      timeScale: 1,
      waterContext: "webgpu",
    },
  };
}

function samples(): InstalledHighResolutionReferencePacingSample[] {
  return Array.from({ length: 180 }, (_entry, index) => ({
    atMs: index * 8.33,
    canvasGrid: "1024x576",
    capabilityGrid: "768x432",
    capabilitySelectedTier: "ultra",
    couplingActive: index > 12,
    droppedDebtS: 0,
    dtMs: 8.33,
    longTaskCount: 0,
    longTaskDurationMs: 0,
    maxSubstepsObserved: 1,
    particlesActive: index > 8,
    particlesNoFullGridReadback: true,
    phase: "falling",
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
}

function caseEntry(id: string, category: "damping" | "drop+splash" | "float" | "sink") {
  return {
    category,
    consumedCoupling: coupling(),
    frameLoop: {
      caseId: id,
      droppedDebtS: 0,
      fixedStepS: 1 / 120,
      maxSubstepsObserved: 1,
      maxSubstepsPerFrame: 8,
      totalSubsteps: 120,
    },
    id,
    pass: true,
    snapshot: {
      diagnostics: {},
      equilibrium: {},
      impact: null,
      phase: "floating",
      settings: { gravity: 9.81 },
      spec: { id },
      timeS: 1,
      version: "ocean-physics-live-v1",
    },
    stats: {
      context: "webgpu",
      frameCount: 120,
      gridCellsX: 1024,
      gridCellsY: 576,
      lastCoupling: null,
      lastParticleSplash: null,
      lastPressure: pressureSummary(),
      lastSplash: null,
      renderer: "webgpu-grid-primary-v1",
      tier: "ultra",
    },
    telemetry: telemetry(),
  } as unknown as FluidExperimentalReferenceOutcomesReport["cases"][number];
}

function comparison(id: string, category: "damping" | "drop" | "float" | "sink" | "splash") {
  return {
    actual: 1,
    category,
    expected: { max: 2, min: 0 },
    id,
    pass: true,
    unit: "unit",
  };
}

function telemetry() {
  return {
    forceBoundN: 1000,
    frames: 120,
    grid: "1024x576",
    noFullGridReadbackPerFrame: true,
    particles: "localized-splash-v1",
    particlesActive: true,
    particlesNoFullGridReadbackPerFrame: true,
    pressure: "bounded-pressure-gradient-live-v1",
    pressureActive: true,
    renderer: "webgpu-grid-primary-v1",
    status: "running",
    tier: "ultra",
    verticalPressureForceN: 120,
    waterContext: "webgpu",
  };
}

function coupling() {
  return {
    active: true,
    gridVelocityMps: 1,
    horizontalForceDeltaN: 0,
    sampleTimeS: 1,
    verticalForceDeltaN: 120,
  };
}

function pressureSummary() {
  return {
    active: true,
    bufferRoles: [],
    cfl: 0.2,
    coupling: "bounded-pressure-gradient-live-v1" as const,
    estimatedStorageBytes: 1,
    forceBoundN: 1000,
    gridVelocityMps: 1,
    horizontalForceDeltaN: 0,
    impulseEnergyEstimateJ: 1,
    maxMomentumPerDepthMps: 1,
    noFullGridReadbackPerFrame: true,
    pressureGain: 1,
    pressureWorkEstimateJ: 1,
    sampleTimeS: 1,
    slopeLimit: 1,
    verticalForceDeltaN: 120,
  };
}
