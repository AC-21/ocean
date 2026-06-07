import type { OceanVisualCalibrationReport } from "./oceanVisualCalibration";

export type OceanBenchmarkReport = {
  generatedAt: string;
  previewUrl: string;
  samplesPerCase: number;
  results: OceanBenchmarkCase[];
};

export type OceanBenchmarkCase = {
  id: string;
  url: string;
  minAverageFps: number;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  runtimeHealthInitial?: string;
  runtimeHealthFinal?: string;
  consoleErrorCount?: number;
  pageErrorCount?: number;
  renderQuality: string;
  renderScale: string;
  renderFps: number;
  renderFpsAvg: number;
  renderFpsMin: number;
  renderFpsMax: number;
  renderFpsRecentAvg: number;
  renderFpsSamples: number;
  renderFpsStability: string;
  renderFpsTarget: number;
  renderFpsContext: string;
  renderAdaptiveFallback: string | null;
  renderAdaptiveReason: string | null;
  waterRenderer: string;
  pixelStatus: string;
  pixelVariety: string;
  pixelSamples: number;
  pixelColors: number;
};

export type OceanCompatibilityReportOptions = {
  benchmark: OceanBenchmarkReport;
  benchmarkSource?: string;
  generatedAt?: string;
  visual: OceanVisualCalibrationReport;
  visualSource?: string;
};

export type OceanCompatibilityGate = {
  pass: boolean;
  metric: number | string;
  threshold: string;
};

export type OceanCompatibilityCaseSummary = {
  id: string;
  averageFps: number;
  fpsHeadroom: number;
  renderer: string;
  quality: string;
  renderScale: number;
  pixelColors: number;
  pixelStatus: string;
  pixelVariety: string;
  runtimeHealth: string;
  consoleErrorCount: number;
  pageErrorCount: number;
  pass: boolean;
};

export type OceanCompatibilityReport = {
  schema: 1;
  generatedAt: string;
  sources: {
    benchmark: string | null;
    visual: string | null;
  };
  inputs: {
    benchmarkGeneratedAt: string;
    visualGeneratedAt: string;
    previewUrl: string;
    samplesPerCase: number;
    renderers: string[];
  };
  cases: OceanCompatibilityCaseSummary[];
  fallback: {
    desktopScaleReduction: number;
    compactScaleReduction: number;
    desktopColorReduction: number;
    compactColorReduction: number;
    lowPowerAverageFps: number;
    compactLowPowerAverageFps: number;
    status: "intentional" | "needs-work";
  };
  gates: {
    desktopPerformance: OceanCompatibilityGate;
    lowPowerPerformance: OceanCompatibilityGate;
    canvasHealth: OceanCompatibilityGate;
    runtimeConsoleHealth: OceanCompatibilityGate;
    fallbackIntentional: OceanCompatibilityGate;
    readability: OceanCompatibilityGate;
    visualCalibration: OceanCompatibilityGate;
    all: OceanCompatibilityGate;
  };
  decision: {
    recommendation: "ocean-compatible-v2" | "needs-ocean-compatibility-work";
    reason: string;
  };
  nextSteps: string[];
};

const requiredCases = ["default-desktop", "compact-desktop", "low-power", "compact-low-power"] as const;

