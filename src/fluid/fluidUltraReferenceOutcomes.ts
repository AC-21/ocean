import type { OceanPhysicsLiveSnapshot } from "../OceanPhysicsApp";
import type { FluidFrameLoopStats } from "./fluidFrameLoop";
import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidWaterRenderStats } from "./fluidWaterRenderer";
import type { GridFluidCouplingForces } from "../physicsOcean";

export type FluidUltraReferenceOutcomeGate = "G-FG-22";
export type FluidReferenceOutcomeCategory = "damping" | "drop" | "float" | "sink" | "splash";

export type FluidReferenceOutcomeComparison = {
  actual: number;
  category: FluidReferenceOutcomeCategory;
  expected: {
    min: number;
    max: number;
  };
  id: string;
  pass: boolean;
  unit: string;
};

export type FluidReferenceCanvasTelemetry = {
  forceBoundN: number;
  frames: number;
  grid: string | null;
  noFullGridReadbackPerFrame: boolean;
  particles: string | null;
  particlesActive: boolean;
  pressure: string | null;
  pressureActive: boolean;
  renderer: string | null;
  status: string | null;
  tier: string | null;
  verticalPressureForceN: number;
  waterContext: string | null;
};

export type FluidReferenceFrameLoopCaseStats = FluidFrameLoopStats & {
  caseId: string;
};

export type FluidReferenceOutcomeCase = {
  category: FluidReferenceOutcomeCategory | "drop+splash";
  consumedCoupling?: GridFluidCouplingForces | null;
  frameLoop?: FluidReferenceFrameLoopCaseStats | null;
  id: string;
  largeLeakSecondsUntilSink?: number | null;
  pass: boolean;
  smallLeakSecondsUntilSink?: number | null;
  snapshot: OceanPhysicsLiveSnapshot;
  stats?: FluidWaterRenderStats | null;
  telemetry: FluidReferenceCanvasTelemetry;
};

export type FluidUltraReferenceOutcomesReport = {
  capability: {
    grid: {
      cellsX: number;
      cellsY: number;
    };
    selectedTier: FluidGridTierId;
  } | null;
  cases: FluidReferenceOutcomeCase[];
  comparisons: FluidReferenceOutcomeComparison[];
  consumedCoupling: GridFluidCouplingForces | null;
  failures: string[];
  finalStats: FluidWaterRenderStats | null;
  frameLoop: FluidFrameLoopStats | null;
  gate: FluidUltraReferenceOutcomeGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  noFullGridReadbackPerFrame: boolean;
  pass: boolean;
  preferredTier: FluidGridTierId | "auto";
  selectedGrid: {
    cellsX: number;
    cellsY: number;
  };
  selectedTier: FluidGridTierId;
  summary: {
    caseCount: number;
    categories: FluidReferenceOutcomeCategory[];
    comparisonCount: number;
    liveGrid: string;
    pressureForceBoundN: number;
  };
  telemetry: FluidReferenceCanvasTelemetry;
};

export type FluidUltraReferenceOutcomesOptions = {
  capability: FluidUltraReferenceOutcomesReport["capability"];
  cases: FluidReferenceOutcomeCase[];
  comparisons: FluidReferenceOutcomeComparison[];
  consoleErrors?: string[];
  consumedCoupling: GridFluidCouplingForces | null;
  finalStats: FluidWaterRenderStats | null;
  frameLoop: FluidFrameLoopStats | null;
  generatedAt?: string;
  launchMode: FluidUltraReferenceOutcomesReport["launchMode"];
  noFullGridReadbackPerFrame: boolean;
  pageErrors?: string[];
  preferredTier: FluidGridTierId | "auto";
  selectedGrid: FluidUltraReferenceOutcomesReport["selectedGrid"];
  selectedTier: FluidGridTierId;
  telemetry: FluidReferenceCanvasTelemetry;
};

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

export function createFluidUltraReferenceOutcomesReport(options: FluidUltraReferenceOutcomesOptions): FluidUltraReferenceOutcomesReport {
  const comparisonIds = new Set(options.comparisons.map((comparisonEntry) => comparisonEntry.id));
  const comparisonCategories = new Set(options.comparisons.map((comparisonEntry) => comparisonEntry.category));
  const dropCase = options.cases.find((entry) => entry.id === "live-concrete-drop-splash-pressure");
  const activeFrameLoops = options.cases.map((entry) => entry.frameLoop).filter((entry): entry is FluidReferenceFrameLoopCaseStats => entry !== null && entry !== undefined);
  const liveGrid = `${options.selectedGrid.cellsX}x${options.selectedGrid.cellsY}`;
  const failures = [
    ...(options.launchMode === "packaged-app" ? [] : [`launch mode must be packaged-app, got ${options.launchMode}`]),
    ...(options.preferredTier === "ultra" ? [] : [`preferred tier must be ultra, got ${options.preferredTier}`]),
    ...(options.selectedTier === "ultra" ? [] : [`selected tier must be ultra, got ${options.selectedTier}`]),
    ...(options.selectedGrid.cellsX === 768 && options.selectedGrid.cellsY === 432
      ? []
      : [`selected grid must be 768 x 432, got ${options.selectedGrid.cellsX} x ${options.selectedGrid.cellsY}`]),
    ...(options.capability?.selectedTier === "ultra" ? [] : [`capability selected tier must be ultra, got ${options.capability?.selectedTier ?? "missing"}`]),
    ...(options.capability?.grid.cellsX === 768 && options.capability.grid.cellsY === 432 ? [] : ["capability grid must be 768 x 432."]),
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
    ...(options.finalStats?.gridCellsX === 768 && options.finalStats.gridCellsY === 432 ? [] : ["final renderer stats grid must be 768 x 432."]),
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
    gate: "G-FG-22",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    noFullGridReadbackPerFrame: options.noFullGridReadbackPerFrame,
    pass: failures.length === 0,
    preferredTier: options.preferredTier,
    selectedGrid: options.selectedGrid,
    selectedTier: options.selectedTier,
    summary: {
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
