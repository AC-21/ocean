import { describe, expect, it } from "vitest";
import {
  createFluidInstalledHighResolutionVisualWatchdogReport,
  type FluidInstalledHighResolutionVisualWatchdogOptions,
  type VisualWatchdogSample,
} from "./fluidInstalledHighResolutionVisualWatchdog";
import type { FluidInstalledHighResolutionResidualBudgetReport } from "./fluidInstalledHighResolutionResidualBudget";

describe("installed high-resolution visual watchdog gate", () => {
  it("passes with advancing nonblank high-resolution idle and post-drop samples", () => {
    const report = createFluidInstalledHighResolutionVisualWatchdogReport(validOptions());

    expect(report.gate).toBe("G-FG-47");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.summary.sampleCount).toBe(6);
    expect(report.summary.phases).toEqual(["idle", "post-drop"]);
    expect(report.summary.waterFrameDelta).toBeGreaterThan(24);
    expect(report.summary.postDropActivePhysicsSeen).toBe(true);
  });

  it("rejects black or flat high-resolution visual samples", () => {
    const samples = visualSamples();
    samples[1] = {
      ...samples[1],
      pixelProbe: {
        ...samples[1].pixelProbe,
        averageLuma: 0,
        colorBuckets: 1,
        status: "blank",
        variety: "flat",
      },
    };
    const report = createFluidInstalledHighResolutionVisualWatchdogReport({
      ...validOptions(),
      samples,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("idle-2 high-resolution canvas pixels were blank");
    expect(report.failures.join(" ")).toContain("idle-2 high-resolution canvas variety was flat");
    expect(report.failures.join(" ")).toContain("idle-2 average luma 0 was below");
    expect(report.failures.join(" ")).toContain("idle-2 color buckets 1 were below");
  });

  it("rejects stale watchdog samples that do not advance water frames", () => {
    const report = createFluidInstalledHighResolutionVisualWatchdogReport({
      ...validOptions(),
      samples: visualSamples().map((sample) => ({
        ...sample,
        telemetry: {
          ...sample.telemetry,
          waterFrame: 22,
        },
      })),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("unique water frames");
    expect(report.failures.join(" ")).toContain("water frame delta was 0");
  });

  it("rejects fallback runtime grids and readback loss", () => {
    const samples = visualSamples().map((sample) => ({
      ...sample,
      telemetry: {
        ...sample.telemetry,
        liveGrid: "768x432",
        particlesNoFullGridReadback: false,
        pressureNoFullGridReadback: false,
        renderMode: "fallback",
        renderer: "legacy-canvas-diagnostic-v1",
        runtimeGridOverride: null,
        waterContext: "2d",
      },
    }));
    const report = createFluidInstalledHighResolutionVisualWatchdogReport({
      ...validOptions(),
      runtime: {
        ...validOptions().runtime,
        liveGrid: "768x432",
        renderer: "legacy-canvas-diagnostic-v1",
        runtimeGridOverride: null,
        waterContext: "2d",
      },
      samples,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("runtime grid override was not 1024 x 576");
    expect(report.failures.join(" ")).toContain("runtime renderer was legacy-canvas-diagnostic-v1");
    expect(report.failures.join(" ")).toContain("idle-1 pressure path used full-grid readback");
    expect(report.failures.join(" ")).toContain("idle-1 render mode was fallback");
  });

  it("rejects weak FG-46 source residual provenance and UI-only visual evidence", () => {
    const sourceResidualBudget = residualBudget();
    sourceResidualBudget.pass = false;
    sourceResidualBudget.failures = ["missing residual category splash"];
    sourceResidualBudget.summary.comparisonCount = 2;
    sourceResidualBudget.sourceReference.noFullGridReadbackPerFrame = false;
    const report = createFluidInstalledHighResolutionVisualWatchdogReport({
      ...validOptions(),
      samples: visualSamples().slice(0, 2),
      sourceResidualBudget,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("source residual budget missing residual category splash");
    expect(report.failures.join(" ")).toContain("source residual comparison count was 2");
    expect(report.failures.join(" ")).toContain("source residual reference used full-grid readback");
    expect(report.failures.join(" ")).toContain("visual watchdog captured 2 samples");
  });
});

function validOptions(): FluidInstalledHighResolutionVisualWatchdogOptions {
  return {
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
      waterFrames: 220,
    },
    samples: visualSamples(),
    sourceResidualBudget: residualBudget(),
    sourceResidualBudgetPath: "docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json",
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

function residualBudget(): FluidInstalledHighResolutionResidualBudgetReport {
  return {
    failures: [],
    gate: "G-FG-46",
    operatorReadout: {
      liveGrid: "1024x576",
    },
    pass: true,
    sourceReference: {
      liveGrid: "1024x576",
      noFullGridReadbackPerFrame: true,
    },
    summary: {
      closestMarginRatio: 0.1837,
      comparisonCount: 10,
      watchComparisonIds: [],
      worstNormalizedResidual: 0.8163,
    },
  } as unknown as FluidInstalledHighResolutionResidualBudgetReport;
}

function visualSamples(): VisualWatchdogSample[] {
  return [
    sample("idle-1", "idle", 30, false),
    sample("idle-2", "idle", 58, false),
    sample("idle-3", "idle", 86, false),
    sample("post-drop-1", "post-drop", 122, true),
    sample("post-drop-2", "post-drop", 166, true),
    sample("post-drop-3", "post-drop", 210, true),
  ];
}

function sample(id: string, phase: "idle" | "post-drop", waterFrame: number, activePhysics: boolean): VisualWatchdogSample {
  return {
    capturedAtMs: waterFrame * 8,
    id,
    phase,
    pixelProbe: {
      averageLuma: 124,
      colorBuckets: 26,
      height: 1412,
      opaqueSamples: 4200,
      samples: 4200,
      status: "nonblank",
      variety: "varied",
      width: 1364,
    },
    screenshotPath: `reports/fluid-installed-high-resolution-visual-watchdog/${id}.png`,
    telemetry: {
      couplingActive: activePhysics,
      droppedDebtS: 0,
      liveGrid: "1024x576",
      particlesActive: activePhysics,
      particlesNoFullGridReadback: true,
      pressureActive: activePhysics,
      pressureNoFullGridReadback: true,
      renderMode: "webgpu",
      renderer: "webgpu-grid-primary-v1",
      runtimeGridOverride: "1024x576",
      tier: "ultra",
      waterContext: "webgpu",
      waterFrame,
    },
  };
}
