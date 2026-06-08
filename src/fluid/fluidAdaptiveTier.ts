import type { FluidGridTierId } from "./fluidGridContract";
import type { FluidResolutionScalingReport } from "./fluidResolutionScaling";
import type { FluidUltraReferenceOutcomesReport } from "./fluidUltraReferenceOutcomes";
import type { FluidUltraRendererReport } from "./fluidUltraRenderer";

export type FluidAdaptiveTierGate = "G-FG-23";
export type FluidRuntimeTierRequest = FluidGridTierId | "auto" | "default";
export type FluidRuntimeTierSelectionMode = "auto-fallback-high" | "calibrated-auto" | "default-high" | "explicit";

export type FluidRuntimeTierSelection = {
  calibratedTier?: FluidGridTierId;
  mode: FluidRuntimeTierSelectionMode;
  preferredTier: FluidGridTierId;
  reason: string;
  requestedTier: FluidRuntimeTierRequest;
};

export type FluidAdaptiveTierThresholds = {
  maxDroppedFrameRatio: number;
  maxEstimatedStorageBytes: number;
  maxLiveP95FrameMs: number;
  maxLiveP99FrameMs: number;
  maxUltraGpuP95StepMs: number;
  maxUltraToHighGpuP95Ratio: number;
};

export type FluidAdaptiveTierRecommendation = {
  failures: string[];
  reason: string;
  selectedTier: FluidGridTierId;
  summary: {
    maxEstimatedStorageBytes: number;
    maxLiveP95FrameMs: number | null;
    maxLiveP99FrameMs: number | null;
    maxUltraGpuP95StepMs: number | null;
    maxUltraToHighGpuP95Ratio: number | null;
    referenceCategories: string[];
  };
};

export type FluidAdaptiveTierRuntimeProbe = {
  grid: string | null;
  launchMode: "electron-source" | "packaged-app";
  renderer: string | null;
  requestedTier: FluidRuntimeTierRequest;
  selectedGrid: {
    cellsX: number;
    cellsY: number;
  };
  selectedTier: FluidGridTierId;
  selection: FluidRuntimeTierSelection | null;
  tier: string | null;
  waterContext: string | null;
  waterFrames: number;
};

export type FluidAdaptiveTierReport = {
  failures: string[];
  gate: FluidAdaptiveTierGate;
  generatedAt: string;
  pass: boolean;
  recommendation: FluidAdaptiveTierRecommendation;
  runtimeProbe: FluidAdaptiveTierRuntimeProbe;
  sources: {
    resolutionScaling: Pick<FluidResolutionScalingReport, "gate" | "pass" | "summary">;
    ultraReference: Pick<FluidUltraReferenceOutcomesReport, "gate" | "pass" | "selectedTier" | "summary">;
    ultraRenderer: Pick<FluidUltraRendererReport, "gate" | "pass" | "selectedTier" | "summary">;
  };
  thresholds: FluidAdaptiveTierThresholds;
};

export type FluidAdaptiveTierOptions = {
  generatedAt?: string;
  resolutionScaling: FluidResolutionScalingReport;
  runtimeProbe: FluidAdaptiveTierRuntimeProbe;
  thresholds?: Partial<FluidAdaptiveTierThresholds>;
  ultraReference: FluidUltraReferenceOutcomesReport;
  ultraRenderer: FluidUltraRendererReport;
};

export const defaultAdaptiveTierThresholds: FluidAdaptiveTierThresholds = {
  maxDroppedFrameRatio: 0.01,
  maxEstimatedStorageBytes: 32 * 1024 * 1024,
  maxLiveP95FrameMs: 1000 / 60,
  maxLiveP99FrameMs: 20,
  maxUltraGpuP95StepMs: 1,
  maxUltraToHighGpuP95Ratio: 3,
};

export function fluidRuntimeTierSelectionFromSearch(search: string): FluidRuntimeTierSelection {
  const params = new URLSearchParams(search);
  const requestedTier = fluidTierIdFrom(params.get("fluidTier"));
  const calibratedTier = fluidTierIdFrom(params.get("calibratedFluidTier"));
  if (requestedTier && requestedTier !== "auto") {
    return {
      calibratedTier: calibratedTier === "auto" ? undefined : calibratedTier,
      mode: "explicit",
      preferredTier: requestedTier,
      reason: "explicit tier override",
      requestedTier,
    };
  }
  if (requestedTier === "auto" && calibratedTier && calibratedTier !== "auto") {
    return {
      calibratedTier,
      mode: "calibrated-auto",
      preferredTier: calibratedTier,
      reason: "local calibration selected tier",
      requestedTier: "auto",
    };
  }
  if (requestedTier === "auto") {
    return {
      mode: "auto-fallback-high",
      preferredTier: "high",
      reason: "auto requested without valid calibration",
      requestedTier: "auto",
    };
  }
  return {
    mode: "default-high",
    preferredTier: "high",
    reason: "default high tier until local calibration is available",
    requestedTier: "default",
  };
}

