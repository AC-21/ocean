import { describe, expect, it } from "vitest";
import type { FluidAdaptiveTierReport } from "./fluidAdaptiveTier";
import type { FluidGridTierId } from "./fluidGridContract";
import { calibrationProfileForAdaptiveReport } from "./fluidPersistedCalibration";
import type { FluidCalibrationInstallReceipt } from "./fluidInstalledCalibration";
import {
  createFluidInstalledDisplayPacingReport,
  type FluidInstalledDisplayPacingScenarioInput,
  type InstalledDisplayPacingSample,
} from "./fluidInstalledDisplayPacing";

describe("installed calibration display pacing gate", () => {
  it("passes when installed-profile calibrated-auto ultra stays smooth", () => {
    const report = createFluidInstalledDisplayPacingReport({
      adaptiveSource: adaptiveReport(),
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      generatedAt: "2026-06-08T00:00:00.000Z",
      install: installReceipt(),
      launchMode: "packaged-app",
      runtime: runtime(),
      scenarios: smoothScenarios(),
    });

    expect(report.pass).toBe(true);
    expect(report.gate).toBe("G-FG-26");
    expect(report.storage.reusedByMainProcess).toBe(true);
    expect(report.summary.scenarioCount).toBe(3);
  });

  it("rejects env-provided tier evidence for installed display pacing", () => {
    const report = createFluidInstalledDisplayPacingReport({
      adaptiveSource: adaptiveReport(),
      envCalibratedTierPresent: true,
      envRequestedTierPresent: true,
      install: installReceipt(),
      launchMode: "packaged-app",
      runtime: runtime(),
      scenarios: smoothScenarios(),
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent");
    expect(report.failures.join(" ")).toContain("OCEAN_LAB_FLUID_TIER must be absent");
  });

  it("rejects fallback-high samples that did not observe calibrated-auto ultra", () => {
    const scenarios = smoothScenarios().map((scenario) => ({
      ...scenario,
      samples: scenario.samples.map((sample) => ({
        ...sample,
        capabilityGrid: "512x288",
        capabilitySelectedTier: "high",
        tier: "high",
        tierSelectionMode: "auto-fallback-high",
        tierSelectionPreferredTier: "high",
      })),
    }));
    const report = createFluidInstalledDisplayPacingReport({
      adaptiveSource: adaptiveReport(),
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      install: installReceipt(),
      launchMode: "packaged-app",
      runtime: {
        ...runtime(),
        selectedGrid: { cellsX: 512, cellsY: 288 },
        selectedTier: "high",
        selection: {
          mode: "auto-fallback-high",
          preferredTier: "high",
          reason: "auto requested without valid calibration",
          requestedTier: "auto",
        },
      },
      scenarios,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("runtime selection mode");
    expect(report.failures.join(" ")).toContain("display samples did not all observe calibrated-auto");
    expect(report.failures.join(" ")).toContain("display samples did not all use 768x432");
  });

  it("rejects choppy installed-profile display samples", () => {
    const scenarios = smoothScenarios().map((scenario) => ({
      ...scenario,
      samples: scenario.samples.map((sample, index) => ({
        ...sample,
        dtMs: index % 5 === 0 ? 54 : 8.33,
      })),
    }));
    const report = createFluidInstalledDisplayPacingReport({
      adaptiveSource: adaptiveReport(),
      envCalibratedTierPresent: false,
      envRequestedTierPresent: false,
      install: installReceipt(),
      launchMode: "packaged-app",
      runtime: runtime(),
      scenarios,
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("display pacing");
  });
});

function smoothScenarios(): FluidInstalledDisplayPacingScenarioInput[] {
  return [
    scenario("idle-installed-display-pacing", "Idle installed-calibration display pacing", false),
    scenario("concrete-installed-impact-display-pacing", "Concrete installed-calibration impact pacing", true),
    scenario("foam-installed-damping-display-pacing", "Foam installed-calibration damping pacing", true),
  ];
}

function scenario(id: string, label: string, expectedActivePhysics: boolean): FluidInstalledDisplayPacingScenarioInput {
  return {
    expectedActivePhysics,
    id,
    label,
    samples: samples(expectedActivePhysics),
    telemetry: {
      couplingActiveSeen: expectedActivePhysics,
      finalPhase: expectedActivePhysics ? "floating" : "ready",
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

function samples(active: boolean): InstalledDisplayPacingSample[] {
  return Array.from({ length: 180 }, (_entry, index) => ({
    atMs: index * 8.33,
    capabilityGrid: "768x432",
    capabilitySelectedTier: "ultra",
    couplingActive: active && index > 12,
    droppedDebtS: 0,
    dtMs: index === 0 ? 8.33 : 8.33,
    longTaskCount: 0,
    longTaskDurationMs: 0,
    maxSubstepsObserved: active ? 1 : 0,
    particlesActive: index > 8,
    phase: active ? "falling" : "ready",
    physicsTimeS: active ? index * 0.00833 : 0,
    pressureActive: true,
    renderMode: "webgpu",
    renderer: "webgpu-grid-primary-v1",
    tier: "ultra",
    tierSelectionMode: "calibrated-auto",
    tierSelectionPreferredTier: "ultra",
    tierSelectionRequestedTier: "auto",
    totalSubsteps: active ? index : 0,
    waterContext: "webgpu",
    waterFrame: index,
  }));
}

function runtime() {
  return {
    envCalibratedTierPresent: false,
    envRequestedTierPresent: false,
    selectedGrid: { cellsX: 768, cellsY: 432 },
    selectedTier: "ultra",
    selection: {
      calibratedTier: "ultra" as FluidGridTierId,
      mode: "calibrated-auto" as const,
      preferredTier: "ultra" as const,
      reason: "local calibration selected tier",
      requestedTier: "auto" as const,
    },
  };
}

function installReceipt(): FluidCalibrationInstallReceipt {
  const adaptive = adaptiveReport();
  return {
    fileName: "fluid-calibration.v1.json",
    installedAt: "2026-06-08T00:00:00.000Z",
    installedProfile: calibrationProfileForAdaptiveReport(adaptive, "2026-06-08T00:00:00.000Z"),
    persistedRawBytes: 321,
    storageBasePath: "/tmp/Ocean Impact Lab/harborline-game",
    verificationReadMatched: true,
  };
}

function adaptiveReport(): FluidAdaptiveTierReport {
  return {
    failures: [],
    gate: "G-FG-23",
    generatedAt: "2026-06-08T00:00:00.000Z",
    pass: true,
    recommendation: {
      failures: [],
      reason: "ultra has measured local headroom and live reference parity",
      selectedTier: "ultra",
      summary: {
        maxEstimatedStorageBytes: 18_841_600,
        maxLiveP95FrameMs: 9.3,
        maxLiveP99FrameMs: 9.4,
        maxUltraGpuP95StepMs: 0.09025,
        maxUltraToHighGpuP95Ratio: 2.0688,
        referenceCategories: ["damping", "drop", "float", "sink", "splash"],
      },
    },
    runtimeProbe: {
      grid: "768x432",
      launchMode: "packaged-app",
      renderer: "webgpu-grid-primary-v1",
      requestedTier: "auto",
      selectedGrid: { cellsX: 768, cellsY: 432 },
      selectedTier: "ultra",
      selection: runtime().selection,
      tier: "ultra",
      waterContext: "webgpu",
      waterFrames: 20,
    },
    sources: {
      resolutionScaling: {
        gate: "G-FG-20",
        pass: true,
        summary: {
          maxEstimatedStorageBytes: 18_841_600,
          maxGridGpuP95StepMs: 0.09025,
          maxParticleGpuP95StepMs: 0.028792,
          maxPressureGpuP95StepMs: 0.07325,
          tierCount: 3,
          ultraToHighRatios: {
            gridGpuP95: 2.0688,
            particlesGpuP95: 1.9195,
            pressureGpuP95: 1.0293,
          },
        },
      },
      ultraReference: {
        gate: "G-FG-22",
        pass: true,
        selectedTier: "ultra",
        summary: {
          caseCount: 5,
          categories: ["damping", "drop", "float", "sink", "splash"],
          comparisonCount: 10,
          liveGrid: "768x432",
          pressureForceBoundN: 86,
        },
      },
      ultraRenderer: {
        gate: "G-FG-21",
        pass: true,
        selectedTier: "ultra",
        summary: {
          maxP95FrameMs: 9.3,
          maxP99FrameMs: 9.4,
          scenarioCount: 2,
          worstDroppedFrameRatio: 0,
        },
      },
    },
    thresholds: {
      maxDroppedFrameRatio: 0.01,
      maxEstimatedStorageBytes: 32 * 1024 * 1024,
      maxLiveP95FrameMs: 1000 / 60,
      maxLiveP99FrameMs: 20,
      maxUltraGpuP95StepMs: 1,
      maxUltraToHighGpuP95Ratio: 3,
    },
  };
}