export function createOceanCompatibilityReport(options: OceanCompatibilityReportOptions): OceanCompatibilityReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const cases = requiredCases.map((id) => summarizeCase(caseById(options.benchmark, id)));
  const fallback = summarizeFallback(options.benchmark);
  const gates = summarizeGates(cases, fallback, options.visual);
  const failed = failedGateNames(gates);

  return {
    schema: 1,
    generatedAt,
    sources: {
      benchmark: options.benchmarkSource ?? null,
      visual: options.visualSource ?? null,
    },
    inputs: {
      benchmarkGeneratedAt: options.benchmark.generatedAt,
      visualGeneratedAt: options.visual.generatedAt,
      previewUrl: options.benchmark.previewUrl,
      samplesPerCase: options.benchmark.samplesPerCase,
      renderers: [...new Set(options.benchmark.results.map((entry) => entry.waterRenderer))].sort(),
    },
    cases,
    fallback,
    gates,
    decision: {
      recommendation: gates.all.pass ? "ocean-compatible-v2" : "needs-ocean-compatibility-work",
      reason: gates.all.pass
        ? "Desktop shader water v2 and low-power fallback water v2 meet FPS, canvas, runtime, console, readability, and fallback-intent gates."
        : `Ocean compatibility still needs work; failed gates: ${failed}.`,
    },
    nextSteps: gates.all.pass
      ? [
          "Keep this gate paired with ocean benchmark and visual calibration after renderer, water, or map changes.",
          "Reopen compatibility work if final production assets reduce the low-power FPS or canvas variety margin.",
        ]
      : ["Refresh npm run ocean:benchmark and npm run ocean:visual-calibration, then rerun npm run ocean:compatibility."],
  };
}

function summarizeCase(entry: OceanBenchmarkCase): OceanCompatibilityCaseSummary {
  const runtimeHealth = normalizeRuntimeHealth(entry.runtimeHealthFinal ?? entry.runtimeHealthInitial ?? "unknown");
  const consoleErrorCount = entry.consoleErrorCount ?? 0;
  const pageErrorCount = entry.pageErrorCount ?? 0;
  const pass =
    entry.renderFpsAvg >= entry.minAverageFps &&
    entry.pixelStatus === "nonblank" &&
    entry.pixelVariety === "varied" &&
    entry.pixelColors >= 10 &&
    runtimeHealth === "RuntimeClean" &&
    consoleErrorCount === 0 &&
    pageErrorCount === 0 &&
    entry.renderFpsStability !== "unstable" &&
    entry.renderFpsContext === "foreground";

  return {
    id: entry.id,
    averageFps: entry.renderFpsAvg,
    fpsHeadroom: round(entry.renderFpsAvg - entry.minAverageFps, 1),
    renderer: entry.waterRenderer,
    quality: entry.renderQuality,
    renderScale: Number(entry.renderScale),
    pixelColors: entry.pixelColors,
    pixelStatus: entry.pixelStatus,
    pixelVariety: entry.pixelVariety,
    runtimeHealth,
    consoleErrorCount,
    pageErrorCount,
    pass,
  };
}

function summarizeFallback(benchmark: OceanBenchmarkReport): OceanCompatibilityReport["fallback"] {
  const desktop = caseById(benchmark, "default-desktop");
  const compact = caseById(benchmark, "compact-desktop");
  const lowPower = caseById(benchmark, "low-power");
  const compactLowPower = caseById(benchmark, "compact-low-power");
  const desktopScaleReduction = round(Number(desktop.renderScale) - Number(lowPower.renderScale), 2);
  const compactScaleReduction = round(Number(compact.renderScale) - Number(compactLowPower.renderScale), 2);
  const desktopColorReduction = desktop.pixelColors - lowPower.pixelColors;
  const compactColorReduction = compact.pixelColors - compactLowPower.pixelColors;
  const intentional =
    lowPower.waterRenderer === "low-power-graphics-v2" &&
    compactLowPower.waterRenderer === "low-power-graphics-v2" &&
    lowPower.renderQuality === "low" &&
    compactLowPower.renderQuality === "low" &&
    desktopScaleReduction > 0 &&
    compactScaleReduction > 0 &&
    desktopColorReduction >= 0 &&
    compactColorReduction >= 0 &&
    lowPower.pixelColors >= 10 &&
    compactLowPower.pixelColors >= 10;

  return {
    desktopScaleReduction,
    compactScaleReduction,
    desktopColorReduction,
    compactColorReduction,
    lowPowerAverageFps: lowPower.renderFpsAvg,
    compactLowPowerAverageFps: compactLowPower.renderFpsAvg,
    status: intentional ? "intentional" : "needs-work",
  };
}