export function fluidTierIdFrom(value: string | null | undefined): FluidGridTierId | "auto" | undefined {
  return value === "low" || value === "standard" || value === "high" || value === "ultra" || value === "auto" ? value : undefined;
}

export function recommendAdaptiveFluidTier(options: {
  resolutionScaling: FluidResolutionScalingReport;
  thresholds?: Partial<FluidAdaptiveTierThresholds>;
  ultraReference: FluidUltraReferenceOutcomesReport;
  ultraRenderer: FluidUltraRendererReport;
}): FluidAdaptiveTierRecommendation {
  const thresholds = { ...defaultAdaptiveTierThresholds, ...options.thresholds };
  const ultraTier = options.resolutionScaling.tiers.find((entry) => entry.tier === "ultra");
  const maxUltraGpuP95StepMs = maxNullable([
    ultraTier?.gridGpuP95StepMs ?? null,
    ultraTier?.particleGpuP95StepMs ?? null,
    ultraTier?.pressureGpuP95StepMs ?? null,
  ]);
  const maxUltraToHighGpuP95Ratio = maxNullable(Object.values(options.resolutionScaling.summary.ultraToHighRatios));
  const referenceCategories = options.ultraReference.summary.categories;
  const failures = [
    ...(options.resolutionScaling.pass ? [] : ["FG-20 resolution scaling evidence did not pass."]),
    ...(options.ultraRenderer.pass ? [] : ["FG-21 ultra renderer evidence did not pass."]),
    ...(options.ultraReference.pass ? [] : ["FG-22 ultra reference outcome evidence did not pass."]),
    ...(ultraTier ? [] : ["FG-20 resolution scaling evidence is missing the ultra tier."]),
    ...(ultraTier && ultraTier.estimatedStorageBytes <= thresholds.maxEstimatedStorageBytes
      ? []
      : [`ultra storage exceeded ${thresholds.maxEstimatedStorageBytes} bytes.`]),
    ...(maxUltraGpuP95StepMs !== null && maxUltraGpuP95StepMs <= thresholds.maxUltraGpuP95StepMs
      ? []
      : [`ultra GPU p95 step ${maxUltraGpuP95StepMs ?? "missing"} ms exceeded ${thresholds.maxUltraGpuP95StepMs} ms.`]),
    ...(maxUltraToHighGpuP95Ratio !== null && maxUltraToHighGpuP95Ratio <= thresholds.maxUltraToHighGpuP95Ratio
      ? []
      : [`ultra/high p95 ratio ${maxUltraToHighGpuP95Ratio ?? "missing"} exceeded ${thresholds.maxUltraToHighGpuP95Ratio}.`]),
    ...(options.ultraRenderer.selectedTier === "ultra" ? [] : [`FG-21 selected ${options.ultraRenderer.selectedTier} instead of ultra.`]),
    ...(options.ultraRenderer.summary.maxP95FrameMs <= thresholds.maxLiveP95FrameMs
      ? []
      : [`ultra live p95 frame ${options.ultraRenderer.summary.maxP95FrameMs} ms exceeded ${thresholds.maxLiveP95FrameMs} ms.`]),
    ...(options.ultraRenderer.summary.maxP99FrameMs <= thresholds.maxLiveP99FrameMs
      ? []
      : [`ultra live p99 frame ${options.ultraRenderer.summary.maxP99FrameMs} ms exceeded ${thresholds.maxLiveP99FrameMs} ms.`]),
    ...(options.ultraRenderer.summary.worstDroppedFrameRatio <= thresholds.maxDroppedFrameRatio
      ? []
      : [`ultra dropped-frame ratio ${options.ultraRenderer.summary.worstDroppedFrameRatio} exceeded ${thresholds.maxDroppedFrameRatio}.`]),
    ...(options.ultraReference.selectedTier === "ultra" ? [] : [`FG-22 selected ${options.ultraReference.selectedTier} instead of ultra.`]),
    ...(["damping", "drop", "float", "sink", "splash"] as const).flatMap((category) =>
      referenceCategories.includes(category) ? [] : [`FG-22 reference evidence is missing ${category}.`]
    ),
  ];

  return {
    failures,
    reason: failures.length === 0 ? "ultra has measured local headroom and live reference parity" : "falling back to high until ultra evidence passes",
    selectedTier: failures.length === 0 ? "ultra" : "high",
    summary: {
      maxEstimatedStorageBytes: options.resolutionScaling.summary.maxEstimatedStorageBytes,
      maxLiveP95FrameMs: options.ultraRenderer.summary.maxP95FrameMs,
      maxLiveP99FrameMs: options.ultraRenderer.summary.maxP99FrameMs,
      maxUltraGpuP95StepMs,
      maxUltraToHighGpuP95Ratio,
      referenceCategories,
    },
  };
}

