import { createFluidReferenceDatasetReport, type FluidReferenceDatasetReport, type FluidReferenceMeasurementResult } from "./fluidReferenceDataset";

export type FluidCoupledCalibrationGate = "G-FG-13";

export type FluidCoupledCalibrationInput = {
  generatedAt?: string;
  localCalibration: unknown;
  particleSplash: unknown;
  referenceDataset?: FluidReferenceDatasetReport;
  shallowWater: unknown;
  sources?: {
    localCalibrationPath?: string;
    particleSplashPath?: string;
    shallowWaterPath?: string;
  };
};

export type FluidCoupledComparison = {
  actual: number;
  expected: {
    max: number;
    min: number;
  };
  id: string;
  pass: boolean;
  source: "packaged-app" | "reference-dataset" | "shallow-water" | "particle-splash" | "coupled-comparison";
  unit: string;
};

export type FluidCoupledCalibrationReport = {
  comparisons: FluidCoupledComparison[];
  failures: string[];
  gate: FluidCoupledCalibrationGate;
  generatedAt: string;
  packagedRuntime: {
    averageFps: Record<string, number>;
    launchMode: string | null;
    pass: boolean;
    renderer: string[];
    scenarioCount: number;
    waterContext: string[];
  };
  pass: boolean;
  referenceReplay: {
    categories: string[];
    datasetId: string;
    failedMeasurements: string[];
    pass: boolean;
  };
  solverEvidence: {
    particleSplash: {
      highParticleCount: number;
      massFractionOfDisplaced: number;
      momentumFractionOfImpact: number;
      noFullGridReadbackPerFrame: boolean;
      pass: boolean;
      predictedCrownHeightM: number;
      reentryEnergyJ: number;
      timestampQueryEnabled: boolean;
    };
    shallowWater: {
      dryCellsWithWater: number;
      massRelativeDrift: number;
      momentumDampingRatio: number;
      negativeDepthCells: number;
      noFullGridReadbackPerFrame: boolean;
      pass: boolean;
      timestampQueryEnabled: boolean;
    };
  };
  sources: Required<NonNullable<FluidCoupledCalibrationInput["sources"]>>;
};

const requiredCategories = ["damping", "drop", "float", "sink", "splash"];

export function createFluidCoupledCalibrationReport(input: FluidCoupledCalibrationInput): FluidCoupledCalibrationReport {
  const referenceDataset = input.referenceDataset ?? createFluidReferenceDatasetReport();
  const localCalibration = asRecord(input.localCalibration);
  const shallowWater = asRecord(input.shallowWater);
  const particleSplash = asRecord(input.particleSplash);
  const packagedRuntime = packagedRuntimeFor(localCalibration);
  const referenceReplay = referenceReplayFor(referenceDataset);
  const shallowTier = tierRecord(shallowWater, "high");
  const particleTier = tierRecord(particleSplash, "high");
  const shallowDiagnostics = asRecord(shallowTier.diagnostics);
  const particleDiagnostics = asRecord(particleTier.diagnostics);
  const particleBand = asRecord(particleDiagnostics.referenceSplashBand);
  const comparisons = comparisonsFor(referenceDataset, packagedRuntime, shallowTier, shallowDiagnostics, particleTier, particleDiagnostics, particleBand);
  const solverEvidence = {
    particleSplash: {
      highParticleCount: numberAt(particleDiagnostics, "particleCount"),
      massFractionOfDisplaced: numberAt(particleDiagnostics, "massFractionOfDisplaced"),
      momentumFractionOfImpact: numberAt(particleDiagnostics, "momentumFractionOfImpact"),
      noFullGridReadbackPerFrame: booleanAt(particleTier, "noFullGridReadbackPerFrame"),
      pass: booleanAt(particleTier, "pass") && booleanAt(particleSplash, "pass"),
      predictedCrownHeightM: numberAt(particleDiagnostics, "predictedCrownHeightM"),
      reentryEnergyJ: numberAt(particleDiagnostics, "reentryEnergyJ"),
      timestampQueryEnabled: booleanAt(asRecord(particleTier.gpuTiming), "timestampQueryEnabled"),
    },
    shallowWater: {
      dryCellsWithWater: numberAt(shallowDiagnostics, "dryCellsWithWater"),
      massRelativeDrift: numberAt(shallowDiagnostics, "massRelativeDrift"),
      momentumDampingRatio: numberAt(shallowDiagnostics, "momentumDampingRatio"),
      negativeDepthCells: numberAt(shallowDiagnostics, "negativeDepthCells"),
      noFullGridReadbackPerFrame: booleanAt(shallowTier, "noFullGridReadbackPerFrame"),
      pass: booleanAt(shallowTier, "pass") && booleanAt(shallowWater, "pass"),
      timestampQueryEnabled: booleanAt(asRecord(shallowTier.gpuTiming), "timestampQueryEnabled"),
    },
  };
  const failures = [
    ...packagedRuntimeFailures(packagedRuntime, localCalibration),
    ...referenceFailures(referenceReplay),
    ...shallowWaterFailures(solverEvidence.shallowWater, shallowTier),
    ...particleSplashFailures(solverEvidence.particleSplash, particleTier, particleBand),
    ...comparisons.filter((comparison) => !comparison.pass).map((comparison) => `${comparison.id} missed its coupled calibration band`),
  ];

  return {
    comparisons,
    failures,
    gate: "G-FG-13",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    packagedRuntime,
    pass: failures.length === 0,
    referenceReplay,
    solverEvidence,
    sources: {
      localCalibrationPath: input.sources?.localCalibrationPath ?? "reports/fluid-local-calibration-fg13.json",
      particleSplashPath: input.sources?.particleSplashPath ?? "docs/evidence/FG-12-particle-splash-2026-06-08.json",
      shallowWaterPath: input.sources?.shallowWaterPath ?? "docs/evidence/FG-11-shallow-water-2026-06-08.json",
    },
  };
}

