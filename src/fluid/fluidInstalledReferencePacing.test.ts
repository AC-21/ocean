import { describe, expect, it } from "vitest";
import {
  createFluidInstalledReferencePacingReport,
  type FluidInstalledReferencePacingOptions,
  type FluidInstalledReferencePacingScenarioInput,
  type InstalledReferencePacingSample,
} from "./fluidInstalledReferencePacing";
import type { FluidInstalledReferenceOutcomesReport } from "./fluidInstalledReferenceOutcomes";

describe("installed reference pacing gate", () => {
  it("passes when installed reference cases are correct and smooth on calibrated-auto ultra", () => {
    const report = createFluidInstalledReferencePacingReport(validOptions());

    expect(report.gate).toBe("G-FG-37");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.summary.categories).toEqual(["damping", "drop", "float", "sink", "splash"]);
    expect(report.summary.scenarioCount).toBe(5);
  });

  it("rejects reference pacing without passing FG-36 reference outcome evidence", () => {
    const referenceEvidence = installedReferenceEvidence();
    referenceEvidence.pass = false;
    referenceEvidence.failures = ["reference comparison failed"];
    referenceEvidence.summary.categories = ["drop", "splash"];
    referenceEvidence.summary.caseCount = 2;
    const report = createFluidInstalledReferencePacingReport({
      ...validOptions(),
      referenceEvidence,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("reference evidence reference comparison failed");
    expect(report.failures.join(" ")).toContain("reference evidence missing damping category");
    expect(report.failures.join(" ")).toContain("reference evidence case count was 2");
  });

  it("rejects environment overrides and fallback runtime tier", () => {
    const report = createFluidInstalledReferencePacingReport({
      ...validOptions(),
      launchEnv: {
        envCalibratedTierPresent: true,
        envRequestedTierPresent: true,
        envUserDataOverridePresent: true,
      },
      runtime: {
        selectedGrid: { cellsX: 512, cellsY: 288 },
        selectedTier: "high",
        selection: {
          mode: "default-high",
          preferredTier: "high",
          reason: "auto requested without valid calibration",
          requestedTier: "auto",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent");
    expect(report.failures.join(" ")).toContain("HARBORLINE_USER_DATA_DIR must be absent");
    expect(report.failures.join(" ")).toContain("runtime selection mode was default-high");
    expect(report.failures.join(" ")).toContain("runtime selected tier was high");
  });

  it("rejects choppy or fallback renderer pacing samples", () => {
    const scenarios = smoothScenarios().map((scenario) => ({
      ...scenario,
      samples: scenario.samples.map((sample, index) => ({
        ...sample,
        capabilityGrid: "512x288",
        capabilitySelectedTier: "high",
        dtMs: index % 5 === 0 ? 55 : 8.33,
        renderer: "legacy-canvas-diagnostic-v1",
        tier: "high",
        tierSelectionMode: "default-high",
        tierSelectionPreferredTier: "high",
        waterContext: "2d",
      })),
      telemetry: {
        ...scenario.telemetry,
        renderMode: "fallback",
        renderer: "legacy-canvas-diagnostic-v1",
        waterContext: "2d",
      },
    }));
    const report = createFluidInstalledReferencePacingReport({
      ...validOptions(),
      scenarios,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("display pacing");
    expect(report.failures.join(" ")).toContain("did not finish on the primary WebGPU renderer");
    expect(report.failures.join(" ")).toContain("samples did not all observe calibrated-auto");
    expect(report.failures.join(" ")).toContain("samples did not all use WebGPU canvas context");
  });

  it("rejects missing expected particles, coupling, or no-readback telemetry", () => {
    const scenarios = smoothScenarios().map((scenario) =>
      scenario.id === "reference-concrete-drop-splash-pacing"
        ? {
            ...scenario,
            samples: scenario.samples.map((sample) => ({
              ...sample,
              couplingActive: false,
              particlesNoFullGridReadback: false,
            })),
            telemetry: {
              ...scenario.telemetry,
              couplingActiveSeen: false,
              particlesActiveSeen: false,
            },
          }
        : scenario
    );
    const report = createFluidInstalledReferencePacingReport({
      ...validOptions(),
      scenarios,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("reference-concrete-drop-splash-pacing never observed active particle telemetry");
    expect(report.failures.join(" ")).toContain("reference-concrete-drop-splash-pacing never observed active object-grid coupling");
    expect(report.failures.join(" ")).toContain("reference-concrete-drop-splash-pacing observed a full-grid readback flag");
  });
});

function validOptions(): FluidInstalledReferencePacingOptions {
  return {
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchEnv: {
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      envUserDataOverridePresent: false,
    },
    launcher: {
      executablePath: "/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      resolvesToInstalledBundle: true,
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    referenceEvidence: installedReferenceEvidence(),
    referenceEvidencePath: "reports/fluid-installed-reference-outcomes-latest.json",
    runtime: {
      selectedGrid: { cellsX: 768, cellsY: 432 },
      selectedTier: "ultra",
      selection: {
        calibratedTier: "ultra",
        mode: "calibrated-auto",
        preferredTier: "ultra",
        reason: "local calibration selected tier",
        requestedTier: "auto",
      },
    },
    scenarios: smoothScenarios(),
  };
}

function smoothScenarios(): FluidInstalledReferencePacingScenarioInput[] {
  return [
    scenario("reference-concrete-drop-splash-pacing", "live-concrete-drop-splash-pressure", ["drop", "splash"], true),
    scenario("reference-ice-float-pacing", "live-ice-static-draft", ["float"], false),
    scenario("reference-foam-damping-pacing", "live-foam-damped-settling", ["damping"], true),
    scenario("reference-concrete-sink-pacing", "live-concrete-sink-terminal-band", ["sink"], true),
    scenario("reference-leaky-drum-sink-pacing", "live-leaky-drum-sink-time-prediction", ["sink"], true),
  ];
}

function scenario(
  id: string,
  referenceCaseId: string,
  categories: FluidInstalledReferencePacingScenarioInput["categories"],
  expectedParticles: boolean
): FluidInstalledReferencePacingScenarioInput {
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
      couplingActiveSeen: true,
      finalPhase: "floating",
      longTaskSupported: true,
      particlesActiveSeen: true,
      pressureActiveSeen: true,
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      timeScale: 1,
      waterContext: "webgpu",
    },
  };
}

function samples(): InstalledReferencePacingSample[] {
  return Array.from({ length: 180 }, (_entry, index) => ({
    atMs: index * 8.33,
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
    tier: "ultra",
    tierSelectionMode: "calibrated-auto",
    tierSelectionPreferredTier: "ultra",
    tierSelectionRequestedTier: "auto",
    totalSubsteps: index,
    waterContext: "webgpu",
    waterFrame: index,
  }));
}

function installedReferenceEvidence(): FluidInstalledReferenceOutcomesReport {
  return {
    coreReference: {
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
      comparisons: [],
      consumedCoupling: {
        active: true,
        gridVelocityMps: 0.02,
        horizontalForceDeltaN: 1,
        sampleTimeS: 1,
        verticalForceDeltaN: 2,
      },
      failures: [],
      finalStats: null,
      frameLoop: null,
      gate: "G-FG-22",
      generatedAt: "2026-06-08T00:00:00.000Z",
      launchMode: "packaged-app",
      noFullGridReadbackPerFrame: true,
      pass: true,
      preferredTier: "ultra",
      selectedGrid: { cellsX: 768, cellsY: 432 },
      selectedTier: "ultra",
      summary: {
        caseCount: 5,
        categories: ["damping", "drop", "float", "sink", "splash"],
        comparisonCount: 10,
        liveGrid: "768x432",
        pressureForceBoundN: 1500,
      },
      telemetry: canvasTelemetry(),
    },
    defaultProfileEvidence: {
      gate: "G-FG-34",
      grid: "768x432",
      mode: "calibrated-auto",
      pass: true,
      selectedTier: "ultra",
      sourcePath: "reports/fluid-default-profile-calibration-latest.json",
    },
    failures: [],
    gate: "G-FG-36",
    generatedAt: "2026-06-08T00:00:00.000Z",
    launchEnv: {
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      envUserDataOverridePresent: false,
    },
    launcher: {
      executablePath: "/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      resolvesToInstalledBundle: true,
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    pass: true,
    runtimeSelection: {
      capabilitySelectedTier: "ultra",
      grid: "768x432",
      renderer: "webgpu-grid-primary-v1",
      selectedGrid: { cellsX: 768, cellsY: 432 },
      selectedTier: "ultra",
      selection: {
        calibratedTier: "ultra",
        mode: "calibrated-auto",
        preferredTier: "ultra",
        requestedTier: "auto",
      },
      waterContext: "webgpu",
    },
    summary: {
      caseCount: 5,
      categories: ["damping", "drop", "float", "sink", "splash"],
      comparisonCount: 10,
      grid: "768x432",
      mode: "calibrated-auto",
      selectedTier: "ultra",
    },
  };
}

function caseEntry(
  id: string,
  category: FluidInstalledReferenceOutcomesReport["coreReference"]["cases"][number]["category"]
): FluidInstalledReferenceOutcomesReport["coreReference"]["cases"][number] {
  return {
    category,
    consumedCoupling: {
      active: true,
      gridVelocityMps: 0.02,
      horizontalForceDeltaN: 1,
      sampleTimeS: 1,
      verticalForceDeltaN: 2,
    },
    id,
    pass: true,
    snapshot: {} as FluidInstalledReferenceOutcomesReport["coreReference"]["cases"][number]["snapshot"],
    telemetry: canvasTelemetry(),
  };
}

function canvasTelemetry() {
  return {
    forceBoundN: 1500,
    frames: 240,
    grid: "768x432",
    noFullGridReadbackPerFrame: true,
    particles: "localized-particle-splash-live-v1",
    particlesActive: true,
    pressure: "bounded-pressure-gradient-live-v1",
    pressureActive: true,
    renderer: "webgpu-grid-primary-v1",
    status: "rendered",
    tier: "ultra",
    verticalPressureForceN: 300,
    waterContext: "webgpu",
  };
}