export function createFluidAdaptiveTierReport(options: FluidAdaptiveTierOptions): FluidAdaptiveTierReport {
  const thresholds = { ...defaultAdaptiveTierThresholds, ...options.thresholds };
  const recommendation = recommendAdaptiveFluidTier({
    resolutionScaling: options.resolutionScaling,
    thresholds,
    ultraReference: options.ultraReference,
    ultraRenderer: options.ultraRenderer,
  });
  const failures = [
    ...recommendation.failures.map((entry) => `recommendation: ${entry}`),
    ...(recommendation.selectedTier === "ultra" ? [] : [`adaptive recommendation selected ${recommendation.selectedTier}, expected ultra on this calibrated machine.`]),
    ...(options.runtimeProbe.launchMode === "packaged-app" ? [] : [`runtime launch mode was ${options.runtimeProbe.launchMode}`]),
    ...(options.runtimeProbe.requestedTier === "auto" ? [] : [`runtime requested tier was ${options.runtimeProbe.requestedTier}`]),
    ...(options.runtimeProbe.selection?.mode === "calibrated-auto" ? [] : [`runtime selection mode was ${options.runtimeProbe.selection?.mode ?? "missing"}`]),
    ...(options.runtimeProbe.selection?.preferredTier === recommendation.selectedTier
      ? []
      : [`runtime preferred tier was ${options.runtimeProbe.selection?.preferredTier ?? "missing"}, expected ${recommendation.selectedTier}`]),
    ...(options.runtimeProbe.selectedTier === recommendation.selectedTier
      ? []
      : [`runtime selected tier was ${options.runtimeProbe.selectedTier}, expected ${recommendation.selectedTier}`]),
    ...(options.runtimeProbe.selectedGrid.cellsX === 768 && options.runtimeProbe.selectedGrid.cellsY === 432
      ? []
      : [`runtime grid was ${options.runtimeProbe.selectedGrid.cellsX} x ${options.runtimeProbe.selectedGrid.cellsY}`]),
    ...(options.runtimeProbe.renderer === "webgpu-grid-primary-v1" ? [] : [`runtime renderer was ${options.runtimeProbe.renderer ?? "missing"}`]),
    ...(options.runtimeProbe.waterContext === "webgpu" ? [] : [`runtime water context was ${options.runtimeProbe.waterContext ?? "missing"}`]),
    ...(options.runtimeProbe.tier === recommendation.selectedTier ? [] : [`canvas tier was ${options.runtimeProbe.tier ?? "missing"}`]),
    ...(options.runtimeProbe.grid === "768x432" ? [] : [`canvas grid was ${options.runtimeProbe.grid ?? "missing"}`]),
    ...(options.runtimeProbe.waterFrames >= 12 ? [] : [`runtime only rendered ${options.runtimeProbe.waterFrames} water frames`]),
  ];

  return {
    failures,
    gate: "G-FG-23",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
    recommendation,
    runtimeProbe: options.runtimeProbe,
    sources: {
      resolutionScaling: {
        gate: options.resolutionScaling.gate,
        pass: options.resolutionScaling.pass,
        summary: options.resolutionScaling.summary,
      },
      ultraReference: {
        gate: options.ultraReference.gate,
        pass: options.ultraReference.pass,
        selectedTier: options.ultraReference.selectedTier,
        summary: options.ultraReference.summary,
      },
      ultraRenderer: {
        gate: options.ultraRenderer.gate,
        pass: options.ultraRenderer.pass,
        selectedTier: options.ultraRenderer.selectedTier,
        summary: options.ultraRenderer.summary,
      },
    },
    thresholds,
  };
}

function maxNullable(values: Array<number | null>): number | null {
  const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finiteValues.length > 0 ? Math.max(...finiteValues) : null;
}