function comparisonsFor(
  referenceDataset: FluidReferenceDatasetReport,
  packagedRuntime: FluidCoupledCalibrationReport["packagedRuntime"],
  shallowTier: Record<string, unknown>,
  shallowDiagnostics: Record<string, unknown>,
  particleTier: Record<string, unknown>,
  particleDiagnostics: Record<string, unknown>,
  particleBand: Record<string, unknown>
): FluidCoupledComparison[] {
  const dropSpeed = measurement(referenceDataset, "water-entry-speed");
  const cpuSplash = measurement(referenceDataset, "splash-crown-height");
  const staticDraft = measurement(referenceDataset, "submerged-fraction");
  const dampingDraft = measurement(referenceDataset, "settled-draft-error");
  const dampingBuoyancy = measurement(referenceDataset, "settled-buoyancy-error");
  const leakRatio = measurement(referenceDataset, "large-vs-small-leak-sink-time-ratio");
  const terminalSpeed = measurement(referenceDataset, "underwater-terminal-speed");
  const particleCrown = numberAt(particleDiagnostics, "predictedCrownHeightM");
  const particleBandMin = numberAt(particleBand, "minM");
  const particleBandMax = numberAt(particleBand, "maxM");
  const cpuSplashActual = numericMeasurementActual(cpuSplash);
  const splashAgreementToleranceM = Math.max(0.2, (numericMeasurementMax(cpuSplash) - numericMeasurementMin(cpuSplash)) * 0.08);

  return [
    measurementComparison("drop-speed-reference", dropSpeed, "reference-dataset"),
    measurementComparison("splash-crown-cpu-reference", cpuSplash, "reference-dataset"),
    {
      actual: particleCrown,
      expected: { min: particleBandMin, max: particleBandMax },
      id: "splash-crown-particle-reference-band",
      pass: particleCrown >= particleBandMin && particleCrown <= particleBandMax,
      source: "particle-splash",
      unit: "m",
    },
    {
      actual: Math.abs(particleCrown - cpuSplashActual),
      expected: { min: 0, max: splashAgreementToleranceM },
      id: "splash-crown-cpu-particle-agreement",
      pass: Math.abs(particleCrown - cpuSplashActual) <= splashAgreementToleranceM,
      source: "coupled-comparison",
      unit: "m",
    },
    measurementComparison("float-static-draft-reference", staticDraft, "reference-dataset"),
    measurementComparison("damping-draft-reference", dampingDraft, "reference-dataset"),
    measurementComparison("damping-buoyancy-reference", dampingBuoyancy, "reference-dataset"),
    measurementComparison("sink-leak-sensitivity-reference", leakRatio, "reference-dataset"),
    measurementComparison("sink-terminal-speed-reference", terminalSpeed, "reference-dataset"),
    {
      actual: Math.min(...Object.values(packagedRuntime.averageFps)),
      expected: { min: 55, max: 240 },
      id: "packaged-frame-pacing-min-fps",
      pass: Object.values(packagedRuntime.averageFps).every((value) => value >= 55),
      source: "packaged-app",
      unit: "fps",
    },
    {
      actual: numberAt(shallowDiagnostics, "massRelativeDrift"),
      expected: { min: 0, max: numberAt(asRecord(shallowTier.threshold), "maxMassRelativeDrift") },
      id: "shallow-water-mass-drift",
      pass: numberAt(shallowDiagnostics, "massRelativeDrift") <= numberAt(asRecord(shallowTier.threshold), "maxMassRelativeDrift"),
      source: "shallow-water",
      unit: "ratio",
    },
    {
      actual: numberAt(particleDiagnostics, "massFractionOfDisplaced"),
      expected: { min: 0, max: numberAt(asRecord(particleTier.threshold), "maxMassFractionOfDisplaced") },
      id: "particle-splash-mass-fraction",
      pass: numberAt(particleDiagnostics, "massFractionOfDisplaced") <= numberAt(asRecord(particleTier.threshold), "maxMassFractionOfDisplaced"),
      source: "particle-splash",
      unit: "ratio",
    },
  ];
}

