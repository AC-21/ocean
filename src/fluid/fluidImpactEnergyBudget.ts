import type { FluidReferenceDataset } from "./fluidReferenceDataset";
import type { FluidReferenceOutcomeCase, FluidUltraReferenceOutcomesReport } from "./fluidUltraReferenceOutcomes";

export type FluidImpactEnergyBudgetGate = "G-FG-31";

export type FluidImpactEnergyBudgetThresholds = {
  maxAccountedEnergyRatio: number;
  maxEjectedToDisplacedMassRatio: number;
  maxFoamEnergyRatio: number;
  maxParticleReentryEnergyRatio: number;
  maxPressureImpulseEnergyRatio: number;
  maxPressureWorkToImpulseRatio: number;
  maxReenteredToSprayMassRatio: number;
  maxSplashGridEnergyRatio: number;
  maxSplashPotentialEnergyRatio: number;
  minAccountedEnergyRatio: number;
  minEjectedToDisplacedMassRatio: number;
  minFoamEnergyRatio: number;
  minParticleReentryEnergyRatio: number;
  minPressureImpulseEnergyRatio: number;
  minSplashCrownToReferenceRatio: number;
  minSplashGridEnergyRatio: number;
  minSplashPotentialEnergyRatio: number;
};

export type FluidImpactEnergyBudget = {
  accountedEnergyJ: number;
  accountedEnergyRatio: number;
  ejectedToDisplacedMassRatio: number;
  foamEnergyJ: number;
  foamEnergyRatio: number;
  impactKineticEnergyJ: number;
  particleReentryEnergyJ: number;
  particleReentryEnergyRatio: number;
  pressureImpulseEnergyJ: number;
  pressureImpulseEnergyRatio: number;
  pressureWorkEstimateJ: number;
  pressureWorkToImpulseRatio: number;
  reenteredToSprayMassRatio: number;
  splashCrownToReferenceRatio: number;
  splashGridEnergyJ: number;
  splashGridEnergyRatio: number;
  splashPotentialEnergyJ: number;
  splashPotentialEnergyRatio: number;
};

export type FluidImpactEnergySourceTrace = {
  caseIds: string[];
  datasetId: string;
  missingSourceIds: string[];
  sourceIds: string[];
};

export type FluidImpactEnergyBudgetReport = {
  budget: FluidImpactEnergyBudget;
  failures: string[];
  gate: FluidImpactEnergyBudgetGate;
  generatedAt: string;
  liveCaseId: "live-concrete-drop-splash-pressure";
  pass: boolean;
  sourceTrace: FluidImpactEnergySourceTrace;
  thresholds: FluidImpactEnergyBudgetThresholds;
  telemetry: {
    couplingActive: boolean;
    grid: string;
    noFullGridReadbackPerFrame: boolean;
    particleSplashActive: boolean;
    pressureActive: boolean;
    renderer: string;
    splashActive: boolean;
    tier: string;
  };
};

export type FluidImpactEnergyBudgetOptions = {
  generatedAt?: string;
  referenceDataset: FluidReferenceDataset;
  ultraReference: FluidUltraReferenceOutcomesReport;
};

const requiredSourceIds = ["nist-standard-gravity", "fg06-calibration-evidence", "fg09-solver-architecture"];
const sourceCaseIds = ["drop-speed-concrete-8m", "high-weber-splash-height"];

export const defaultImpactEnergyBudgetThresholds: FluidImpactEnergyBudgetThresholds = {
  maxAccountedEnergyRatio: 0.62,
  maxEjectedToDisplacedMassRatio: 1.2,
  maxFoamEnergyRatio: 0.22,
  maxParticleReentryEnergyRatio: 0.025,
  maxPressureImpulseEnergyRatio: 0.34,
  maxPressureWorkToImpulseRatio: 0.12,
  maxReenteredToSprayMassRatio: 0.45,
  maxSplashGridEnergyRatio: 0.24,
  maxSplashPotentialEnergyRatio: 0.14,
  minAccountedEnergyRatio: 0.12,
  minEjectedToDisplacedMassRatio: 0.35,
  minFoamEnergyRatio: 0.025,
  minParticleReentryEnergyRatio: 0.0002,
  minPressureImpulseEnergyRatio: 0.045,
  minSplashCrownToReferenceRatio: 0.35,
  minSplashGridEnergyRatio: 0.035,
  minSplashPotentialEnergyRatio: 0.015,
};

