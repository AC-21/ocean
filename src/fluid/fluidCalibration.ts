import {
  cloneObjectSpec,
  createSimulation,
  defaultOceanSettings,
  diagnosticsFor,
  dryMassKg,
  equilibriumDeviationFor,
  forecastWaterloggingSeconds,
  objectHeightM,
  objectPresets,
  objectVolumeM3,
  predictFloatOutcome,
  startDrop,
  stepSimulation,
  terminalVelocityMpsFor,
  type ObjectSpec,
  type OceanSettings,
  type SimulationState,
} from "../physicsOcean";

export type FluidCalibrationCase = {
  actual: number;
  category: "analytic" | "empirical-band" | "numerical-stability" | "qualitative-physics";
  expected: number | [number, number];
  id: string;
  metric: string;
  pass: boolean;
  tolerance: string;
  unit: string;
};

export type FluidCalibrationEvidenceCheck = {
  artifact: string;
  id: "FG-01" | "FG-02" | "FG-03" | "FG-04" | "FG-05";
  pass: boolean;
  requiredMarkers: string[];
};

export type FluidCalibrationReport = {
  acceptedErrorBounds: Record<string, string>;
  cases: FluidCalibrationCase[];
  evidenceChecks: FluidCalibrationEvidenceCheck[];
  gate: "G-FG-06";
  generatedAt: string;
  pass: boolean;
  summary: {
    caseCount: number;
    evidenceCount: number;
    failedCases: string[];
    failedEvidence: string[];
    maximumRelativeError: number;
  };
};

export type FluidCalibrationOptions = {
  evidenceText?: Partial<Record<FluidCalibrationEvidenceCheck["id"], string>>;
  generatedAt?: string;
};