function packagedRuntimeFor(localCalibration: Record<string, unknown>): FluidCoupledCalibrationReport["packagedRuntime"] {
  const scenarios = arrayAt(localCalibration, "scenarios").map(asRecord);
  return {
    averageFps: Object.fromEntries(scenarios.map((scenario) => [stringAt(scenario, "id"), numberAt(asRecord(scenario.framePacing), "averageFps")])),
    launchMode: stringAt(asRecord(localCalibration.runtime), "launchMode") || null,
    pass: booleanAt(localCalibration, "pass"),
    renderer: [...new Set(scenarios.map((scenario) => stringAt(asRecord(scenario.telemetry), "renderer")).filter(Boolean))],
    scenarioCount: scenarios.length,
    waterContext: [...new Set(scenarios.map((scenario) => stringAt(asRecord(scenario.telemetry), "waterContext")).filter(Boolean))],
  };
}

function referenceReplayFor(referenceDataset: FluidReferenceDatasetReport): FluidCoupledCalibrationReport["referenceReplay"] {
  return {
    categories: referenceDataset.categories,
    datasetId: referenceDataset.datasetId,
    failedMeasurements: referenceDataset.summary.failedMeasurements,
    pass: referenceDataset.pass,
  };
}

function packagedRuntimeFailures(packagedRuntime: FluidCoupledCalibrationReport["packagedRuntime"], localCalibration: Record<string, unknown>): string[] {
  const scenarios = arrayAt(localCalibration, "scenarios").map(asRecord);
  return [
    ...(packagedRuntime.pass ? [] : ["packaged local calibration did not pass"]),
    ...(packagedRuntime.launchMode === "packaged-app" ? [] : [`runtime launchMode must be packaged-app, got ${packagedRuntime.launchMode ?? "missing"}`]),
    ...(packagedRuntime.renderer.includes("webgpu-grid-primary-v1") ? [] : ["packaged runtime did not use webgpu-grid-primary-v1"]),
    ...(packagedRuntime.waterContext.includes("webgpu") ? [] : ["packaged runtime did not use WebGPU water context"]),
    ...scenarios.flatMap((scenario) => (booleanAt(asRecord(scenario.framePacing), "pass") ? [] : [`${stringAt(scenario, "id")} frame pacing failed`])),
  ];
}

function referenceFailures(referenceReplay: FluidCoupledCalibrationReport["referenceReplay"]): string[] {
  return [
    ...(referenceReplay.pass ? [] : ["reference replay did not pass"]),
    ...requiredCategories.filter((category) => !referenceReplay.categories.includes(category)).map((category) => `reference replay missing ${category}`),
    ...referenceReplay.failedMeasurements.map((entry) => `reference measurement failed: ${entry}`),
  ];
}

