import type { FluidRuntimeTierSelection } from "./fluidAdaptiveTier";
import {
  defaultDisplayPacingThresholds,
  summarizeDisplayPacing,
  type DisplayPacingSummary,
  type DisplayPacingThresholds,
} from "./fluidDisplayPacing";
import type { InstalledHighResolutionReferencePacingSample } from "./fluidInstalledHighResolutionReferencePacing";

export type FluidInstalledHighResolutionOperatorReadoutGate = "G-FG-45";

export type OperatorReadoutOutcome = "floats-indefinitely" | "sinks-immediately" | "waterlogs-then-sinks";

export type InstalledHighResolutionOperatorReadoutSnapshot = {
  impactSpeedMps: number | null;
  liveFloatDurationS: number | null;
  phase: string;
  predictionOutcome: string;
  secondsUntilSink: number | null;
  selectedPresetId: string;
  splashHeightM: number | null;
  waterFillFraction: number;
};

export type InstalledHighResolutionOperatorReadouts = {
  floatResult: string;
  grid: string;
  impact: string;
  liveAfloat: string;
  liveState: string;
  predictedSink: string;
  renderer: string;
  splash: string;
};

export type FluidInstalledHighResolutionOperatorReadoutScenarioInput = {
  clickedDrop: boolean;
  clickedPreset: boolean;
  expectedOutcome: OperatorReadoutOutcome;
  finalSnapshot: InstalledHighResolutionOperatorReadoutSnapshot;
  id: string;
  initialSnapshot: InstalledHighResolutionOperatorReadoutSnapshot;
  label: string;
  presetId: string;
  presetName: string;
  readouts: InstalledHighResolutionOperatorReadouts;
  samples: InstalledHighResolutionReferencePacingSample[];
  telemetry: {
    canvasGrid: string | null;
    couplingActiveSeen: boolean;
    particlesActiveSeen: boolean;
    particlesNoFullGridReadback: boolean;
    pressureActiveSeen: boolean;
    pressureNoFullGridReadback: boolean;
    renderMode: string | null;
    renderer: string | null;
    runtimeGridOverride: string | null;
    waterContext: string | null;
  };
};

export type FluidInstalledHighResolutionOperatorReadoutScenario =
  FluidInstalledHighResolutionOperatorReadoutScenarioInput & {
    framePacing: DisplayPacingSummary;
  };

export type FluidInstalledHighResolutionOperatorReadoutReport = {
  failures: string[];
  gate: FluidInstalledHighResolutionOperatorReadoutGate;
  generatedAt: string;
  launcher: {
    executablePath: string;
    path: string;
    resolvesToInstalledBundle: boolean;
    targetPath: string | null;
  };
  pass: boolean;
  runtime: {
    capabilityGrid: {
      cellsX: number;
      cellsY: number;
    };
    liveGrid: string | null;
    renderer: string | null;
    runtimeGridOverride: {
      cellsX: number;
      cellsY: number;
    } | null;
    selectedTier: string;
    selection: FluidRuntimeTierSelection | null;
    tier: string | null;
    waterContext: string | null;
    waterFrames: number;
  };
  scenarios: FluidInstalledHighResolutionOperatorReadoutScenario[];
  sourceVisibility: {
    failures: string[];
    gate: string;
    liveGrid: string | null;
    pass: boolean;
    sourcePath: string;
    viewport: {
      averageLuma: number;
      colorBuckets: number;
      status: string;
      variety: string;
    } | null;
    window: {
      frontmost: boolean;
      visible: boolean;
    };
  };
  summary: {
    maxP95FrameMs: number;
    maxP99FrameMs: number;
    outcomeClasses: OperatorReadoutOutcome[];
    scenarioCount: number;
    worstDroppedFrameRatio: number;
    worstDuplicateWaterFrameRatio: number;
  };
  thresholds: DisplayPacingThresholds;
};

export type FluidInstalledHighResolutionOperatorReadoutOptions = {
  generatedAt?: string;
  launcher: FluidInstalledHighResolutionOperatorReadoutReport["launcher"];
  runtime: FluidInstalledHighResolutionOperatorReadoutReport["runtime"];
  scenarios: FluidInstalledHighResolutionOperatorReadoutScenarioInput[];
  sourceVisibility: FluidInstalledHighResolutionOperatorReadoutReport["sourceVisibility"];
  thresholds?: Partial<DisplayPacingThresholds>;
};

export const installedHighResolutionOperatorReadoutThresholds: DisplayPacingThresholds = {
  ...defaultDisplayPacingThresholds,
  maxDroppedFrameRatio: 0.08,
  maxDuplicateWaterFrameRatio: 0.18,
  maxLongTaskDurationMs: 180,
  maxP95FrameMs: 24,
  maxP99FrameMs: 36,
  minSamples: 72,
  minWaterFrameDelta: 24,
};

