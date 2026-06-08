import type { GridFluidCouplingForces } from "../physicsOcean";
import type { FluidFrameLoopStats } from "./fluidFrameLoop";
import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidWaterRenderStats, FluidWaterRuntimeGridDimensions } from "./fluidWaterRenderer";
import type {
  FluidReferenceCanvasTelemetry,
  FluidReferenceFrameLoopCaseStats,
  FluidReferenceOutcomeCase,
  FluidReferenceOutcomeCategory,
  FluidReferenceOutcomeComparison,
} from "./fluidUltraReferenceOutcomes";

export type FluidExperimentalReferenceOutcomesGate = "G-FG-40";

export type FluidExperimentalReferenceOutcomesReport = {
  capability: {
    grid: FluidWaterRuntimeGridDimensions;
    selectedTier: FluidGridTierId;
  } | null;
  cases: FluidReferenceOutcomeCase[];
  comparisons: FluidReferenceOutcomeComparison[];
  consumedCoupling: GridFluidCouplingForces | null;
  failures: string[];
  finalStats: FluidWaterRenderStats | null;
  frameLoop: FluidFrameLoopStats | null;
  gate: FluidExperimentalReferenceOutcomesGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  noFullGridReadbackPerFrame: boolean;
  pass: boolean;
  preferredTier: FluidGridTierId | "auto";
  runtimeGrid: FluidWaterRuntimeGridDimensions;
  runtimeGridOverride: FluidWaterRuntimeGridDimensions | null;
  selectedTier: FluidGridTierId;
  summary: {
    caseCount: number;
    categories: FluidReferenceOutcomeCategory[];
    comparisonCount: number;
    capabilityGrid: string;
    liveGrid: string;
    pressureForceBoundN: number;
  };
  telemetry: FluidReferenceCanvasTelemetry;
};

export type FluidExperimentalReferenceOutcomesOptions = {
  capability: FluidExperimentalReferenceOutcomesReport["capability"];
  cases: FluidReferenceOutcomeCase[];
  comparisons: FluidReferenceOutcomeComparison[];
  consoleErrors?: string[];
  consumedCoupling: GridFluidCouplingForces | null;
  finalStats: FluidWaterRenderStats | null;
  frameLoop: FluidFrameLoopStats | null;
  generatedAt?: string;
  launchMode: FluidExperimentalReferenceOutcomesReport["launchMode"];
  noFullGridReadbackPerFrame: boolean;
  pageErrors?: string[];
  preferredTier: FluidGridTierId | "auto";
  runtimeGrid: FluidWaterRuntimeGridDimensions;
  runtimeGridOverride: FluidWaterRuntimeGridDimensions | null;
  selectedTier: FluidGridTierId;
  telemetry: FluidReferenceCanvasTelemetry;
};

const expectedCapabilityGrid = { cellsX: 768, cellsY: 432 };
const expectedRuntimeGrid = { cellsX: 1024, cellsY: 576 };
const requiredComparisonIds = [
  "live-drop-speed-reference",
  "live-splash-height-reference",
  "live-ice-equilibrium-submerged-fraction-reference",
  "live-ice-hydrostatic-draft-error",
  "live-foam-settled-draft-error",
  "live-foam-settled-buoyancy-error",
  "live-foam-equilibrium-window",
  "live-concrete-terminal-speed-reference",
  "live-concrete-sink-phase",
  "live-leaky-drum-sink-time-ratio-reference",
];

const requiredCategories: FluidReferenceOutcomeCategory[] = ["damping", "drop", "float", "sink", "splash"];