export function createFluidImpactEnergyBudgetReport(options: FluidImpactEnergyBudgetOptions): FluidImpactEnergyBudgetReport {
  const liveCase = options.ultraReference.cases.find((entry) => entry.id === "live-concrete-drop-splash-pressure");
  const budget = liveCase ? impactEnergyBudgetFor(liveCase) : emptyBudget();
  const sourceTrace = sourceTraceFor(options.referenceDataset);
  const telemetry = {
    couplingActive: Boolean(liveCase?.stats?.lastCoupling?.active),
    grid: `${options.ultraReference.selectedGrid.cellsX}x${options.ultraReference.selectedGrid.cellsY}`,
    noFullGridReadbackPerFrame: Boolean(
      options.ultraReference.noFullGridReadbackPerFrame &&
        liveCase?.stats?.lastPressure?.noFullGridReadbackPerFrame &&
        liveCase?.stats?.lastParticleSplash?.noFullGridReadbackPerFrame
    ),
    particleSplashActive: Boolean(liveCase?.stats?.lastParticleSplash?.active),
    pressureActive: Boolean(liveCase?.stats?.lastPressure?.active),
    renderer: options.ultraReference.finalStats?.renderer ?? "missing",
    splashActive: Boolean(liveCase?.stats?.lastSplash?.active),
    tier: options.ultraReference.selectedTier,
  };
  const t = defaultImpactEnergyBudgetThresholds;
  const failures = [
    ...(options.ultraReference.gate === "G-FG-22" && options.ultraReference.pass ? [] : ["FG-22 ultra live reference evidence must pass first."]),
    ...(options.ultraReference.launchMode === "packaged-app" ? [] : [`live reference launch mode was ${options.ultraReference.launchMode}`]),
    ...(options.ultraReference.selectedTier === "ultra" && telemetry.grid === "768x432" ? [] : [`live reference runtime was ${options.ultraReference.selectedTier} ${telemetry.grid}`]),
    ...(liveCase ? [] : ["missing live-concrete-drop-splash-pressure case"]),
    ...(liveCase?.pass ? [] : ["live concrete drop+splash case did not pass"]),
    ...(telemetry.renderer === "webgpu-grid-primary-v1" ? [] : [`renderer was ${telemetry.renderer}`]),
    ...(telemetry.pressureActive ? [] : ["pressure telemetry never became active"]),
    ...(telemetry.particleSplashActive ? [] : ["particle splash telemetry never became active"]),
    ...(telemetry.splashActive ? [] : ["grid splash telemetry never became active"]),
    ...(telemetry.couplingActive ? [] : ["object-grid coupling telemetry never became active"]),
    ...(telemetry.noFullGridReadbackPerFrame ? [] : ["energy budget path lost no-full-grid-readback telemetry"]),
    ...sourceTrace.missingSourceIds.map((id) => `missing source trace ${id}`),
    ...rangeFailure("accounted energy ratio", budget.accountedEnergyRatio, t.minAccountedEnergyRatio, t.maxAccountedEnergyRatio),
    ...rangeFailure("pressure impulse energy ratio", budget.pressureImpulseEnergyRatio, t.minPressureImpulseEnergyRatio, t.maxPressureImpulseEnergyRatio),
    ...rangeFailure("splash grid energy ratio", budget.splashGridEnergyRatio, t.minSplashGridEnergyRatio, t.maxSplashGridEnergyRatio),
    ...rangeFailure("foam energy ratio", budget.foamEnergyRatio, t.minFoamEnergyRatio, t.maxFoamEnergyRatio),
    ...rangeFailure("splash potential energy ratio", budget.splashPotentialEnergyRatio, t.minSplashPotentialEnergyRatio, t.maxSplashPotentialEnergyRatio),
    ...rangeFailure("particle reentry energy ratio", budget.particleReentryEnergyRatio, t.minParticleReentryEnergyRatio, t.maxParticleReentryEnergyRatio),
    ...rangeFailure("pressure work to impulse ratio", budget.pressureWorkToImpulseRatio, 0, t.maxPressureWorkToImpulseRatio),
    ...rangeFailure("ejected to displaced mass ratio", budget.ejectedToDisplacedMassRatio, t.minEjectedToDisplacedMassRatio, t.maxEjectedToDisplacedMassRatio),
    ...rangeFailure("reentered to spray mass ratio", budget.reenteredToSprayMassRatio, 0, t.maxReenteredToSprayMassRatio),
    ...(budget.splashCrownToReferenceRatio >= t.minSplashCrownToReferenceRatio ? [] : [`splash crown/reference ratio was ${budget.splashCrownToReferenceRatio}`]),
  ];

  return {
    budget,
    failures,
    gate: "G-FG-31",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    liveCaseId: "live-concrete-drop-splash-pressure",
    pass: failures.length === 0,
    sourceTrace,
    thresholds: t,
    telemetry,
  };
}

