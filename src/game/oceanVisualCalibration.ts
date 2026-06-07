import { artDirectionProfile, approvedExamplesFor } from "./artDirection";
import { ports } from "./data";
import { defaultOceanField, oceanSurfaceVisualSummary, oceanWaterPalette, sampleRouteOcean, type OceanRgbColor } from "./ocean";

export type OceanBenchmarkEvidence = {
  source: string | null;
  status: "not-attached" | "missing" | "passed" | "failed";
  cases: OceanBenchmarkCaseEvidence[];
  minAverageFps: number | null;
  minColorBuckets: number | null;
  renderers: string[];
};

export type OceanBenchmarkCaseEvidence = {
  id: string;
  averageFps: number;
  minAverageFps: number;
  pixelColors: number;
  renderer: string;
};

export type OceanVisualCalibrationReport = {
  schema: 1;
  generatedAt: string;
  styleVersion: string;
  oceanFieldId: string;
  approvedReferences: Array<{
    id: string;
    sourcePath: string;
    notes: string;
  }>;
  palette: {
    colorStops: Record<string, OceanRgbColor>;
    averageHue: number;
    averageSaturation: number;
    lumaRange: NumberRange;
    tealGrayPass: boolean;
  };
  fieldSignals: {
    day: number;
    averageCurrentStrength: number;
    averageFoam: number;
    averageRoughness: number;
    averageWaveEnergy: number;
    depthContrast: number;
    maxStormIntensity: number;
    pass: boolean;
  };
  routeRiskReadability: {
    samples: number;
    lowRiskRoute: RouteVisualRiskSample;
    highRiskRoute: RouteVisualRiskSample;
    riskSpread: number;
    pass: boolean;
  };
  liveMapSurface: OceanBenchmarkEvidence;
  decision: {
    recommendation: "calibrated-pixi-water" | "ready-for-live-check" | "needs-water-visual-rework";
    reason: string;
  };
};

type NumberRange = {
  min: number;
  max: number;
};

type RouteVisualRiskSample = {
  route: string;
  day: number;
  roughness: number;
  stormIntensity: number;
  cargoSlam: number;
  foam: number;
  visualRisk: number;
};

export type OceanVisualCalibrationOptions = {
  benchmark?: OceanBenchmarkEvidence;
  day?: number;
  generatedAt?: string;
};

const defaultBenchmarkEvidence: OceanBenchmarkEvidence = {
  source: null,
  status: "not-attached",
  cases: [],
  minAverageFps: null,
  minColorBuckets: null,
  renderers: [],
};

export function createOceanVisualCalibrationReport(options: OceanVisualCalibrationOptions = {}): OceanVisualCalibrationReport {
  const day = Math.max(1, Math.round(options.day ?? 18));
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const approvedReferences = approvedExamplesFor("ocean").map((example) => ({
    id: example.id,
    sourcePath: example.sourcePath,
    notes: example.notes,
  }));
  const palette = summarizePalette();
  const fieldSignals = summarizeFieldSignals(day);
  const routeRiskReadability = summarizeRouteRiskReadability();
  const liveMapSurface = options.benchmark ?? defaultBenchmarkEvidence;
  const visualPass = palette.tealGrayPass && fieldSignals.pass && routeRiskReadability.pass;
  const livePass = liveMapSurface.status === "passed";

  return {
    schema: 1,
    generatedAt,
    styleVersion: artDirectionProfile.styleVersion,
    oceanFieldId: defaultOceanField.id,
    approvedReferences,
    palette,
    fieldSignals,
    routeRiskReadability,
    liveMapSurface,
    decision: decisionFor(visualPass, livePass, liveMapSurface.status),
  };
}

function summarizePalette(): OceanVisualCalibrationReport["palette"] {
  const colorStops = { ...oceanWaterPalette };
  const waterColors = [colorStops.shallow, colorStops.mid, colorStops.deep, colorStops.stormTint, colorStops.currentBand];
  const hsl = waterColors.map(rgbToHsl);
  const lumaValues = Object.values(colorStops).map(luma);
  const averageHue = average(hsl.map((color) => color.h));
  const averageSaturation = average(hsl.map((color) => color.s));
  const lumaRange = range(lumaValues);
  return {
    colorStops,
    averageHue: round(averageHue, 1),
    averageSaturation: round(averageSaturation, 3),
    lumaRange,
    tealGrayPass:
      averageHue >= 170 &&
      averageHue <= 205 &&
      averageSaturation >= 0.32 &&
      averageSaturation <= 0.72 &&
      lumaRange.max - lumaRange.min >= 125,
  };
}