export function createFluidExperimentalReferenceOutcomesReport(
  options: FluidExperimentalReferenceOutcomesOptions
): FluidExperimentalReferenceOutcomesReport {
  const comparisonIds = new Set(options.comparisons.map((comparisonEntry) => comparisonEntry.id));
  const comparisonCategories = new Set(options.comparisons.map((comparisonEntry) => comparisonEntry.category));
  const dropCase = options.cases.find((entry) => entry.id === "live-concrete-drop-splash-pressure");
  const activeFrameLoops = options.cases.map((entry) => entry.frameLoop).filter((entry): entry is FluidReferenceFrameLoopCaseStats => Boolean(entry));
  const capabilityGrid = gridLabel(options.capability?.grid ?? { cellsX: 0, cellsY: 0 });
  const liveGrid = gridLabel(options.runtimeGrid);
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.preferredTier === "ultra" ? [] : [`preferred tier must be ultra, got ${options.preferredTier}`]),
    ...(options.selectedTier === "ultra" ? [] : [`selected tier must be ultra, got ${options.selectedTier}`]),
    ...(options.capability?.selectedTier === "ultra" ? [] : [`capability selected tier must be ultra, got ${options.capability?.selectedTier ?? "missing"}`]),
    ...gridFailures("capability grid", options.capability?.grid ?? { cellsX: 0, cellsY: 0 }, expectedCapabilityGrid),
    ...(options.runtimeGridOverride ? [] : ["experimental runtime grid override was missing"]),
    ...(options.runtimeGridOverride ? gridFailures("runtime grid override", options.runtimeGridOverride, expectedRuntimeGrid) : []),
    ...gridFailures("live renderer grid", options.runtimeGrid, expectedRuntimeGrid),
    ...requiredComparisonIds.flatMap((id) => (comparisonIds.has(id) ? [] : [`missing reference comparison ${id}`])),
    ...requiredCategories.flatMap((category) => (comparisonCategories.has(category) ? [] : [`missing reference category ${category}`])),
    ...options.comparisons.flatMap((entry) =>
      entry.pass && Number.isFinite(entry.actual) && entry.actual >= entry.expected.min && entry.actual <= entry.expected.max
        ? []
        : [`${entry.id} expected ${entry.expected.min}..${entry.expected.max} ${entry.unit}, got ${entry.actual}`]
    ),
    ...options.cases.flatMap((entry) => (entry.pass ? [] : [`${entry.id} failed`])),
    ...options.cases.flatMap((entry) => failuresForTelemetry(entry.id, entry.telemetry, liveGrid)),
    ...failuresForTelemetry("final", options.telemetry, liveGrid),
    ...(dropCase?.telemetry.pressureActive ? [] : ["pressure feedback never became active during concrete drop"]),
    ...(dropCase?.telemetry.particlesActive ? [] : ["particle splash feedback never became active during concrete drop"]),
    ...(dropCase?.consumedCoupling?.active ? [] : ["combined grid coupling never became active during concrete drop"]),
    ...(dropCase?.stats?.lastPressure?.noFullGridReadbackPerFrame ? [] : ["pressure path used full-grid readback during concrete drop"]),
    ...(options.finalStats?.tier === "ultra" ? [] : [`final renderer stats tier must be ultra, got ${options.finalStats?.tier ?? "missing"}`]),
    ...(options.finalStats ? gridFailures("final renderer stats grid", { cellsX: options.finalStats.gridCellsX, cellsY: options.finalStats.gridCellsY }, expectedRuntimeGrid) : ["final renderer stats were missing"]),
    ...(options.noFullGridReadbackPerFrame ? [] : ["report did not preserve no-full-grid-readback telemetry"]),
    ...(activeFrameLoops.length >= 4 ? [] : ["active drop cases did not record frame-loop stats"]),
    ...activeFrameLoops.flatMap(failuresForFrameLoop),
    ...(options.consoleErrors ?? []).map((entry) => `console error: ${entry}`),
    ...(options.pageErrors ?? []).map((entry) => `page error: ${entry}`),
  ];

  return {
    capability: options.capability,
    cases: options.cases,
    comparisons: options.comparisons,
    consumedCoupling: options.consumedCoupling,
    failures,
    finalStats: options.finalStats,
    frameLoop: options.frameLoop,
    gate: "G-FG-40",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    noFullGridReadbackPerFrame: options.noFullGridReadbackPerFrame,
    pass: failures.length === 0,
    preferredTier: options.preferredTier,
    runtimeGrid: options.runtimeGrid,
    runtimeGridOverride: options.runtimeGridOverride,
    selectedTier: options.selectedTier,
    summary: {
      capabilityGrid,
      caseCount: options.cases.length,
      categories: Array.from(comparisonCategories).sort() as FluidReferenceOutcomeCategory[],
      comparisonCount: options.comparisons.length,
      liveGrid,
      pressureForceBoundN: options.telemetry.forceBoundN,
    },
    telemetry: options.telemetry,
  };
}

function failuresForTelemetry(label: string, telemetry: FluidReferenceCanvasTelemetry, liveGrid: string): string[] {
  return [
    ...(telemetry.renderer === "webgpu-grid-primary-v1" ? [] : [`${label} renderer was ${telemetry.renderer ?? "missing"}`]),
    ...(telemetry.waterContext === "webgpu" ? [] : [`${label} water context was ${telemetry.waterContext ?? "missing"}`]),
    ...(telemetry.tier === "ultra" ? [] : [`${label} telemetry tier was ${telemetry.tier ?? "missing"}`]),
    ...(telemetry.grid === liveGrid ? [] : [`${label} telemetry grid was ${telemetry.grid ?? "missing"}`]),
    ...(telemetry.pressure === "bounded-pressure-gradient-live-v1" ? [] : [`${label} pressure solver was ${telemetry.pressure ?? "missing"}`]),
    ...(telemetry.noFullGridReadbackPerFrame ? [] : [`${label} pressure path used full-grid readback`]),
    ...(telemetry.particlesNoFullGridReadbackPerFrame === true ? [] : [`${label} particle path used full-grid readback`]),
  ];
}

function failuresForFrameLoop(entry: FluidReferenceFrameLoopCaseStats): string[] {
  return [
    ...(entry.fixedStepS === 1 / 120 ? [] : [`frame loop for ${entry.caseId} did not report 120 Hz fixed physics step`]),
    ...(entry.totalSubsteps > 0 ? [] : [`frame loop for ${entry.caseId} did not advance physics substeps`]),
    ...(entry.maxSubstepsObserved <= entry.maxSubstepsPerFrame ? [] : [`frame loop for ${entry.caseId} exceeded max substeps`]),
    ...(entry.droppedDebtS === 0 ? [] : [`frame loop for ${entry.caseId} dropped simulation debt ${entry.droppedDebtS}`]),
  ];
}

function gridFailures(label: string, actual: FluidWaterRuntimeGridDimensions, expected: FluidWaterRuntimeGridDimensions): string[] {
  return actual.cellsX === expected.cellsX && actual.cellsY === expected.cellsY
    ? []
    : [`${label} must be ${expected.cellsX} x ${expected.cellsY}, got ${actual.cellsX} x ${actual.cellsY}`];
}

function gridLabel(grid: FluidWaterRuntimeGridDimensions): string {
  return `${grid.cellsX}x${grid.cellsY}`;
}