function summarizeGates(
  cases: OceanCompatibilityCaseSummary[],
  fallback: OceanCompatibilityReport["fallback"],
  visual: OceanVisualCalibrationReport
): OceanCompatibilityReport["gates"] {
  const desktopCases = cases.filter((entry) => entry.id === "default-desktop" || entry.id === "compact-desktop");
  const lowPowerCases = cases.filter((entry) => entry.id === "low-power" || entry.id === "compact-low-power");
  const gates = {
    desktopPerformance: gate(
      desktopCases.every((entry) => entry.averageFps >= (entry.id === "default-desktop" ? 30 : 30) && entry.renderer === "shader-mesh-v2"),
      desktopCases.map((entry) => `${entry.id}:${entry.averageFps}`).join(", "),
      "desktop and compact shader v2 cases average at least 30 FPS"
    ),
    lowPowerPerformance: gate(
      lowPowerCases.every((entry) => entry.averageFps >= 24 && entry.renderer === "low-power-graphics-v2"),
      lowPowerCases.map((entry) => `${entry.id}:${entry.averageFps}`).join(", "),
      "low-power cases average at least 24 FPS with low-power renderer v2"
    ),
    canvasHealth: gate(
      cases.every((entry) => entry.pixelStatus === "nonblank" && entry.pixelVariety === "varied" && entry.pixelColors >= 10),
      cases.map((entry) => `${entry.id}:${entry.pixelStatus}/${entry.pixelVariety}/${entry.pixelColors}`).join(", "),
      "every case is nonblank, varied, and has at least 10 color buckets"
    ),
    runtimeConsoleHealth: gate(
      cases.every((entry) => entry.runtimeHealth === "RuntimeClean" && entry.consoleErrorCount === 0 && entry.pageErrorCount === 0),
      cases.map((entry) => `${entry.id}:${entry.runtimeHealth}/${entry.consoleErrorCount}/${entry.pageErrorCount}`).join(", "),
      "every case reports RuntimeClean, zero console errors, and zero page errors"
    ),
    fallbackIntentional: gate(
      fallback.status === "intentional",
      `scale ${fallback.desktopScaleReduction}/${fallback.compactScaleReduction}, colors ${fallback.desktopColorReduction}/${fallback.compactColorReduction}`,
      "low-power water uses lower render scale and no higher visual complexity while staying varied"
    ),
    readability: gate(
      visual.routeRiskReadability.pass && visual.routeRiskReadability.riskSpread >= 0.28 && visual.fieldSignals.depthContrast >= 0.28,
      `risk ${visual.routeRiskReadability.riskSpread}, depth ${visual.fieldSignals.depthContrast}`,
      "visual route-risk spread and depth contrast remain readable"
    ),
    visualCalibration: gate(
      visual.decision.recommendation === "calibrated-pixi-water" && visual.liveMapSurface.status === "passed",
      `${visual.decision.recommendation}/${visual.liveMapSurface.status}`,
      "visual calibration is calibrated-pixi-water with passed live surface"
    ),
    all: gate(false, "pending", "all compatibility gates pass"),
  };
  gates.all = gate(
    Object.entries(gates)
      .filter(([key]) => key !== "all")
      .every(([, value]) => value.pass),
    failedGateNames(gates) || "all passed",
    "all compatibility gates pass"
  );
  return gates;
}

function caseById(benchmark: OceanBenchmarkReport, id: string): OceanBenchmarkCase {
  const entry = benchmark.results.find((result) => result.id === id);
  if (!entry) throw new Error(`Benchmark case missing: ${id}`);
  return entry;
}

function failedGateNames(gates: Omit<OceanCompatibilityReport["gates"], "all"> | OceanCompatibilityReport["gates"]) {
  return Object.entries(gates)
    .filter(([key, value]) => key !== "all" && !value.pass)
    .map(([key]) => key)
    .join(", ");
}

function gate(pass: boolean, metric: number | string, threshold: string): OceanCompatibilityGate {
  return { pass, metric, threshold };
}

function normalizeRuntimeHealth(value: string) {
  return value.replace(/\s+/g, "").toLowerCase() === "runtimeclean" ? "RuntimeClean" : value.replace(/\s+/g, " ").trim();
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
