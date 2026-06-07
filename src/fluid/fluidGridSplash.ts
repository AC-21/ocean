import type { FluidGridObjectCouplingBounds, FluidGridObjectCouplingSample, FluidGridObjectCouplingSummary } from "./fluidGridCoupling";
import type { FluidGridStepPlan } from "./fluidGridGpu";

export type FluidGridSplashInput = {
  currentSpeedMps: number;
  ejectedWaterKg: number;
  froudeNumber: number;
  gravityMps2: number;
  impactStrength: number;
  objectVxMps: number;
  objectVyMps: number;
  plan: FluidGridStepPlan;
  sprayParticleCount: number;
  sprayReentryCount: number;
  sprayReentryEnergyJ: number;
  sprayReentryMassKg: number;
  splashEnergyJ: number;
  splashHeightM: number;
  surfaceTensionNpm: number;
  timeS: number;
  waterDensityKgM3: number;
  weberNumber: number;
};

export type FluidGridSplashSample = {
  foam: number;
  impulseMps: number;
  x: number;
  y: number;
};

export type FluidGridSplashSummary = {
  active: boolean;
  accumulatedReentryEnergyJ: number;
  accumulatedReentryMassKg: number;
  boundedDiagnostics: true;
  bounds: FluidGridObjectCouplingBounds;
  coupling: "grid-splash-v1";
  crownHeightM: number;
  crownRadiusM: number;
  entrainedAirFraction: number;
  foamCells: number;
  foamEnergyJ: number;
  foamInjection: number;
  froudeNumber: number;
  gridEnergyJ: number;
  gridSampleCount: number;
  peakFoamEnergyJ: number;
  reentryCoupledEnergyJ: number;
  sampleTimeS: number;
  secondaryImpulseMagnitude: number;
  sprayDropletCount: number;
  sprayMassKg: number;
  surfaceBreakupFactor: number;
  weberNumber: number;
};

export type FluidGridSplashCoupling = {
  samples: FluidGridSplashSample[];
  summary: FluidGridSplashSummary;
};

export type FluidGridSplashMemory = {
  accumulatedReentryEnergyJ: number;
  accumulatedReentryMassKg: number;
  peakFoamEnergyJ: number;
};

const emptyBounds: FluidGridObjectCouplingBounds = { xEnd: 0, xStart: 0, yEnd: 0, yStart: 0 };
const maxSplashCells = 12288;

