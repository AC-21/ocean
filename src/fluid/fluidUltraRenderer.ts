import {
  createFluidDisplayPacingReport,
  type FluidDisplayPacingReport,
  type FluidDisplayPacingScenarioInput,
  type DisplayPacingThresholds,
} from "./fluidDisplayPacing";
import type { FluidGridTierId } from "./fluidGridContract";

export type FluidUltraRendererGate = "G-FG-21";

export type FluidUltraRendererReport = {
  displayPacing: FluidDisplayPacingReport;
  failures: string[];
  gate: FluidUltraRendererGate;
  generatedAt: string;
  launchMode: "electron-source" | "packaged-app";
  pass: boolean;
  preferredTier: FluidGridTierId | "auto";
  selectedGrid: {
    cellsX: number;
    cellsY: number;
  };
  selectedTier: FluidGridTierId;
  summary: {
    maxP95FrameMs: number;
    maxP99FrameMs: number;
    scenarioCount: number;
    worstDroppedFrameRatio: number;
  };
};

export type FluidUltraRendererOptions = {
  generatedAt?: string;
  launchMode: FluidUltraRendererReport["launchMode"];
  preferredTier: FluidUltraRendererReport["preferredTier"];
  scenarios: FluidDisplayPacingScenarioInput[];
  selectedGrid: FluidUltraRendererReport["selectedGrid"];
  selectedTier: FluidGridTierId;
  thresholds?: Partial<DisplayPacingThresholds>;
};

export function createFluidUltraRendererReport(options: FluidUltraRendererOptions): FluidUltraRendererReport {
  const displayPacing = createFluidDisplayPacingReport({
    generatedAt: options.generatedAt,
    launchMode: options.launchMode,
    scenarios: options.scenarios,
    thresholds: options.thresholds,
  });
  const observedTiers = new Set(options.scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.tier).filter(Boolean)));
  const failures = [
    ...(displayPacing.failures.length > 0 ? displayPacing.failures.map((failure) => `display pacing: ${failure}`) : []),
    ...(options.preferredTier === "ultra" ? [] : [`preferred tier must be ultra, got ${options.preferredTier}`]),
    ...(options.selectedTier === "ultra" ? [] : [`selected tier must be ultra, got ${options.selectedTier}`]),
    ...(options.selectedGrid.cellsX === 768 && options.selectedGrid.cellsY === 432
      ? []
      : [`selected grid must be 768 x 432, got ${options.selectedGrid.cellsX} x ${options.selectedGrid.cellsY}`]),
    ...(observedTiers.size === 1 && observedTiers.has("ultra") ? [] : [`display samples did not all observe ultra tier: ${Array.from(observedTiers).join(", ") || "none"}`]),
  ];

  return {
    displayPacing,
    failures,
    gate: "G-FG-21",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    launchMode: options.launchMode,
    pass: failures.length === 0,
    preferredTier: options.preferredTier,
    selectedGrid: options.selectedGrid,
    selectedTier: options.selectedTier,
    summary: {
      maxP95FrameMs: displayPacing.summary.maxP95FrameMs,
      maxP99FrameMs: displayPacing.summary.maxP99FrameMs,
      scenarioCount: displayPacing.summary.scenarioCount,
      worstDroppedFrameRatio: displayPacing.summary.worstDroppedFrameRatio,
    },
  };
}
