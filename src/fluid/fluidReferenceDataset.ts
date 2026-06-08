import { z } from "zod";
import referenceDatasetRaw from "../../data/fluid-reference-cases.json";
import {
  cloneObjectSpec,
  createSimulation,
  defaultOceanSettings,
  diagnosticsFor,
  equilibriumDeviationFor,
  forecastWaterloggingSeconds,
  objectHeightM,
  objectPresets,
  objectVolumeM3,
  startDrop,
  stepSimulation,
  terminalVelocityMpsFor,
  type ObjectSpec,
  type OceanSettings,
  type SimulationState,
} from "../physicsOcean";

export type FluidReferenceDatasetGate = "G-FG-10";

const measurementMethodSchema = z.enum([
  "impact-speed-vacuum-freefall-band",
  "hydrostatic-density-ratio-draft",
  "damped-floating-settling-draft",
  "damped-floating-buoyancy-error",
  "splash-ballistic-head-band",
  "leak-sensitivity-ratio",
  "underwater-terminal-velocity-band",
]);

const expectedSchema = z.discriminatedUnion("kind", [
  z.object({
    formula: z.string().min(1),
    kind: z.literal("formula-band"),
    lowerFactor: z.number().positive().optional(),
    upperFactor: z.number().positive().optional(),
  }),
  z.object({
    formula: z.string().min(1),
    kind: z.literal("formula-point"),
    tolerance: z.number().nonnegative(),
  }),
  z.object({
    kind: z.literal("fixed-band"),
    max: z.number(),
    min: z.number(),
  }),
]);

const sourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["standard", "official-reference", "textbook", "internal-evidence"]),
  locator: z.string().min(1),
  title: z.string().min(1),
  usage: z.string().min(1),
});

const scenarioSchema = z.object({
  dropHeightM: z.number().nonnegative(),
  objectPresetId: z.string().min(1),
  oceanPresetId: z.literal("calm-seawater-tank"),
  releaseAngleRad: z.number(),
  timeStepS: z.number().positive(),
});

const measurementSchema = z.object({
  expected: expectedSchema,
  id: z.string().min(1),
  method: measurementMethodSchema,
  metric: z.string().min(1),
  parameters: z.record(z.number()).optional(),
  sourceIds: z.array(z.string().min(1)).min(1),
  uncertainty: z.string().min(1),
  unit: z.string().min(1),
});

const referenceCaseSchema = z.object({
  category: z.enum(["drop", "splash", "float", "sink", "damping"]),
  id: z.string().min(1),
  measurements: z.array(measurementSchema).min(1),
  scenario: scenarioSchema,
  title: z.string().min(1),
});

export const fluidReferenceDatasetSchema = z.object({
  cases: z.array(referenceCaseSchema).min(1),
  datasetId: z.string().min(1),
  description: z.string().min(1),
  schemaVersion: z.literal(1),
  sources: z.array(sourceSchema).min(1),
  title: z.string().min(1),
});

export type FluidReferenceDataset = z.infer<typeof fluidReferenceDatasetSchema>;
export type FluidReferenceCase = z.infer<typeof referenceCaseSchema>;
export type FluidReferenceMeasurement = z.infer<typeof measurementSchema>;
export type FluidReferenceMeasurementMethod = z.infer<typeof measurementMethodSchema>;

export type FluidReferenceResolvedBand = {
  formula: string;
  max: number;
  min: number;
};

export type FluidReferenceMeasurementResult = {
  actual: number | null;
  expected: FluidReferenceResolvedBand;
  id: string;
  method: FluidReferenceMeasurementMethod;
  metric: string;
  pass: boolean;
  sourceIds: string[];
  uncertainty: string;
  unit: string;
};

export type FluidReferenceCaseResult = {
  category: FluidReferenceCase["category"];
  id: string;
  measurements: FluidReferenceMeasurementResult[];
  pass: boolean;
  title: string;
};