export function gridSplashCouplingFor(
  input: FluidGridSplashInput,
  objectCoupling: FluidGridObjectCouplingSummary | null,
  objectSamples: FluidGridObjectCouplingSample[],
  memory: FluidGridSplashMemory = { accumulatedReentryEnergyJ: 0, accumulatedReentryMassKg: 0, peakFoamEnergyJ: 0 }
): FluidGridSplashCoupling {
  const breakup = surfaceBreakupFactorFor(input.weberNumber);
  const objectEnergyJ = objectCoupling?.active
    ? Math.max(
        0,
        objectCoupling.appliedImpulseNs * Math.abs(objectCoupling.gridVelocityMps) +
          objectCoupling.impulseMagnitude * input.waterDensityKgM3 * Math.max(0.01, input.plan.cellSizeM) * 18
      )
    : 0;
  const cpuImpactEnergyJ = Math.max(0, input.splashEnergyJ) * clamp(0.42 + breakup * 0.24, 0.32, 0.86);
  const reentryEnergyJ = Math.max(0, input.sprayReentryEnergyJ);
  const gridEnergyJ = objectEnergyJ + cpuImpactEnergyJ + reentryEnergyJ * 0.72;
  const active = gridEnergyJ > 0.05 || input.impactStrength > 0.002 || reentryEnergyJ > 0.001;
  if (!active || !objectCoupling) {
    return {
      samples: [],
      summary: inactiveSummary(input, memory, breakup),
    };
  }

  const centerX = Math.round((objectCoupling.bounds.xStart + objectCoupling.bounds.xEnd) * 0.5);
  const centerY = Math.round((objectCoupling.bounds.yStart + objectCoupling.bounds.yEnd) * 0.5);
  const footprintWidthCells = Math.max(1, objectCoupling.bounds.xEnd - objectCoupling.bounds.xStart + 1);
  const footprintHeightCells = Math.max(1, objectCoupling.bounds.yEnd - objectCoupling.bounds.yStart + 1);
  const crownHeightM = clamp(
    input.splashHeightM * (0.38 + breakup * 0.26) + Math.sqrt(Math.max(0, gridEnergyJ) / Math.max(1, input.waterDensityKgM3 * input.gravityMps2)) * 0.018,
    0,
    8.5
  );
  const crownRadiusM = clamp(
    Math.sqrt(Math.max(0.0001, Math.max(0, input.ejectedWaterKg) / Math.max(1, input.waterDensityKgM3))) * (2.6 + input.froudeNumber * 0.28) +
      footprintWidthCells * input.plan.cellSizeM * 0.36,
    input.plan.cellSizeM * 2.5,
    4.5
  );
  const radiusX = clampInt(Math.ceil(crownRadiusM / input.plan.cellSizeM), 3, Math.max(3, Math.floor(input.plan.cellsX * 0.12)));
  const radiusY = clampInt(Math.ceil(radiusX * 0.44 + crownHeightM / Math.max(input.plan.cellSizeM * 4, 0.2)), 2, Math.max(2, Math.floor(input.plan.cellsY * 0.09)));
  const bounds = {
    xStart: clampInt(centerX - radiusX, 1, input.plan.cellsX - 2),
    xEnd: clampInt(centerX + radiusX, 1, input.plan.cellsX - 2),
    yStart: clampInt(centerY - Math.max(radiusY, Math.floor(footprintHeightCells * 0.45)), 1, input.plan.cellsY - 2),
    yEnd: clampInt(centerY + radiusY, 1, input.plan.cellsY - 2),
  };
  const areaScale = objectCoupling.footprintAreaM2 + Math.max(1, objectSamples.length) * input.plan.cellSizeM ** 2 * 0.18;
  const foamEnergyJ = gridEnergyJ * clamp(0.16 + breakup * 0.28 + input.sprayParticleCount * 0.0015, 0.08, 0.72);
  const foamInjection = clamp(foamEnergyJ / Math.max(8, input.waterDensityKgM3 * areaScale * input.gravityMps2 * 0.06), 0, 1);
  const sprayMassKg = clamp(
    Math.max(input.ejectedWaterKg * (0.24 + breakup * 0.24), objectCoupling.footprintAreaM2 * input.waterDensityKgM3 * foamInjection * 0.016),
    0,
    Math.max(0.05, input.ejectedWaterKg * 0.9 + 20)
  );
  const sprayDropletCount = Math.round(
    clamp(
      (input.sprayParticleCount > 0 ? input.sprayParticleCount : 12 + sprayMassKg * 2.4 + input.froudeNumber * 11 + breakup * 48) * clamp(input.impactStrength + 0.18, 0.18, 1.18),
      0,
      280
    )
  );
  const entrainedAirFraction = clamp(0.04 + breakup * 0.34 + input.froudeNumber * 0.025 + foamInjection * 0.18, 0, 0.82);
  const secondaryImpulseMagnitude = clamp(Math.sqrt(Math.max(0, reentryEnergyJ)) * 0.018 + input.sprayReentryMassKg * 0.55, 0, 4.8);
  const samples = splashSamplesFor(bounds, centerX, centerY, radiusX, radiusY, foamInjection, secondaryImpulseMagnitude, input);
  const foamCells = samples.filter((sample) => sample.foam > 0.005).length;

  return {
    samples,
    summary: {
      active: samples.length > 0,
      accumulatedReentryEnergyJ: memory.accumulatedReentryEnergyJ + reentryEnergyJ,
      accumulatedReentryMassKg: memory.accumulatedReentryMassKg + Math.max(0, input.sprayReentryMassKg),
      boundedDiagnostics: true,
      bounds,
      coupling: "grid-splash-v1",
      crownHeightM,
      crownRadiusM,
      entrainedAirFraction,
      foamCells,
      foamEnergyJ,
      foamInjection,
      froudeNumber: input.froudeNumber,
      gridEnergyJ,
      gridSampleCount: samples.length,
      peakFoamEnergyJ: Math.max(memory.peakFoamEnergyJ, foamEnergyJ),
      reentryCoupledEnergyJ: reentryEnergyJ,
      sampleTimeS: input.timeS,
      secondaryImpulseMagnitude,
      sprayDropletCount,
      sprayMassKg,
      surfaceBreakupFactor: breakup,
      weberNumber: input.weberNumber,
    },
  };
}