function impactEnergyBudgetFor(liveCase: FluidReferenceOutcomeCase): FluidImpactEnergyBudget {
  const impact = liveCase.snapshot.impact;
  const massKg = finiteOrZero(liveCase.snapshot.diagnostics.massKg);
  const gravity = finiteOrZero(liveCase.snapshot.settings.gravity);
  const splashHeightM = finiteOrZero(impact?.splashHeightM);
  const impactKineticEnergyJ = 0.5 * massKg * finiteOrZero(impact?.impactSpeedMps) ** 2;
  const pressure = liveCase.stats?.lastPressure;
  const splash = liveCase.stats?.lastSplash;
  const particles = liveCase.stats?.lastParticleSplash;
  const pressureImpulseEnergyJ = finiteOrZero(pressure?.impulseEnergyEstimateJ);
  const pressureWorkEstimateJ = finiteOrZero(pressure?.pressureWorkEstimateJ);
  const splashGridEnergyJ = finiteOrZero(splash?.gridEnergyJ);
  const foamEnergyJ = finiteOrZero(splash?.foamEnergyJ);
  const particleReentryEnergyJ = finiteOrZero(particles?.reentryEnergyJ);
  const splashPotentialEnergyJ = finiteOrZero(impact?.ejectedWaterKg) * gravity * splashHeightM * 0.55;
  const accountedEnergyJ = pressureImpulseEnergyJ + splashGridEnergyJ + particleReentryEnergyJ + splashPotentialEnergyJ;
  const referenceSplashMax = Math.max(1e-9, finiteOrZero(particles?.referenceSplashBand.maxM));

  return {
    accountedEnergyJ,
    accountedEnergyRatio: ratio(accountedEnergyJ, impactKineticEnergyJ),
    ejectedToDisplacedMassRatio: ratio(finiteOrZero(impact?.ejectedWaterKg), finiteOrZero(particles?.displacedWaterMassKg)),
    foamEnergyJ,
    foamEnergyRatio: ratio(foamEnergyJ, impactKineticEnergyJ),
    impactKineticEnergyJ,
    particleReentryEnergyJ,
    particleReentryEnergyRatio: ratio(particleReentryEnergyJ, impactKineticEnergyJ),
    pressureImpulseEnergyJ,
    pressureImpulseEnergyRatio: ratio(pressureImpulseEnergyJ, impactKineticEnergyJ),
    pressureWorkEstimateJ,
    pressureWorkToImpulseRatio: ratio(pressureWorkEstimateJ, pressureImpulseEnergyJ),
    reenteredToSprayMassRatio: ratio(finiteOrZero(particles?.reenteredMassKg), finiteOrZero(particles?.sprayMassKg)),
    splashCrownToReferenceRatio: ratio(Math.max(splashHeightM, finiteOrZero(splash?.crownHeightM), finiteOrZero(particles?.predictedCrownHeightM)), referenceSplashMax),
    splashGridEnergyJ,
    splashGridEnergyRatio: ratio(splashGridEnergyJ, impactKineticEnergyJ),
    splashPotentialEnergyJ,
    splashPotentialEnergyRatio: ratio(splashPotentialEnergyJ, impactKineticEnergyJ),
  };
}

function sourceTraceFor(dataset: FluidReferenceDataset): FluidImpactEnergySourceTrace {
  const sourceIds = new Set<string>();
  for (const caseId of sourceCaseIds) {
    const referenceCase = dataset.cases.find((entry) => entry.id === caseId);
    for (const measurement of referenceCase?.measurements ?? []) {
      for (const id of measurement.sourceIds) sourceIds.add(id);
    }
  }
  return {
    caseIds: sourceCaseIds,
    datasetId: dataset.datasetId,
    missingSourceIds: requiredSourceIds.filter((id) => !sourceIds.has(id)),
    sourceIds: Array.from(sourceIds).sort(),
  };
}

function emptyBudget(): FluidImpactEnergyBudget {
  return {
    accountedEnergyJ: 0,
    accountedEnergyRatio: 0,
    ejectedToDisplacedMassRatio: 0,
    foamEnergyJ: 0,
    foamEnergyRatio: 0,
    impactKineticEnergyJ: 0,
    particleReentryEnergyJ: 0,
    particleReentryEnergyRatio: 0,
    pressureImpulseEnergyJ: 0,
    pressureImpulseEnergyRatio: 0,
    pressureWorkEstimateJ: 0,
    pressureWorkToImpulseRatio: 0,
    reenteredToSprayMassRatio: 0,
    splashCrownToReferenceRatio: 0,
    splashGridEnergyJ: 0,
    splashGridEnergyRatio: 0,
    splashPotentialEnergyJ: 0,
    splashPotentialEnergyRatio: 0,
  };
}

function rangeFailure(label: string, value: number, min: number, max: number): string[] {
  return Number.isFinite(value) && value >= min && value <= max ? [] : [`${label} ${value} was outside ${min}..${max}`];
}

function finiteOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}
