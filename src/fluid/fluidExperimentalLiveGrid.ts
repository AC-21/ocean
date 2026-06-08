import {
  createFluidDisplayPacingReport,
  type DisplayPacingThresholds,
  type FluidDisplayPacingReport,
  type FluidDisplayPacingScenarioInput,
} from "./fluidDisplayPacing";
import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidWaterRuntimeGridDimensions } from "./fluidWaterRenderer";

export type FluidExperimentalLiveGridGate = "G-FG-39";

export type FluidExperimentalLiveGridScenarioInput = FluidDisplayPacingScenarioInput & {
  observedRuntimeGrid: string | null;
  particlesNoFullGridReadback: boolean;
  pressureNoFullGridReadback: boolean;
  runtimeGridOverride: string | null;
};

export type FluidExperimentalLiveGridReport = {
  capabilityGrid: FluidWaterRuntimeGridDimensions;
  displayPacing: FluidDisplayPacingReport;
  failures: string[];
  gate: FluidExperimentalLiveGridGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  preferredTier: FluidGridTierId | "auto";
  runtimeGrid: FluidWaterRuntimeGridDimensions;
  runtimeGridOverride: FluidWaterRuntimeGridDimensions | null;
  scenarioRuntimeTelemetry: Array<{
    id: string;
    observedRuntimeGrid: string | null;
    particlesNoFullGridReadback: boolean;
    pressureNoFullGridReadback: boolean;
    runtimeGridOverride: string | null;
  }>;
  selectedTier: FluidGridTierId;
  summary: {
    maxP95FrameMs: number;
    maxP99FrameMs: number;
    scenarioCount: number;
    worstDroppedFrameRatio: number;
  };
};

export type FluidExperimentalLiveGridOptions = {
  capabilityGrid: FluidWaterRuntimeGridDimensions;
  generatedAt?: string;
  launchMode: FluidExperimentalLiveGridReport["launchMode"];
  preferredTier: FluidExperimentalLiveGridReport["preferredTier"];
  runtimeGrid: FluidWaterRuntimeGridDimensions;
  runtimeGridOverride: FluidWaterRuntimeGridDimensions | null;
  scenarios: FluidExperimentalLiveGridScenarioInput[];
  selectedTier: FluidGridTierId;
  thresholds?: Partial<DisplayPacingThresholds>;
};

const expectedCapabilityGrid = { cellsX: 768, cellsY: 432 };
const expectedRuntimeGrid = { cellsX: 1024, cellsY: 576 };

export function createFluidExperimentalLiveGridReport(options: FluidExperimentalLiveGridOptions): FluidExperimentalLiveGridReport {
  const displayPacing = createFluidDisplayPacingReport({
    generatedAt: options.generatedAt,
    launchMode: options.launchMode,
    scenarios: options.scenarios,
    thresholds: options.thresholds,
  });
  const observedTiers = new Set(options.scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.tier).filter(Boolean)));
  const scenarioRuntimeTelemetry = options.scenarios.map((scenario) => ({
    id: scenario.id,
    observedRuntimeGrid: scenario.observedRuntimeGrid,
    particlesNoFullGridReadback: scenario.particlesNoFullGridReadback,
    pressureNoFullGridReadback: scenario.pressureNoFullGridReadback,
    runtimeGridOverride: scenario.runtimeGridOverride,
  }));
  const failures = [
    ...(displayPacing.failures.length > 0 ? displayPacing.failures.map((failure) => `display pacing: ${failure}`) : []),
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.preferredTier === "ultra" ? [] : [`preferred tier must be ultra, got ${options.preferredTier}`]),
    ...(options.selectedTier === "ultra" ? [] : [`selected tier must be ultra, got ${options.selectedTier}`]),
    ...gridFailures("capability grid", options.capabilityGrid, expectedCapabilityGrid),
    ...(options.runtimeGridOverride ? [] : ["experimental runtime grid override was missing"]),
    ...(options.runtimeGridOverride ? gridFailures("runtime grid override", options.runtimeGridOverride, expectedRuntimeGrid) : []),
    ...gridFailures("live renderer grid", options.runtimeGrid, expectedRuntimeGrid),
    ...(observedTiers.size === 1 && observedTiers.has("ultra") ? [] : [`display samples did not all observe ultra tier: ${Array.from(observedTiers).join(", ") || "none"}`]),
    ...scenarioRuntimeTelemetry.flatMap((telemetry) =>
      telemetry.observedRuntimeGrid === "1024x576" ? [] : [`${telemetry.id} observed runtime grid ${telemetry.observedRuntimeGrid ?? "missing"}`]
    ),
    ...scenarioRuntimeTelemetry.flatMap((telemetry) =>
      telemetry.runtimeGridOverride === "1024x576" ? [] : [`${telemetry.id} runtime grid override was ${telemetry.runtimeGridOverride ?? "missing"}`]
    ),
    ...options.scenarios
      .filter((scenario) => scenario.expectedActivePhysics)
      .flatMap((scenario) => (scenario.telemetry.particlesActiveSeen ? [] : [`${scenario.id} never observed active particle splash telemetry`])),
    ...scenarioRuntimeTelemetry.flatMap((telemetry) =>
      telemetry.pressureNoFullGridReadback ? [] : [`${telemetry.id} pressure path used a full-grid readback`]
    ),
    ...scenarioRuntimeTelemetry.flatMap((telemetry) =>
      telemetry.particlesNoFullGridReadback ? [] : [`${telemetry.id} particle path used a full-grid readback`]
    ),
  ];

  return {
    capabilityGrid: options.capabilityGrid,
    displayPacing,
    failures,
    gate: "G-FG-39",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    preferredTier: options.preferredTier,
    runtimeGrid: options.runtimeGrid,
    runtimeGridOverride: options.runtimeGridOverride,
    scenarioRuntimeTelemetry,
    selectedTier: options.selectedTier,
    summary: {
      maxP95FrameMs: displayPacing.summary.maxP95FrameMs,
      maxP99FrameMs: displayPacing.summary.maxP99FrameMs,
      scenarioCount: displayPacing.summary.scenarioCount,
      worstDroppedFrameRatio: displayPacing.summary.worstDroppedFrameRatio,
    },
  };
}

function gridFailures(
  label: string,
  actual: FluidWaterRuntimeGridDimensions,
  expected: FluidWaterRuntimeGridDimensions
): string[] {
  return actual.cellsX === expected.cellsX && actual.cellsY === expected.cellsY
    ? []
    : [`${label} must be ${expected.cellsX} x ${expected.cellsY}, got ${actual.cellsX} x ${actual.cellsY}`];
}