const expectedScenarioIds = new Set([
  "operator-foam-float-readout",
  "operator-concrete-sink-readout",
  "operator-leaky-drum-waterlogging-readout",
]);

const requiredOutcomes: OperatorReadoutOutcome[] = ["floats-indefinitely", "sinks-immediately", "waterlogs-then-sinks"];

export function createFluidInstalledHighResolutionOperatorReadoutReport(
  options: FluidInstalledHighResolutionOperatorReadoutOptions
): FluidInstalledHighResolutionOperatorReadoutReport {
  const thresholds = { ...installedHighResolutionOperatorReadoutThresholds, ...options.thresholds };
  const scenarios = options.scenarios.map((scenario) => ({
    ...scenario,
    framePacing: summarizeDisplayPacing(scenario.samples, true, thresholds),
  }));
  const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
  const outcomeClasses = Array.from(new Set(scenarios.map((scenario) => scenario.expectedOutcome))).sort() as OperatorReadoutOutcome[];
  const observedCanvasGrids = sampleSet(scenarios, (sample) => sample.canvasGrid ?? "missing");
  const observedRuntimeOverrides = sampleSet(scenarios, (sample) => sample.runtimeGridOverride ?? "missing");
  const observedRenderers = sampleSet(scenarios, (sample) => sample.renderer ?? "missing");
  const observedContexts = sampleSet(scenarios, (sample) => sample.waterContext ?? "missing");
  const observedModes = sampleSet(scenarios, (sample) => sample.renderMode ?? "missing");
  const observedTiers = sampleSet(scenarios, (sample) => sample.tier ?? "missing");
  const observedSampleSelectionModes = sampleSet(scenarios, (sample) => sample.tierSelectionMode ?? "missing");

  const failures = [
    ...(options.sourceVisibility.gate === "G-FG-44" ? [] : [`source visibility gate was ${options.sourceVisibility.gate}`]),
    ...(options.sourceVisibility.pass ? [] : options.sourceVisibility.failures.map((failure) => `source visibility ${failure}`)),
    ...(options.sourceVisibility.liveGrid === "1024x576"
      ? []
      : [`source visibility live grid was ${options.sourceVisibility.liveGrid ?? "missing"}`]),
    ...(options.sourceVisibility.viewport?.status === "nonblank"
      ? []
      : [`source viewport status was ${options.sourceVisibility.viewport?.status ?? "missing"}`]),
    ...(options.sourceVisibility.viewport?.variety === "varied"
      ? []
      : [`source viewport variety was ${options.sourceVisibility.viewport?.variety ?? "missing"}`]),
    ...(options.sourceVisibility.window.visible && options.sourceVisibility.window.frontmost
      ? []
      : ["source Desktop window was not visible and frontmost"]),
    ...(options.launcher.resolvesToInstalledBundle ? [] : ["Desktop launcher does not resolve to the installed app bundle"]),
    ...(options.launcher.executablePath.includes("/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab")
      ? []
      : [`launcher executable was ${options.launcher.executablePath}`]),
    ...(options.runtime.selection?.mode === "calibrated-auto"
      ? []
      : [`runtime selection mode was ${options.runtime.selection?.mode ?? "missing"}`]),
    ...(options.runtime.selection?.requestedTier === "auto"
      ? []
      : [`runtime requested tier was ${options.runtime.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtime.selection?.calibratedTier === "ultra"
      ? []
      : [`runtime calibrated tier was ${options.runtime.selection?.calibratedTier ?? "missing"}`]),
    ...(options.runtime.selectedTier === "ultra" ? [] : [`runtime selected tier was ${options.runtime.selectedTier}`]),
    ...(options.runtime.capabilityGrid.cellsX === 768 && options.runtime.capabilityGrid.cellsY === 432
      ? []
      : [`runtime capability grid was ${options.runtime.capabilityGrid.cellsX} x ${options.runtime.capabilityGrid.cellsY}`]),
    ...(options.runtime.liveGrid === "1024x576" ? [] : [`runtime live grid was ${options.runtime.liveGrid ?? "missing"}`]),
    ...(options.runtime.runtimeGridOverride?.cellsX === 1024 && options.runtime.runtimeGridOverride.cellsY === 576
      ? []
      : ["runtime grid override was not 1024 x 576"]),
    ...(options.runtime.renderer === "webgpu-grid-primary-v1" ? [] : [`runtime renderer was ${options.runtime.renderer ?? "missing"}`]),
    ...(options.runtime.waterContext === "webgpu" ? [] : [`runtime water context was ${options.runtime.waterContext ?? "missing"}`]),
    ...(setEquals(scenarioIds, expectedScenarioIds) ? [] : [`operator scenario ids were ${Array.from(scenarioIds).join(", ")}`]),
    ...requiredOutcomes.flatMap((outcome) => (outcomeClasses.includes(outcome) ? [] : [`operator readouts missing ${outcome} outcome`])),
    ...(setEquals(observedCanvasGrids, new Set(["1024x576"])) ? [] : [`operator samples used canvas grids ${Array.from(observedCanvasGrids).join(", ")}`]),
    ...(setEquals(observedRuntimeOverrides, new Set(["1024x576"])) ? [] : [`operator samples used runtime overrides ${Array.from(observedRuntimeOverrides).join(", ")}`]),
    ...(setEquals(observedRenderers, new Set(["webgpu-grid-primary-v1"])) ? [] : [`operator samples used renderers ${Array.from(observedRenderers).join(", ")}`]),
    ...(setEquals(observedContexts, new Set(["webgpu"])) ? [] : [`operator samples used contexts ${Array.from(observedContexts).join(", ")}`]),
    ...(setEquals(observedModes, new Set(["webgpu"])) ? [] : [`operator samples used render modes ${Array.from(observedModes).join(", ")}`]),
    ...(setEquals(observedTiers, new Set(["ultra"])) ? [] : [`operator samples used tiers ${Array.from(observedTiers).join(", ")}`]),
    ...(setEquals(observedSampleSelectionModes, new Set(["calibrated-auto"]))
      ? []
      : [`operator samples used selection modes ${Array.from(observedSampleSelectionModes).join(", ")}`]),
    ...scenarios.flatMap((scenario) => scenarioFailures(scenario)),
  ];

  const summary = {
    maxP95FrameMs: Math.max(...scenarios.map((scenario) => scenario.framePacing.p95FrameMs), 0),
    maxP99FrameMs: Math.max(...scenarios.map((scenario) => scenario.framePacing.p99FrameMs), 0),
    outcomeClasses,
    scenarioCount: scenarios.length,
    worstDroppedFrameRatio: Math.max(...scenarios.map((scenario) => scenario.framePacing.droppedFrameRatio), 0),
    worstDuplicateWaterFrameRatio: Math.max(...scenarios.map((scenario) => scenario.framePacing.duplicateWaterFrameRatio), 0),
  };

  return {
    ...options,
    failures,
    gate: "G-FG-45",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
    scenarios,
    summary,
    thresholds,
  };
}

function scenarioFailures(scenario: FluidInstalledHighResolutionOperatorReadoutScenario): string[] {
  const hasImpact = scenario.finalSnapshot.impactSpeedMps !== null && scenario.finalSnapshot.splashHeightM !== null;
  return [
    ...(scenario.clickedPreset ? [] : [`${scenario.id} did not click a visible preset control`]),
    ...(scenario.clickedDrop ? [] : [`${scenario.id} did not click the visible Drop control`]),
    ...(scenario.initialSnapshot.selectedPresetId === scenario.presetId
      ? []
      : [`${scenario.id} initial preset was ${scenario.initialSnapshot.selectedPresetId}`]),
    ...(scenario.finalSnapshot.selectedPresetId === scenario.presetId
      ? []
      : [`${scenario.id} final preset was ${scenario.finalSnapshot.selectedPresetId}`]),
    ...(scenario.initialSnapshot.predictionOutcome === scenario.expectedOutcome
      ? []
      : [`${scenario.id} initial prediction was ${scenario.initialSnapshot.predictionOutcome}`]),
    ...(scenario.finalSnapshot.predictionOutcome === scenario.expectedOutcome
      ? []
      : [`${scenario.id} final prediction was ${scenario.finalSnapshot.predictionOutcome}`]),
    ...(scenario.readouts.renderer === "WebGPU grid" ? [] : [`${scenario.id} visible renderer readout was ${scenario.readouts.renderer}`]),
    ...(scenario.readouts.grid.includes("768 x 432") ? [] : [`${scenario.id} visible capability grid readout was ${scenario.readouts.grid}`]),
    ...(scenario.readouts.floatResult.length > 0 ? [] : [`${scenario.id} visible Float Result was empty`]),
    ...(scenario.readouts.liveState.length > 0 ? [] : [`${scenario.id} visible live state was empty`]),
    ...(scenario.readouts.predictedSink.length > 0 ? [] : [`${scenario.id} visible Predicted sink readout was empty`]),
    ...(hasImpact ? [] : [`${scenario.id} did not expose impact and splash measurements after Drop`]),
    ...(scenario.readouts.impact.includes("m/s") ? [] : [`${scenario.id} visible impact readout was ${scenario.readouts.impact}`]),
    ...(scenario.readouts.splash.includes("m") ? [] : [`${scenario.id} visible splash readout was ${scenario.readouts.splash}`]),
    ...outcomeReadoutFailures(scenario),
    ...(scenario.framePacing.pass ? [] : [`${scenario.id} display pacing missed the operator smoothness threshold`]),
    ...(scenario.telemetry.canvasGrid === "1024x576" ? [] : [`${scenario.id} telemetry canvas grid was ${scenario.telemetry.canvasGrid ?? "missing"}`]),
    ...(scenario.telemetry.runtimeGridOverride === "1024x576"
      ? []
      : [`${scenario.id} telemetry runtime grid was ${scenario.telemetry.runtimeGridOverride ?? "missing"}`]),
    ...(scenario.telemetry.renderer === "webgpu-grid-primary-v1" && scenario.telemetry.waterContext === "webgpu" && scenario.telemetry.renderMode === "webgpu"
      ? []
      : [`${scenario.id} did not finish on the primary WebGPU renderer`]),
    ...(scenario.telemetry.pressureActiveSeen ? [] : [`${scenario.id} never observed active pressure telemetry`]),
    ...(scenario.telemetry.particlesActiveSeen ? [] : [`${scenario.id} never observed active particle telemetry`]),
    ...(scenario.telemetry.couplingActiveSeen ? [] : [`${scenario.id} never observed active object-grid coupling`]),
    ...(scenario.telemetry.pressureNoFullGridReadback ? [] : [`${scenario.id} pressure path used full-grid readback`]),
    ...(scenario.telemetry.particlesNoFullGridReadback ? [] : [`${scenario.id} particle path used full-grid readback`]),
  ];
}

function outcomeReadoutFailures(scenario: FluidInstalledHighResolutionOperatorReadoutScenario): string[] {
  if (scenario.expectedOutcome === "floats-indefinitely") {
    return [
      ...(scenario.readouts.floatResult.includes("Floating") || scenario.readouts.floatResult.includes("Settled") || scenario.readouts.floatResult.includes("Indefinite")
        ? []
        : [`${scenario.id} float result did not read as a floating object`]),
      ...(scenario.readouts.predictedSink === "Indefinite" ? [] : [`${scenario.id} predicted sink readout was ${scenario.readouts.predictedSink}`]),
      ...(scenario.finalSnapshot.liveFloatDurationS !== null && scenario.finalSnapshot.liveFloatDurationS > 0
        ? []
        : [`${scenario.id} live float duration did not advance`]),
      ...(scenario.readouts.liveAfloat.includes("s") ? [] : [`${scenario.id} live afloat readout was ${scenario.readouts.liveAfloat}`]),
    ];
  }
  if (scenario.expectedOutcome === "sinks-immediately") {
    return [
      ...(scenario.readouts.floatResult.includes("Sinking") || scenario.readouts.floatResult.includes("Sank")
        ? []
        : [`${scenario.id} float result did not read as sinking or sank`]),
      ...(scenario.readouts.predictedSink === "Immediate" ? [] : [`${scenario.id} predicted sink readout was ${scenario.readouts.predictedSink}`]),
      ...(scenario.finalSnapshot.phase === "sinking" || scenario.finalSnapshot.phase === "sank"
        ? []
        : [`${scenario.id} final phase was ${scenario.finalSnapshot.phase}`]),
    ];
  }
  return [
    ...(scenario.readouts.floatResult.includes("Predicted") || scenario.readouts.floatResult.includes("Floating")
      ? []
      : [`${scenario.id} float result did not expose predicted or live waterlogging state`]),
    ...(scenario.readouts.predictedSink !== "Indefinite" && scenario.readouts.predictedSink !== "Immediate"
      ? []
      : [`${scenario.id} predicted waterlogging sink readout was ${scenario.readouts.predictedSink}`]),
    ...(scenario.finalSnapshot.secondsUntilSink !== null && scenario.finalSnapshot.secondsUntilSink > 60
      ? []
      : [`${scenario.id} final predicted sink seconds were ${scenario.finalSnapshot.secondsUntilSink ?? "missing"}`]),
  ];
}

function sampleSet(
  scenarios: FluidInstalledHighResolutionOperatorReadoutScenario[],
  mapper: (sample: InstalledHighResolutionReferencePacingSample) => string
): Set<string> {
  return new Set(scenarios.flatMap((scenario) => scenario.samples.map(mapper)));
}

function setEquals<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size !== right.size) return false;
  for (const entry of left) {
    if (!right.has(entry)) return false;
  }
  return true;
}