export type FluidReferenceDatasetReport = {
  categories: FluidReferenceCase["category"][];
  datasetId: string;
  failures: string[];
  gate: FluidReferenceDatasetGate;
  generatedAt: string;
  pass: boolean;
  results: FluidReferenceCaseResult[];
  schemaVersion: number;
  sources: {
    externalCount: number;
    internalCount: number;
    total: number;
  };
  summary: {
    caseCount: number;
    failedCases: string[];
    failedMeasurements: string[];
    measurementCount: number;
  };
};

const requiredCategories: Array<FluidReferenceCase["category"]> = ["drop", "splash", "float", "sink", "damping"];

const calmSeawaterTank: OceanSettings = {
  ...defaultOceanSettings,
  currentSpeedMps: 0,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

export function loadFluidReferenceDataset(raw: unknown = referenceDatasetRaw): FluidReferenceDataset {
  return fluidReferenceDatasetSchema.parse(raw);
}

export function createFluidReferenceDatasetReport(options: { dataset?: unknown; generatedAt?: string } = {}): FluidReferenceDatasetReport {
  const parsed = fluidReferenceDatasetSchema.safeParse(options.dataset ?? referenceDatasetRaw);
  if (!parsed.success) {
    return emptyFailedReport(
      options.generatedAt,
      parsed.error.issues.map((issue) => `schema: ${issue.path.join(".") || "root"} ${issue.message}`)
    );
  }

  const dataset = parsed.data;
  const structuralFailures = validateDatasetStructure(dataset);
  const results = structuralFailures.length === 0 ? evaluateReferenceCases(dataset) : [];
  const failedMeasurements = results.flatMap((entry) =>
    entry.measurements.filter((measurement) => !measurement.pass).map((measurement) => `${entry.id}/${measurement.id}`)
  );
  const failedCases = results.filter((entry) => !entry.pass).map((entry) => entry.id);
  const failures = [...structuralFailures, ...failedMeasurements.map((entry) => `measurement: ${entry}`)];
  const sourceCounts = sourceCountsFor(dataset);

  return {
    categories: categoriesFor(dataset),
    datasetId: dataset.datasetId,
    failures,
    gate: "G-FG-10",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
    results,
    schemaVersion: dataset.schemaVersion,
    sources: sourceCounts,
    summary: {
      caseCount: dataset.cases.length,
      failedCases,
      failedMeasurements,
      measurementCount: dataset.cases.reduce((sum, entry) => sum + entry.measurements.length, 0),
    },
  };
}

function emptyFailedReport(generatedAt: string | undefined, failures: string[]): FluidReferenceDatasetReport {
  return {
    categories: [],
    datasetId: "invalid",
    failures,
    gate: "G-FG-10",
    generatedAt: generatedAt ?? new Date().toISOString(),
    pass: false,
    results: [],
    schemaVersion: 0,
    sources: {
      externalCount: 0,
      internalCount: 0,
      total: 0,
    },
    summary: {
      caseCount: 0,
      failedCases: [],
      failedMeasurements: [],
      measurementCount: 0,
    },
  };
}

function validateDatasetStructure(dataset: FluidReferenceDataset): string[] {
  const failures: string[] = [];
  const sourceIds = new Set(dataset.sources.map((source) => source.id));
  const categories = new Set(dataset.cases.map((entry) => entry.category));
  const measurementIds = new Set<string>();

  for (const category of requiredCategories) {
    if (!categories.has(category)) failures.push(`missing category ${category}`);
  }

  if (dataset.sources.filter((source) => source.locator.startsWith("https://")).length < 5) {
    failures.push("at least five external HTTPS sources are required");
  }

  for (const source of dataset.sources) {
    if (!source.locator.startsWith("https://") && !source.locator.startsWith("docs/") && !source.locator.startsWith("src/")) {
      failures.push(`source ${source.id} has an unsupported locator ${source.locator}`);
    }
  }

  for (const entry of dataset.cases) {
    if (!objectPresets.some((preset) => preset.id === entry.scenario.objectPresetId)) {
      failures.push(`case ${entry.id} references missing object preset ${entry.scenario.objectPresetId}`);
    }
    for (const measurement of entry.measurements) {
      const globalMeasurementId = `${entry.id}/${measurement.id}`;
      if (measurementIds.has(globalMeasurementId)) failures.push(`duplicate measurement ${globalMeasurementId}`);
      measurementIds.add(globalMeasurementId);

      for (const sourceId of measurement.sourceIds) {
        if (!sourceIds.has(sourceId)) failures.push(`measurement ${globalMeasurementId} references missing source ${sourceId}`);
      }
    }
  }

  return failures;
}

function evaluateReferenceCases(dataset: FluidReferenceDataset): FluidReferenceCaseResult[] {
  return dataset.cases.map((entry) => {
    const measurements = entry.measurements.map((measurement) => evaluateMeasurement(entry, measurement));
    return {
      category: entry.category,
      id: entry.id,
      measurements,
      pass: measurements.every((measurement) => measurement.pass),
      title: entry.title,
    };
  });
}

function evaluateMeasurement(entry: FluidReferenceCase, measurement: FluidReferenceMeasurement): FluidReferenceMeasurementResult {
  const spec = preset(entry.scenario.objectPresetId);
  const settings = settingsFor(entry.scenario.oceanPresetId);
  const actual = actualValueFor(entry, measurement, spec, settings);
  const expected = expectedBandFor(entry, measurement, spec, settings);
  return {
    actual,
    expected,
    id: measurement.id,
    method: measurement.method,
    metric: measurement.metric,
    pass: actual !== null && actual >= expected.min && actual <= expected.max,
    sourceIds: measurement.sourceIds,
    uncertainty: measurement.uncertainty,
    unit: measurement.unit,
  };
}

function actualValueFor(
  entry: FluidReferenceCase,
  measurement: FluidReferenceMeasurement,
  spec: ObjectSpec,
  settings: OceanSettings
): number | null {
  switch (measurement.method) {
    case "impact-speed-vacuum-freefall-band": {
      return runUntilImpactForCase(entry, spec, settings).impact?.impactSpeedMps ?? null;
    }
    case "hydrostatic-density-ratio-draft": {
      const expectedFraction = spec.densityKgM3 / settings.waterDensityKgM3;
      const state = createSimulation(spec, entry.scenario.dropHeightM, entry.scenario.releaseAngleRad);
      state.object.centerYM = objectHeightM(spec) / 2 - expectedFraction * objectHeightM(spec);
      return diagnosticsFor(state, spec, settings).submergedFraction;
    }
    case "damped-floating-settling-draft": {
      return Math.abs(dampedFloatingDeviation(entry, spec, settings).draftErrorM ?? Number.POSITIVE_INFINITY);
    }
    case "damped-floating-buoyancy-error": {
      return dampedFloatingDeviation(entry, spec, settings).buoyancyErrorRatio;
    }
    case "splash-ballistic-head-band": {
      return runUntilImpactForCase(entry, spec, settings).impact?.splashHeightM ?? null;
    }
    case "leak-sensitivity-ratio": {
      const smallLeak = cloneObjectSpec(spec);
      const largeLeak = cloneObjectSpec(spec);
      smallLeak.leakAreaM2 = measurement.parameters?.smallLeakAreaM2 ?? 0.000006;
      largeLeak.leakAreaM2 = measurement.parameters?.largeLeakAreaM2 ?? 0.00003;
      const smallDuration = forecastWaterloggingSeconds(smallLeak, settings) ?? Number.POSITIVE_INFINITY;
      const largeDuration = forecastWaterloggingSeconds(largeLeak, settings) ?? Number.POSITIVE_INFINITY;
      return largeDuration / smallDuration;
    }
    case "underwater-terminal-velocity-band": {
      const state = createSimulation(spec, entry.scenario.dropHeightM, entry.scenario.releaseAngleRad);
      state.object.centerYM = -1;
      const diagnostics = diagnosticsFor(state, spec, settings);
      return terminalVelocityMpsFor(
        spec,
        diagnostics.massKg,
        objectVolumeM3(spec),
        settings.waterDensityKgM3,
        settings.waterDynamicViscosityPaS,
        entry.scenario.releaseAngleRad,
        settings
      );
    }
  }
}

function expectedBandFor(
  entry: FluidReferenceCase,
  measurement: FluidReferenceMeasurement,
  spec: ObjectSpec,
  settings: OceanSettings
): FluidReferenceResolvedBand {
  switch (measurement.method) {
    case "impact-speed-vacuum-freefall-band": {
      const base = Math.sqrt(2 * settings.gravity * entry.scenario.dropHeightM);
      const lowerFactor = measurement.expected.kind === "formula-band" ? measurement.expected.lowerFactor ?? 0.88 : 0.88;
      const upperFactor = measurement.expected.kind === "formula-band" ? measurement.expected.upperFactor ?? 1 : 1;
      return { formula: "sqrt(2 * gravity * dropHeightM)", min: base * lowerFactor, max: base * upperFactor };
    }
    case "hydrostatic-density-ratio-draft": {
      const expected = spec.densityKgM3 / settings.waterDensityKgM3;
      const tolerance = measurement.expected.kind === "formula-point" ? measurement.expected.tolerance : 0.035;
      return { formula: "objectDensityKgM3 / waterDensityKgM3", min: expected - tolerance, max: expected + tolerance };
    }
    case "splash-ballistic-head-band": {
      const impact = runUntilImpactForCase(entry, spec, settings).impact;
      const impactSpeed = impact?.impactSpeedMps ?? 0;
      const ballisticHead = impactSpeed ** 2 / settings.gravity;
      const diameter = objectHeightM(spec);
      return {
        formula: "0.045..0.19 * ballisticHead + 0.18..0.9 * objectHeightM",
        min: 0.045 * ballisticHead + 0.18 * diameter,
        max: 0.19 * ballisticHead + 0.9 * diameter,
      };
    }
    case "damped-floating-settling-draft":
    case "damped-floating-buoyancy-error":
    case "leak-sensitivity-ratio":
    case "underwater-terminal-velocity-band": {
      if (measurement.expected.kind !== "fixed-band") {
        return { formula: "invalid fixed-band expectation", min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
      }
      return { formula: "fixed documented acceptance band", min: measurement.expected.min, max: measurement.expected.max };
    }
  }
}

function runUntilImpactForCase(entry: FluidReferenceCase, spec: ObjectSpec, settings: OceanSettings): SimulationState {
  let state = startDrop(createSimulation(spec, entry.scenario.dropHeightM, entry.scenario.releaseAngleRad));
  for (let index = 0; index < 6000 && !state.impact; index += 1) {
    state = stepSimulation(state, spec, settings, entry.scenario.timeStepS);
  }
  return state;
}

function dampedFloatingDeviation(entry: FluidReferenceCase, spec: ObjectSpec, settings: OceanSettings): ReturnType<typeof equilibriumDeviationFor> {
  let state = startDrop(createSimulation(spec, entry.scenario.dropHeightM, entry.scenario.releaseAngleRad));
  let deviation = equilibriumDeviationFor(state, spec, settings);
  for (let index = 0; index < 2600; index += 1) {
    state = stepSimulation(state, spec, settings, entry.scenario.timeStepS);
    if (index % 20 === 0 || state.settledAtS !== null) {
      deviation = equilibriumDeviationFor(state, spec, settings);
      if (deviation.withinTolerance) break;
    }
  }
  return deviation;
}

function settingsFor(presetId: FluidReferenceCase["scenario"]["oceanPresetId"]): OceanSettings {
  switch (presetId) {
    case "calm-seawater-tank":
      return calmSeawaterTank;
  }
}

function preset(id: string): ObjectSpec {
  return cloneObjectSpec(objectPresets.find((entry) => entry.id === id) ?? objectPresets[0]);
}

function categoriesFor(dataset: FluidReferenceDataset): FluidReferenceCase["category"][] {
  return [...new Set(dataset.cases.map((entry) => entry.category))].sort();
}

function sourceCountsFor(dataset: FluidReferenceDataset): FluidReferenceDatasetReport["sources"] {
  const externalCount = dataset.sources.filter((source) => source.locator.startsWith("https://")).length;
  return {
    externalCount,
    internalCount: dataset.sources.length - externalCount,
    total: dataset.sources.length,
  };
}