const calmTank: OceanSettings = {
  ...defaultOceanSettings,
  currentSpeedMps: 0,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

export const calibrationEvidenceArtifacts: Record<FluidCalibrationEvidenceCheck["id"], string> = {
  "FG-01": "docs/evidence/FG-01-fluid-capability-2026-06-07.json",
  "FG-02": "docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json",
  "FG-03": "docs/evidence/FG-03-fluid-render-probe-2026-06-07.json",
  "FG-04": "docs/evidence/FG-04-fluid-coupling-2026-06-07.json",
  "FG-05": "docs/evidence/FG-05-fluid-splash-2026-06-07.json",
};

export function createFluidCalibrationReport(options: FluidCalibrationOptions = {}): FluidCalibrationReport {
  const cases = [
    impactSpeedCalibrationCase(),
    impactTimestepConvergenceCase(),
    iceDraftCalibrationCase(),
    foamSettlingCalibrationCase(),
    splashHeightCalibrationCase(),
    waterloggingLeakSensitivityCase(),
    terminalVelocityCalibrationCase(),
  ];
  const evidenceChecks = evidenceCalibrationChecks(options.evidenceText ?? {});
  const failedCases = cases.filter((entry) => !entry.pass).map((entry) => entry.id);
  const failedEvidence = evidenceChecks.filter((entry) => !entry.pass).map((entry) => entry.id);
  return {
    acceptedErrorBounds: {
      draft: "Static hydrostatic draft must be within 3.5 percentage points of density-ratio displacement.",
      floatSettling: "Dropped floating body must settle within 5.5 cm draft error and 8% buoyancy error.",
      impactSpeed: "Compact dense body from 8 m must enter within 12% below vacuum free-fall and never exceed it.",
      numericalConvergence: "Impact speed must change by <= 0.12 m/s and impact time by <= 0.02 s between coarse and fine steps.",
      splashHeight: "High-Weber splash crown must stay inside a conservative ballistic-head band.",
      terminalVelocity: "Dense underwater body terminal speed must remain finite and in the 1-8 m/s engineering range.",
      waterlogging: "A larger leak must reduce predicted sink time by at least 45%.",
    },
    cases,
    evidenceChecks,
    gate: "G-FG-06",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failedCases.length === 0 && failedEvidence.length === 0,
    summary: {
      caseCount: cases.length,
      evidenceCount: evidenceChecks.length,
      failedCases,
      failedEvidence,
      maximumRelativeError: Math.max(...cases.map(relativeErrorFor), 0),
    },
  };
}

function impactSpeedCalibrationCase(): FluidCalibrationCase {
  const concrete = preset("concrete-cube");
  const dropHeightM = 8;
  const state = runUntilImpact(concrete, dropHeightM, 0, calmTank, 0.01);
  const actual = state.impact?.impactSpeedMps ?? 0;
  const ideal = Math.sqrt(2 * calmTank.gravity * dropHeightM);
  return bandCase({
    actual,
    category: "analytic",
    expected: [ideal * 0.88, ideal],
    id: "impact-speed-concrete-8m",
    metric: "water entry speed compared with vacuum free-fall",
    tolerance: "-12% / +0% versus sqrt(2gh)",
    unit: "m/s",
  });
}

function impactTimestepConvergenceCase(): FluidCalibrationCase {
  const concrete = preset("concrete-cube");
  const coarse = runUntilImpact(concrete, 4, 0, calmTank, 0.018);
  const fine = runUntilImpact(concrete, 4, 0, calmTank, 0.005);
  const speedDelta = Math.abs((coarse.impact?.impactSpeedMps ?? 0) - (fine.impact?.impactSpeedMps ?? 0));
  const timeDelta = Math.abs((coarse.impact?.atS ?? 0) - (fine.impact?.atS ?? 0));
  return {
    actual: speedDelta,
    category: "numerical-stability",
    expected: [0, 0.12],
    id: "impact-timestep-convergence",
    metric: `impact speed delta; time delta ${timeDelta.toFixed(4)} s`,
    pass: speedDelta <= 0.12 && timeDelta <= 0.02,
    tolerance: "<=0.12 m/s speed and <=0.02 s time",
    unit: "m/s",
  };
}

function iceDraftCalibrationCase(): FluidCalibrationCase {
  const ice = preset("ice-block");
  const equilibriumFraction = ice.densityKgM3 / calmTank.waterDensityKgM3;
  const height = objectHeightM(ice);
  const state = createSimulation(ice, 1, 0);
  state.object.centerYM = height / 2 - equilibriumFraction * height;
  const diagnostics = diagnosticsFor(state, ice, calmTank);
  return pointCase({
    actual: diagnostics.submergedFraction,
    category: "analytic",
    expected: equilibriumFraction,
    id: "ice-static-draft",
    metric: "submerged fraction equals density ratio",
    toleranceValue: 0.035,
    unit: "fraction",
  });
}

function foamSettlingCalibrationCase(): FluidCalibrationCase {
  const foam = preset("foam-rescue-block");
  let state = startDrop(createSimulation(foam, 1.35, 0.18));
  let deviation = equilibriumDeviationFor(state, foam, calmTank);
  for (let index = 0; index < 2600; index += 1) {
    state = stepSimulation(state, foam, calmTank, 0.01);
    if (index % 20 === 0 || state.settledAtS !== null) {
      deviation = equilibriumDeviationFor(state, foam, calmTank);
      if (deviation.withinTolerance) break;
    }
  }
  const draftErrorM = Math.abs(deviation.draftErrorM ?? Number.POSITIVE_INFINITY);
  return {
    actual: draftErrorM,
    category: "analytic",
    expected: [0, 0.055],
    id: "foam-block-settling-draft",
    metric: `settled draft error; buoyancy error ${deviation.buoyancyErrorRatio.toFixed(4)}`,
    pass: state.impact !== null && deviation.withinTolerance && draftErrorM <= 0.055 && deviation.buoyancyErrorRatio <= 0.08,
    tolerance: "<=0.055 m draft and <=8% buoyancy error",
    unit: "m",
  };
}

function splashHeightCalibrationCase(): FluidCalibrationCase {
  const concrete = preset("concrete-cube");
  const state = runUntilImpact(concrete, 8, 0, calmTank, 0.01);
  const impact = state.impact;
  const speed = impact?.impactSpeedMps ?? 0;
  const ballisticHeadM = speed ** 2 / calmTank.gravity;
  const objectDiameterM = objectHeightM(concrete);
  const lower = 0.045 * ballisticHeadM + 0.18 * objectDiameterM;
  const upper = 0.19 * ballisticHeadM + 0.9 * objectDiameterM;
  return bandCase({
    actual: impact?.splashHeightM ?? 0,
    category: "empirical-band",
    expected: [lower, upper],
    id: "high-weber-splash-height-band",
    metric: `splash height for Weber ${(impact?.weberNumber ?? 0).toFixed(0)} and Froude ${(impact?.froudeNumber ?? 0).toFixed(2)}`,
    tolerance: "inside 4.5%-19% ballistic-head band plus object-size allowance",
    unit: "m",
  });
}

function waterloggingLeakSensitivityCase(): FluidCalibrationCase {
  const smallLeak = preset("leaky-steel-drum");
  const largeLeak = cloneObjectSpec(smallLeak);
  smallLeak.leakAreaM2 = 0.000006;
  largeLeak.leakAreaM2 = 0.00003;
  const smallDuration = forecastWaterloggingSeconds(smallLeak, calmTank) ?? Number.POSITIVE_INFINITY;
  const largeDuration = forecastWaterloggingSeconds(largeLeak, calmTank) ?? Number.POSITIVE_INFINITY;
  const ratio = largeDuration / smallDuration;
  return {
    actual: ratio,
    category: "qualitative-physics",
    expected: [0, 0.55],
    id: "waterlogging-leak-sensitivity",
    metric: `large leak sink-time ratio (${largeDuration.toFixed(1)}s / ${smallDuration.toFixed(1)}s)`,
    pass: Number.isFinite(ratio) && ratio < 0.55 && predictFloatOutcome(smallLeak, calmTank).outcome === "waterlogs-then-sinks",
    tolerance: "larger leak sinks in <55% of small-leak time",
    unit: "ratio",
  };
}

function terminalVelocityCalibrationCase(): FluidCalibrationCase {
  const concrete = preset("concrete-cube");
  const state = createSimulation(concrete, 1);
  state.object.centerYM = -1;
  const diagnostics = diagnosticsFor(state, concrete, calmTank);
  const terminal = terminalVelocityMpsFor(
    concrete,
    diagnostics.massKg,
    objectVolumeM3(concrete),
    calmTank.waterDensityKgM3,
    calmTank.waterDynamicViscosityPaS,
    0,
    calmTank
  );
  return bandCase({
    actual: terminal ?? 0,
    category: "empirical-band",
    expected: [1, 8],
    id: "concrete-underwater-terminal-velocity",
    metric: "finite dense-body underwater terminal speed",
    tolerance: "engineering bound 1-8 m/s for compact dense body in water",
    unit: "m/s",
  });
}

function evidenceCalibrationChecks(evidenceText: Partial<Record<FluidCalibrationEvidenceCheck["id"], string>>): FluidCalibrationEvidenceCheck[] {
  const requiredMarkers: Record<FluidCalibrationEvidenceCheck["id"], string[]> = {
    "FG-01": ['"status": "webgpu-ready"', '"selectedTier": "high"'],
    "FG-02": ['"gate": "G-FG-02"', '"pass": true', '"noFullGridReadbackPerFrame": true'],
    "FG-03": ['"gate": "G-FG-03"', '"renderer": "webgpu-grid-primary-v1"', '"waterContext": "webgpu"'],
    "FG-04": ['"gate": "G-FG-04"', '"coupling": "object-grid-v1"', '"boundedDiagnostics": true'],
    "FG-05": ['"gate": "G-FG-05"', '"splash": "grid-splash-v1"', '"boundedDiagnostics": true', '"accumulatedReentryEnergyJ"'],
  };
  return (Object.keys(calibrationEvidenceArtifacts) as FluidCalibrationEvidenceCheck["id"][]).map((id) => {
    const text = evidenceText[id] ?? "";
    const markers = requiredMarkers[id];
    return {
      artifact: calibrationEvidenceArtifacts[id],
      id,
      pass: markers.every((marker) => text.includes(marker)),
      requiredMarkers: markers,
    };
  });
}

function pointCase(options: {
  actual: number;
  category: FluidCalibrationCase["category"];
  expected: number;
  id: string;
  metric: string;
  toleranceValue: number;
  unit: string;
}): FluidCalibrationCase {
  return {
    actual: options.actual,
    category: options.category,
    expected: options.expected,
    id: options.id,
    metric: options.metric,
    pass: Math.abs(options.actual - options.expected) <= options.toleranceValue,
    tolerance: `+/-${options.toleranceValue} ${options.unit}`,
    unit: options.unit,
  };
}

function bandCase(options: {
  actual: number;
  category: FluidCalibrationCase["category"];
  expected: [number, number];
  id: string;
  metric: string;
  tolerance: string;
  unit: string;
}): FluidCalibrationCase {
  return {
    actual: options.actual,
    category: options.category,
    expected: options.expected,
    id: options.id,
    metric: options.metric,
    pass: options.actual >= options.expected[0] && options.actual <= options.expected[1],
    tolerance: options.tolerance,
    unit: options.unit,
  };
}

function relativeErrorFor(entry: FluidCalibrationCase): number {
  if (Array.isArray(entry.expected)) {
    if (entry.actual >= entry.expected[0] && entry.actual <= entry.expected[1]) return 0;
    const nearest = entry.actual < entry.expected[0] ? entry.expected[0] : entry.expected[1];
    return Math.abs(entry.actual - nearest) / Math.max(0.000001, Math.abs(nearest));
  }
  return Math.abs(entry.actual - entry.expected) / Math.max(0.000001, Math.abs(entry.expected));
}

function runUntilImpact(spec: ObjectSpec, dropHeightM: number, releaseAngleRad = 0, settings: OceanSettings = calmTank, dtS = 0.01): SimulationState {
  let state = startDrop(createSimulation(spec, dropHeightM, releaseAngleRad));
  for (let index = 0; index < 6000 && !state.impact; index += 1) {
    state = stepSimulation(state, spec, settings, dtS);
  }
  return state;
}

function preset(id: string): ObjectSpec {
  return cloneObjectSpec(objectPresets.find((entry) => entry.id === id) ?? objectPresets[0]);
}
