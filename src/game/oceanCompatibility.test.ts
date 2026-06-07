import { describe, expect, it } from "vitest";
import { createOceanCompatibilityReport, type OceanBenchmarkReport } from "./oceanCompatibility";
import type { OceanVisualCalibrationReport } from "./oceanVisualCalibration";

const benchmark: OceanBenchmarkReport = {
  generatedAt: "2026-06-07T00:00:00.000Z",
  previewUrl: "http://127.0.0.1:5000",
  samplesPerCase: 8,
  results: [
    benchmarkCase("default-desktop", "shader-mesh-v2", "balanced", 0.72, 38, 30, 24),
    benchmarkCase("compact-desktop", "shader-mesh-v2", "balanced", 0.72, 55, 30, 29, 900, 700),
    benchmarkCase("low-power", "low-power-graphics-v2", "low", 0.5, 28, 24, 13),
    benchmarkCase("compact-low-power", "low-power-graphics-v2", "low", 0.5, 29, 24, 24, 900, 700),
  ],
};

const visual = {
  generatedAt: "2026-06-07T00:01:00.000Z",
  decision: { recommendation: "calibrated-pixi-water", reason: "ok" },
  fieldSignals: { depthContrast: 0.515, pass: true },
  liveMapSurface: { status: "passed" },
  routeRiskReadability: { pass: true, riskSpread: 0.439 },
} as OceanVisualCalibrationReport;

describe("ocean compatibility report", () => {
  it("passes when desktop, low-power, canvas, runtime, fallback, and readability evidence are all healthy", () => {
    const report = createOceanCompatibilityReport({ benchmark, visual, generatedAt: "2026-06-07T00:02:00.000Z" });

    expect(report.schema).toBe(1);
    expect(report.cases).toHaveLength(4);
    expect(report.gates.desktopPerformance.pass).toBe(true);
    expect(report.gates.lowPowerPerformance.pass).toBe(true);
    expect(report.gates.canvasHealth.pass).toBe(true);
    expect(report.gates.runtimeConsoleHealth.pass).toBe(true);
    expect(report.gates.fallbackIntentional.pass).toBe(true);
    expect(report.gates.readability.pass).toBe(true);
    expect(report.gates.visualCalibration.pass).toBe(true);
    expect(report.gates.all.pass).toBe(true);
    expect(report.decision.recommendation).toBe("ocean-compatible-v2");
  });

  it("fails if low-power fallback is visually broken or not cheaper", () => {
    const broken = cloneBenchmark();
    const low = broken.results.find((entry) => entry.id === "low-power");
    if (!low) throw new Error("missing low-power case");
    low.pixelColors = 5;
    low.renderScale = "0.72";

    const report = createOceanCompatibilityReport({ benchmark: broken, visual });

    expect(report.gates.canvasHealth.pass).toBe(false);
    expect(report.gates.fallbackIntentional.pass).toBe(false);
    expect(report.decision.recommendation).toBe("needs-ocean-compatibility-work");
  });

  it("fails if console or runtime health evidence regresses", () => {
    const noisy = cloneBenchmark();
    const desktop = noisy.results.find((entry) => entry.id === "default-desktop");
    if (!desktop) throw new Error("missing default case");
    desktop.consoleErrorCount = 1;
    desktop.runtimeHealthFinal = "RuntimeDirty";

    const report = createOceanCompatibilityReport({ benchmark: noisy, visual });

    expect(report.gates.runtimeConsoleHealth.pass).toBe(false);
    expect(report.gates.all.pass).toBe(false);
  });
});

function benchmarkCase(
  id: string,
  renderer: string,
  quality: string,
  scale: number,
  averageFps: number,
  minAverageFps: number,
  pixelColors: number,
  width = 1440,
  height = 920
): OceanBenchmarkReport["results"][number] {
  return {
    id,
    url: `http://127.0.0.1:5000/?verify=${id}`,
    minAverageFps,
    viewport: { width, height, deviceScaleFactor: 1 },
    runtimeHealthInitial: "RuntimeClean",
    runtimeHealthFinal: "RuntimeClean",
    consoleErrorCount: 0,
    pageErrorCount: 0,
    renderQuality: quality,
    renderScale: String(scale),
    renderFps: Math.round(averageFps),
    renderFpsAvg: averageFps,
    renderFpsMin: Math.max(1, Math.floor(averageFps - 10)),
    renderFpsMax: Math.ceil(averageFps + 3),
    renderFpsRecentAvg: averageFps,
    renderFpsSamples: 8,
    renderFpsStability: "stable",
    renderFpsTarget: renderer === "shader-mesh-v2" ? 60 : 30,
    renderFpsContext: "foreground",
    renderAdaptiveFallback: "none",
    renderAdaptiveReason: null,
    waterRenderer: renderer,
    pixelStatus: "nonblank",
    pixelVariety: "varied",
    pixelSamples: 144,
    pixelColors,
  };
}

function cloneBenchmark(): OceanBenchmarkReport {
  return JSON.parse(JSON.stringify(benchmark)) as OceanBenchmarkReport;
}