function summarizeFieldSignals(day: number): OceanVisualCalibrationReport["fieldSignals"] {
  const summary = oceanSurfaceVisualSummary(day, 2.6, 7);
  return {
    day,
    averageCurrentStrength: round(summary.averageCurrentStrength, 3),
    averageFoam: round(summary.averageFoam, 3),
    averageRoughness: round(summary.averageRoughness, 3),
    averageWaveEnergy: round(summary.averageWaveEnergy, 3),
    depthContrast: round(summary.depthContrast, 3),
    maxStormIntensity: round(summary.maxStormIntensity, 3),
    pass:
      summary.averageCurrentStrength >= 0.08 &&
      summary.averageFoam >= 0.01 &&
      summary.averageFoam <= 0.5 &&
      summary.averageRoughness >= 0.16 &&
      summary.averageWaveEnergy >= 0.16 &&
      summary.depthContrast >= 0.28 &&
      summary.maxStormIntensity >= 0.12,
  };
}

function summarizeRouteRiskReadability(): OceanVisualCalibrationReport["routeRiskReadability"] {
  const samples: RouteVisualRiskSample[] = [];
  for (const day of [1, 10, 20, 30, 45, 60]) {
    for (const from of ports) {
      for (const to of ports) {
        if (from.id === to.id) continue;
        const ocean = sampleRouteOcean(day, from.id, to.id, 10);
        const visualRisk = round(
          ocean.roughness * 0.28 + ocean.stormIntensity * 0.32 + ocean.seaState.cargoSlam * 0.24 + ocean.waveEnergy * 0.16,
          3
        );
        samples.push({
          route: `${from.id}->${to.id}`,
          day,
          roughness: round(ocean.roughness, 3),
          stormIntensity: round(ocean.stormIntensity, 3),
          cargoSlam: ocean.seaState.cargoSlam,
          foam: round(ocean.waveEnergy, 3),
          visualRisk,
        });
      }
    }
  }
  const sorted = [...samples].sort((left, right) => left.visualRisk - right.visualRisk);
  const lowRiskRoute = sorted[0];
  const highRiskRoute = sorted[sorted.length - 1];
  const riskSpread = round(highRiskRoute.visualRisk - lowRiskRoute.visualRisk, 3);
  return {
    samples: samples.length,
    lowRiskRoute,
    highRiskRoute,
    riskSpread,
    pass: samples.length >= 120 && riskSpread >= 0.28 && highRiskRoute.visualRisk >= 0.46 && lowRiskRoute.visualRisk <= 0.32,
  };
}

function decisionFor(visualPass: boolean, livePass: boolean, liveStatus: OceanBenchmarkEvidence["status"]): OceanVisualCalibrationReport["decision"] {
  if (visualPass && livePass) {
    return {
      recommendation: "calibrated-pixi-water",
      reason: "The Pixi-first water matches the approved teal-gray style contract, exposes readable route-risk signals, and has fresh live benchmark evidence.",
    };
  }
  if (visualPass && liveStatus === "not-attached") {
    return {
      recommendation: "ready-for-live-check",
      reason: "The shared OceanField and palette pass calibration thresholds, but live map benchmark evidence has not been attached to this report.",
    };
  }
  return {
    recommendation: "needs-water-visual-rework",
    reason:
      liveStatus === "failed" || liveStatus === "missing"
        ? `The field calibration needs live map proof; benchmark status is ${liveStatus}.`
        : "The ocean palette, field signals, or route-risk spread missed the approved-water calibration thresholds.",
  };
}

function rgbToHsl(color: OceanRgbColor) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const h = hueFor(r, g, b, max, delta);
  return { h, s, l };
}

function hueFor(r: number, g: number, b: number, max: number, delta: number) {
  if (max === r) return 60 * (((g - b) / delta + (g < b ? 6 : 0)) % 6);
  if (max === g) return 60 * ((b - r) / delta + 2);
  return 60 * ((r - g) / delta + 4);
}

function luma(color: OceanRgbColor) {
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

function range(values: number[]): NumberRange {
  return {
    min: round(Math.min(...values), 1),
    max: round(Math.max(...values), 1),
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