export function nextSplashMemory(memory: FluidGridSplashMemory, summary: FluidGridSplashSummary): FluidGridSplashMemory {
  return {
    accumulatedReentryEnergyJ: summary.accumulatedReentryEnergyJ,
    accumulatedReentryMassKg: summary.accumulatedReentryMassKg,
    peakFoamEnergyJ: Math.max(memory.peakFoamEnergyJ, summary.peakFoamEnergyJ),
  };
}

function inactiveSummary(input: FluidGridSplashInput, memory: FluidGridSplashMemory, breakup: number): FluidGridSplashSummary {
  return {
    active: false,
    accumulatedReentryEnergyJ: memory.accumulatedReentryEnergyJ,
    accumulatedReentryMassKg: memory.accumulatedReentryMassKg,
    boundedDiagnostics: true,
    bounds: emptyBounds,
    coupling: "grid-splash-v1",
    crownHeightM: 0,
    crownRadiusM: 0,
    entrainedAirFraction: 0,
    foamCells: 0,
    foamEnergyJ: 0,
    foamInjection: 0,
    froudeNumber: input.froudeNumber,
    gridEnergyJ: 0,
    gridSampleCount: 0,
    peakFoamEnergyJ: memory.peakFoamEnergyJ,
    reentryCoupledEnergyJ: 0,
    sampleTimeS: input.timeS,
    secondaryImpulseMagnitude: 0,
    sprayDropletCount: 0,
    sprayMassKg: 0,
    surfaceBreakupFactor: breakup,
    weberNumber: input.weberNumber,
  };
}

function splashSamplesFor(
  bounds: FluidGridObjectCouplingBounds,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  foamInjection: number,
  secondaryImpulseMagnitude: number,
  input: FluidGridSplashInput
): FluidGridSplashSample[] {
  const samples: FluidGridSplashSample[] = [];
  const energyShear = clamp(Math.abs(input.objectVxMps - input.currentSpeedMps) * 0.08 + Math.max(0, -input.objectVyMps) * 0.045, 0, 0.7);
  for (let y = bounds.yStart; y <= bounds.yEnd; y += 1) {
    for (let x = bounds.xStart; x <= bounds.xEnd; x += 1) {
      const nx = (x - centerX) / Math.max(1, radiusX);
      const ny = (y - centerY) / Math.max(1, radiusY);
      const radial = Math.sqrt(nx * nx + ny * ny);
      if (radial > 1.18) continue;
      const ringOffset = (radial - 0.72) / 0.28;
      const cavityOffset = radial / 0.58;
      const ring = Math.exp(-(ringOffset ** 2));
      const cavity = Math.exp(-(cavityOffset ** 2));
      const directional = clamp(1 + Math.tanh(nx) * energyShear, 0.45, 1.65);
      const foam = clamp(foamInjection * (ring * 0.9 + cavity * 0.22) * directional, 0, 1);
      const impulseMps = clamp(secondaryImpulseMagnitude * (ring * 0.68 + cavity * 0.18), 0, 4.8);
      if (foam > 0.004 || impulseMps > 0.002) {
        samples.push({ foam, impulseMps, x, y });
        if (samples.length >= maxSplashCells) return samples;
      }
    }
  }
  return samples;
}

function surfaceBreakupFactorFor(weberNumber: number): number {
  return clamp(Math.log10(Math.max(1, weberNumber)) / 5, 0, 1.35);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}