function shallowWaterFailures(evidence: FluidCoupledCalibrationReport["solverEvidence"]["shallowWater"], shallowTier: Record<string, unknown>): string[] {
  const threshold = asRecord(shallowTier.threshold);
  return [
    ...(evidence.pass ? [] : ["FG-11 shallow-water evidence did not pass"]),
    ...(evidence.noFullGridReadbackPerFrame ? [] : ["FG-11 shallow-water evidence used per-frame full-grid readback"]),
    ...(evidence.timestampQueryEnabled ? [] : ["FG-11 shallow-water evidence did not use timestamp-query timing"]),
    ...(evidence.massRelativeDrift <= numberAt(threshold, "maxMassRelativeDrift") ? [] : ["FG-11 shallow-water mass drift exceeded threshold"]),
    ...(evidence.negativeDepthCells === 0 ? [] : ["FG-11 shallow-water generated negative depths"]),
    ...(evidence.dryCellsWithWater === 0 ? [] : ["FG-11 shallow-water leaked water into dry cells"]),
    ...(evidence.momentumDampingRatio > 0 && evidence.momentumDampingRatio < 1 ? [] : ["FG-11 shallow-water momentum damping was not bounded"]),
  ];
}

function particleSplashFailures(
  evidence: FluidCoupledCalibrationReport["solverEvidence"]["particleSplash"],
  particleTier: Record<string, unknown>,
  particleBand: Record<string, unknown>
): string[] {
  const threshold = asRecord(particleTier.threshold);
  return [
    ...(evidence.pass ? [] : ["FG-12 particle-splash evidence did not pass"]),
    ...(evidence.noFullGridReadbackPerFrame ? [] : ["FG-12 particle-splash evidence used per-frame full-grid readback"]),
    ...(evidence.timestampQueryEnabled ? [] : ["FG-12 particle-splash evidence did not use timestamp-query timing"]),
    ...(evidence.massFractionOfDisplaced <= numberAt(threshold, "maxMassFractionOfDisplaced") ? [] : ["FG-12 particle mass fraction exceeded threshold"]),
    ...(evidence.momentumFractionOfImpact <= numberAt(threshold, "maxMomentumFractionOfImpact") ? [] : ["FG-12 particle momentum fraction exceeded threshold"]),
    ...(evidence.reentryEnergyJ >= numberAt(threshold, "minReentryEnergyJ") ? [] : ["FG-12 particle reentry energy was below threshold"]),
    ...(evidence.predictedCrownHeightM >= numberAt(particleBand, "minM") && evidence.predictedCrownHeightM <= numberAt(particleBand, "maxM")
      ? []
      : ["FG-12 particle crown height was outside its reference band"]),
  ];
}

function measurementComparison(id: string, entry: FluidReferenceMeasurementResult | null, source: FluidCoupledComparison["source"]): FluidCoupledComparison {
  return {
    actual: numericMeasurementActual(entry),
    expected: { min: numericMeasurementMin(entry), max: numericMeasurementMax(entry) },
    id,
    pass: Boolean(entry?.pass),
    source,
    unit: entry?.unit ?? "unknown",
  };
}

function measurement(referenceDataset: FluidReferenceDatasetReport, measurementId: string): FluidReferenceMeasurementResult | null {
  for (const result of referenceDataset.results) {
    const found = result.measurements.find((entry) => entry.id === measurementId);
    if (found) return found;
  }
  return null;
}

function tierRecord(report: Record<string, unknown>, tier: "high" | "standard"): Record<string, unknown> {
  return asRecord(asRecord(report.tiers)[tier]);
}

function numericMeasurementActual(entry: FluidReferenceMeasurementResult | null): number {
  return typeof entry?.actual === "number" ? entry.actual : Number.NaN;
}

function numericMeasurementMin(entry: FluidReferenceMeasurementResult | null): number {
  return typeof entry?.expected.min === "number" ? entry.expected.min : Number.NaN;
}

function numericMeasurementMax(entry: FluidReferenceMeasurementResult | null): number {
  return typeof entry?.expected.max === "number" ? entry.expected.max : Number.NaN;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function arrayAt(record: Record<string, unknown>, key: string): unknown[] {
  return Array.isArray(record[key]) ? record[key] : [];
}

function booleanAt(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function numberAt(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

function stringAt(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}
