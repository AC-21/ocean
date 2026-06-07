export type ShapeKind = "box" | "horizontalCylinder" | "sphere" | "verticalCylinder";

export type ObjectSpec = {
  id: string;
  name: string;
  shape: ShapeKind;
  densityKgM3: number;
  dragCoefficient: number;
  addedMassCoefficient: number;
  color: string;
  waterFillRatePerMinute: number;
  maxWaterFillFraction: number;
  leakAreaM2?: number;
  leakDischargeCoefficient?: number;
  airReliefCoefficient?: number;
  porousAbsorptionRatePerMinute?: number;
  vented?: boolean;
  dimensions: {
    diameter?: number;
    height?: number;
    length?: number;
    width?: number;
    depth?: number;
  };
};

export type OceanSettings = {
  gravity: number;
  waterDensityKgM3: number;
  airDensityKgM3: number;
  waterDynamicViscosityPaS: number;
  airDynamicViscosityPaS: number;
  surfaceTensionNpm: number;
  waterDepthM: number;
  waveHeightM: number;
  wavePeriodS: number;
  currentSpeedMps: number;
  windSpeedMps: number;
};

export type ImpactRecord = {
  atS: number;
  substepFraction: number;
  surfaceYM: number;
  impactSpeedMps: number;
  horizontalEntrySpeedMps: number;
  entryAngleRad: number;
  kineticEnergyJ: number;
  froudeNumber: number;
  reynoldsNumber: number;
  weberNumber: number;
  splashAsymmetry: number;
  splashEnergyJ: number;
  coupledWaterMassKg: number;
  cavityDepthM: number;
  cavityCollapseTimeS: number;
  initialVentilationFraction: number;
  splashHeightM: number;
  ejectedWaterKg: number;
};

export type SplashParticle = {
  id: number;
  xM: number;
  yM: number;
  vxMps: number;
  vyMps: number;
  ageS: number;
  lifetimeS: number;
  radiusM: number;
};

export type SurfaceRipple = {
  id: number;
  xM: number;
  ageS: number;
  lifetimeS: number;
  amplitudeM: number;
  speedMps: number;
};

export type FreeSurfaceState = {
  originXM: number;
  cellSizeM: number;
  displacementM: number[];
  velocityMps: number[];
};

export type HistorySample = {
  timeS: number;
  angleRad: number;
  centerYM: number;
  velocityYMps: number;
  submergedFraction: number;
  effectiveDensityKgM3: number;
};

export type WaterKinematics = {
  accelerationXMps2: number;
  accelerationYMps2: number;
  depthBelowSurfaceM: number;
  velocityXMps: number;
  velocityYMps: number;
};

export type SimulationPhase = "falling" | "floating" | "ready" | "sank" | "sinking";

export type SimulationState = {
  timeS: number;
  phase: SimulationPhase;
  object: {
    angleRad: number;
    angularVelocityRadps: number;
    xM: number;
    centerYM: number;
    vxMps: number;
    vyMps: number;
    waterFillFraction: number;
  };
  impact: ImpactRecord | null;
  settledAtS: number | null;
  sankAtS: number | null;
  settledWindowS: number;
  nextParticleId: number;
  particles: SplashParticle[];
  ripples: SurfaceRipple[];
  freeSurface: FreeSurfaceState;
  history: HistorySample[];
  heaveRadiationForceN: number;
  wakeTurbulence: number;
  lastDisplacedVolumeRateM3ps: number;
  lastWaterEntrySlamN: number;
  lastWaterEntrySlamMomentNm: number;
  lastWaterEntrySlamCenterXM: number;
  lastWaterEntrySlamCenterYM: number;
  lastWaveCoupledVolumeM3: number;
  lastSprayReentryCount: number;
  lastSprayReentryEnergyJ: number;
  lastSprayReentryMassKg: number;
  lastSeabedImpactEnergyJ: number;
  lastSeabedNormalImpulseNs: number;
  lastSeabedFrictionImpulseNs: number;
  lastSeabedPenetrationM: number;
};

export type StepDiagnostics = {
  massKg: number;
  dryMassKg: number;
  volumeM3: number;
  displacedVolumeM3: number;
  wettedDisplacedVolumeM3: number;
  cavityVentilationFraction: number;
  cavityDepthRemainingM: number;
  cavityCollapseTimeS: number;
  submergedDepthM: number;
  centerOfBuoyancyXM: number;
  centerOfBuoyancyYM: number;
  centerOfGravityXM: number;
  centerOfGravityYM: number;
  waterplaneAreaM2: number;
  waterplaneSecondMomentM4: number;
  submergedFraction: number;
  effectiveDensityKgM3: number;
  buoyancyN: number;
  surfaceTensionForceN: number;
  capillaryPerimeterM: number;
  bondNumber: number;
  weightN: number;
  addedMassKg: number;
  dragN: number;
  hydrodynamicDragForceXN: number;
  hydrodynamicDragForceYN: number;
  hydrodynamicDragSpeedMps: number;
  hydrodynamicDragAreaM2: number;
  wakeDragN: number;
  wakeEntrainedMassKg: number;
  wakeSheddingFrequencyHz: number;
  wakeTurbulence: number;
  heaveRadiationForceN: number;
  heaveRadiationDampingNsPerM: number;
  heaveNaturalPeriodS: number | null;
  hydrostaticStiffnessNpm: number;
  waveExcitationForceXN: number;
  waveExcitationForceYN: number;
  waveInertiaCoefficient: number;
  hydrodynamicLiftForceXN: number;
  hydrodynamicLiftForceYN: number;
  hydrodynamicLiftCoefficient: number;
  hydrodynamicAngleOfAttackRad: number;
  fluidVelocityXMps: number;
  fluidVelocityYMps: number;
  fluidAccelerationXMps2: number;
  fluidAccelerationYMps2: number;
  waveOrbitalDepthM: number;
  waveOrbitalSpeedMps: number;
  effectiveDragCoefficient: number;
  reynoldsNumber: number;
  terminalVelocityMps: number | null;
  netForceN: number;
  waterIngressRatePerMinute: number;
  leakFlowM3ps: number;
  hydrostaticHeadM: number;
  externalPressurePa: number;
  internalAirPressurePa: number;
  pressureDifferentialPa: number;
  trappedAirVolumeM3: number;
  momentOfInertiaKgM2: number;
  metacentricHeightM: number;
  restoringMomentNm: number;
  internalFreeSurfaceMomentM4: number;
  internalFreeSurfaceGMReductionM: number;
  internalFreeSurfaceMomentNm: number;
  angularDragNm: number;
  hydrodynamicCenterOfPressureXM: number;
  hydrodynamicCenterOfPressureYM: number;
  hydrodynamicLoadForceXN: number;
  hydrodynamicLoadForceYN: number;
  hydrodynamicLoadMomentNm: number;
  horizontalDragN: number;
  freeSurfaceEnergyJ: number;
  freeSurfaceMaxDisplacementM: number;
  freeSurfaceVolumePerMeterM2: number;
  freeSurfaceWaveSpeedMps: number;
  freeSurfaceEffectiveDepthM: number;
  waveLengthM: number;
  wavePhaseSpeedMps: number;
  waveSlopeRad: number;
  waveSlopeRateRadps: number;
  waveSlopeAccelerationRadps2: number;
  waveAngularVelocityRadps: number;
  waveAngularAccelerationRadps2: number;
  relativeAngularVelocityRadps: number;
  angularAddedInertiaKgM2: number;
  rollExcitationTorqueNm: number;
  angleToSurfaceRad: number;
  rotationalStability: "negative" | "neutral" | "positive";
  surfaceYM: number;
  equilibriumSubmergedFraction: number;
};

export type FloatEquilibrium = {
  canFloat: boolean;
  waterFillFraction: number;
  centerYM: number;
  angleRad: number;
  displacedVolumeM3: number;
  submergedFraction: number;
  submergedDepthM: number;
  centerOfBuoyancyXM: number;
  centerOfBuoyancyYM: number;
  centerOfGravityXM: number;
  centerOfGravityYM: number;
  surfaceTensionForceN: number;
  capillaryPerimeterM: number;
  bondNumber: number;
  metacentricHeightM: number;
  restoringMomentNm: number;
  internalFreeSurfaceMomentM4: number;
  internalFreeSurfaceGMReductionM: number;
  internalFreeSurfaceMomentNm: number;
  waterplaneAreaM2: number;
  waterplaneSecondMomentM4: number;
  waterIngressRatePerMinute: number;
  leakFlowM3ps: number;
  hydrostaticHeadM: number;
  externalPressurePa: number;
  internalAirPressurePa: number;
  pressureDifferentialPa: number;
  trappedAirVolumeM3: number;
  rotationalStability: "negative" | "neutral" | "positive";
};

export type FloatPrediction = {
  outcome: "floats-indefinitely" | "sinks-immediately" | "waterlogs-then-sinks";
  effectiveDensityKgM3: number;
  fullWaterloggedDensityKgM3: number;
  equilibriumSubmergedFraction: number;
  secondsUntilSink: number | null;
  criticalWaterFillFraction: number | null;
  initialEquilibrium: FloatEquilibrium | null;
};

export type EquilibriumDeviation = {
  equilibrium: FloatEquilibrium | null;
  centerErrorM: number | null;
  draftErrorM: number | null;
  angleErrorRad: number | null;
  displacedVolumeErrorM3: number | null;
  buoyancyErrorRatio: number;
  verticalSpeedMps: number;
  angularSpeedRadps: number;
  withinTolerance: boolean;
};

const tau = Math.PI * 2;
const ambientAirPressurePa = 101_325;
const freeSurfaceCellCount = 121;
const freeSurfaceCellSizeM = 0.32;
const freeSurfaceOriginXM = -(freeSurfaceCellCount - 1) * freeSurfaceCellSizeM * 0.5;

export const defaultOceanSettings: OceanSettings = {
  gravity: 9.80665,
  waterDensityKgM3: 1025,
  airDensityKgM3: 1.225,
  waterDynamicViscosityPaS: 0.00108,
  airDynamicViscosityPaS: 0.0000181,
  surfaceTensionNpm: 0.073,
  waterDepthM: 22,
  waveHeightM: 0.85,
  wavePeriodS: 6.5,
  currentSpeedMps: 0.18,
  windSpeedMps: 6,
};

export const objectPresets: ObjectSpec[] = [
  {
    id: "foam-rescue-block",
    name: "Closed-cell foam block",
    shape: "box",
    densityKgM3: 58,
    dragCoefficient: 1.08,
    addedMassCoefficient: 0.9,
    color: "#e7b84b",
    waterFillRatePerMinute: 0,
    maxWaterFillFraction: 0,
    dimensions: { width: 1.15, height: 0.6, depth: 0.55 },
  },
  {
    id: "pine-log",
    name: "Pine log",
    shape: "horizontalCylinder",
    densityKgM3: 560,
    dragCoefficient: 0.92,
    addedMassCoefficient: 0.78,
    color: "#8e663b",
    waterFillRatePerMinute: 0.00035,
    maxWaterFillFraction: 0.28,
    porousAbsorptionRatePerMinute: 0.00035,
    dimensions: { length: 2.6, diameter: 0.46 },
  },
  {
    id: "ice-block",
    name: "Fresh-water ice block",
    shape: "box",
    densityKgM3: 917,
    dragCoefficient: 1.05,
    addedMassCoefficient: 0.85,
    color: "#b9e2ee",
    waterFillRatePerMinute: 0,
    maxWaterFillFraction: 0,
    dimensions: { width: 1, height: 0.75, depth: 0.85 },
  },
  {
    id: "leaky-steel-drum",
    name: "Leaky sealed steel drum",
    shape: "horizontalCylinder",
    densityKgM3: 210,
    dragCoefficient: 0.82,
    addedMassCoefficient: 0.74,
    color: "#b44d3d",
    waterFillRatePerMinute: 0.021,
    maxWaterFillFraction: 0.92,
    leakAreaM2: 0.000018,
    leakDischargeCoefficient: 0.62,
    airReliefCoefficient: 0.992,
    vented: false,
    dimensions: { length: 0.88, diameter: 0.58 },
  },
  {
    id: "hardwood-crate",
    name: "Hardwood crate",
    shape: "box",
    densityKgM3: 720,
    dragCoefficient: 1.14,
    addedMassCoefficient: 0.96,
    color: "#956a43",
    waterFillRatePerMinute: 0.009,
    maxWaterFillFraction: 0.48,
    porousAbsorptionRatePerMinute: 0.009,
    dimensions: { width: 1.05, height: 0.8, depth: 0.85 },
  },
  {
    id: "concrete-cube",
    name: "Concrete cube",
    shape: "box",
    densityKgM3: 2400,
    dragCoefficient: 1.18,
    addedMassCoefficient: 1.05,
    color: "#86827a",
    waterFillRatePerMinute: 0,
    maxWaterFillFraction: 0,
    dimensions: { width: 0.72, height: 0.72, depth: 0.72 },
  },
  {
    id: "steel-sphere",
    name: "Solid steel sphere",
    shape: "sphere",
    densityKgM3: 7850,
    dragCoefficient: 0.47,
    addedMassCoefficient: 0.5,
    color: "#8f9aa0",
    waterFillRatePerMinute: 0,
    maxWaterFillFraction: 0,
    dimensions: { diameter: 0.48 },
  },
  {
    id: "aluminum-canister",
    name: "Sealed aluminum canister",
    shape: "verticalCylinder",
    densityKgM3: 640,
    dragCoefficient: 0.78,
    addedMassCoefficient: 0.72,
    color: "#c9d0c8",
    waterFillRatePerMinute: 0.0035,
    maxWaterFillFraction: 0.36,
    leakAreaM2: 0.0000032,
    leakDischargeCoefficient: 0.58,
    airReliefCoefficient: 0.985,
    vented: false,
    dimensions: { diameter: 0.55, height: 0.92 },
  },
];

export function cloneObjectSpec(spec: ObjectSpec): ObjectSpec {
  return {
    ...spec,
    dimensions: { ...spec.dimensions },
  };
}

type HydrostaticGeometry = {
  centerOfBuoyancyXM: number;
  centerOfBuoyancyYM: number;
  submergedDepthM: number;
  volumeM3: number;
  waterplaneAreaM2: number;
  waterplaneSecondMomentM4: number;
};

export function createSimulation(spec: ObjectSpec, dropHeightM: number, initialAngleRad = defaultReleaseAngleRad(spec)): SimulationState {
  const height = objectHeightM(spec);
  return {
    timeS: 0,
    phase: "ready",
    object: {
      angleRad: initialAngleRad,
      angularVelocityRadps: 0,
      xM: -1.5,
      centerYM: Math.max(0.1, dropHeightM) + height / 2,
      vxMps: 0,
      vyMps: 0,
      waterFillFraction: 0,
    },
    impact: null,
    settledAtS: null,
    sankAtS: null,
    settledWindowS: 0,
    nextParticleId: 1,
    particles: [],
    ripples: [],
    freeSurface: createFreeSurfaceState(),
    history: [],
    heaveRadiationForceN: 0,
    wakeTurbulence: 0,
    lastDisplacedVolumeRateM3ps: 0,
    lastWaterEntrySlamN: 0,
    lastWaterEntrySlamMomentNm: 0,
    lastWaterEntrySlamCenterXM: 0,
    lastWaterEntrySlamCenterYM: 0,
    lastWaveCoupledVolumeM3: 0,
    lastSprayReentryCount: 0,
    lastSprayReentryEnergyJ: 0,
    lastSprayReentryMassKg: 0,
    lastSeabedImpactEnergyJ: 0,
    lastSeabedNormalImpulseNs: 0,
    lastSeabedFrictionImpulseNs: 0,
    lastSeabedPenetrationM: 0,
  };
}

export function startDrop(state: SimulationState): SimulationState {
  return {
    ...state,
    phase: "falling",
  };
}

export function objectVolumeM3(spec: ObjectSpec): number {
  const height = objectHeightM(spec);
  const width = objectWidthM(spec);
  const depth = objectDepthM(spec);
  switch (spec.shape) {
    case "sphere": {
      const radius = height / 2;
      return (4 / 3) * Math.PI * radius ** 3;
    }
    case "horizontalCylinder": {
      const radius = height / 2;
      return Math.PI * radius ** 2 * objectLengthM(spec);
    }
    case "verticalCylinder": {
      const radius = width / 2;
      return Math.PI * radius ** 2 * height;
    }
    case "box":
    default:
      return width * height * depth;
  }
}

export function objectHeightM(spec: ObjectSpec): number {
  if (spec.shape === "sphere") return requiredDimension(spec, "diameter");
  if (spec.shape === "horizontalCylinder") return requiredDimension(spec, "diameter");
  return requiredDimension(spec, "height");
}

export function objectWidthM(spec: ObjectSpec): number {
  if (spec.shape === "sphere") return requiredDimension(spec, "diameter");
  if (spec.shape === "horizontalCylinder") return objectLengthM(spec);
  if (spec.shape === "verticalCylinder") return requiredDimension(spec, "diameter");
  return requiredDimension(spec, "width");
}

export function objectDepthM(spec: ObjectSpec): number {
  if (spec.shape === "sphere") return requiredDimension(spec, "diameter");
  if (spec.shape === "horizontalCylinder") return requiredDimension(spec, "diameter");
  if (spec.shape === "verticalCylinder") return requiredDimension(spec, "diameter");
  return requiredDimension(spec, "depth");
}

export function objectLengthM(spec: ObjectSpec): number {
  return spec.dimensions.length ?? objectWidthM({ ...spec, shape: "box", dimensions: { ...spec.dimensions, width: spec.dimensions.width ?? 1 } });
}

export function dryMassKg(spec: ObjectSpec): number {
  return spec.densityKgM3 * objectVolumeM3(spec);
}

export function currentMassKg(spec: ObjectSpec, state: SimulationState, settings: OceanSettings): number {
  return dryMassKg(spec) + state.object.waterFillFraction * objectVolumeM3(spec) * settings.waterDensityKgM3;
}

export function currentEffectiveDensityKgM3(spec: ObjectSpec, state: SimulationState, settings: OceanSettings): number {
  return currentMassKg(spec, state, settings) / objectVolumeM3(spec);
}

export function projectedVerticalAreaM2(spec: ObjectSpec): number {
  return projectedVerticalAreaAtAngleM2(spec, 0);
}

export function projectedVerticalAreaAtAngleM2(spec: ObjectSpec, angleRad: number): number {
  const height = objectHeightM(spec);
  const width = objectWidthM(spec);
  const depth = objectDepthM(spec);
  const sin = Math.abs(Math.sin(angleRad));
  const cos = Math.abs(Math.cos(angleRad));
  switch (spec.shape) {
    case "sphere": {
      const radius = height / 2;
      return Math.PI * radius ** 2;
    }
    case "horizontalCylinder":
      return objectLengthM(spec) * height * (0.72 + 0.28 * cos) + Math.PI * (height / 2) ** 2 * sin;
    case "verticalCylinder": {
      const radius = width / 2;
      return Math.PI * radius ** 2 * cos + width * height * sin;
    }
    case "box":
    default:
      return width * depth * cos + height * depth * sin;
  }
}

export function characteristicLengthM(spec: ObjectSpec): number {
  return Math.max(0.05, (objectHeightM(spec) * objectWidthM(spec) * objectDepthM(spec)) ** (1 / 3));
}

export function reynoldsNumberFor(speedMps: number, characteristicLengthM: number, fluidDensityKgM3: number, dynamicViscosityPaS: number): number {
  return (Math.max(0, Math.abs(speedMps)) * Math.max(0.001, characteristicLengthM) * Math.max(0.001, fluidDensityKgM3)) / Math.max(1e-7, dynamicViscosityPaS);
}

export function weberNumberFor(speedMps: number, characteristicLengthM: number, fluidDensityKgM3: number, surfaceTensionNpm: number): number {
  return (Math.max(0, speedMps) ** 2 * Math.max(0.001, characteristicLengthM) * Math.max(0.001, fluidDensityKgM3)) / Math.max(1e-6, surfaceTensionNpm);
}

export function effectiveDragCoefficientFor(spec: ObjectSpec, reynoldsNumber: number): number {
  const re = Math.max(0, reynoldsNumber);
  if (re < 1e-6) return spec.dragCoefficient;
  const viscousCd = re < 1000 ? (24 / re) * (1 + 0.15 * re ** 0.687) : 0.44;
  const highReCd = spec.dragCoefficient;
  if (spec.shape === "sphere") return clamp(Math.max(0.08, Math.max(highReCd, viscousCd)), 0.08, 400);
  const shapePenalty = spec.shape === "box" ? 1.18 : spec.shape === "verticalCylinder" ? 0.96 : 0.9;
  return clamp(Math.max(highReCd, viscousCd * shapePenalty), 0.08, 500);
}

export function terminalVelocityMpsFor(spec: ObjectSpec, massKg: number, displacedVolumeM3: number, fluidDensityKgM3: number, dynamicViscosityPaS: number, angleRad: number, settings: OceanSettings): number | null {
  const netDownwardN = massKg * settings.gravity - fluidDensityKgM3 * settings.gravity * displacedVolumeM3;
  if (netDownwardN <= 0) return null;
  const areaM2 = Math.max(0.0001, projectedVerticalAreaAtAngleM2(spec, angleRad));
  const lengthM = characteristicLengthM(spec);
  let speedMps = Math.sqrt((2 * netDownwardN) / Math.max(0.0001, fluidDensityKgM3 * Math.max(0.08, spec.dragCoefficient) * areaM2));
  for (let index = 0; index < 8; index += 1) {
    const re = reynoldsNumberFor(speedMps, lengthM, fluidDensityKgM3, dynamicViscosityPaS);
    const cd = effectiveDragCoefficientFor(spec, re);
    speedMps = Math.sqrt((2 * netDownwardN) / Math.max(0.0001, fluidDensityKgM3 * cd * areaM2));
  }
  return speedMps;
}

export function objectMomentOfInertiaKgM2(spec: ObjectSpec, massKg: number): number {
  const height = objectHeightM(spec);
  const width = objectWidthM(spec);
  switch (spec.shape) {
    case "sphere": {
      const radius = height / 2;
      return 0.4 * massKg * radius ** 2;
    }
    case "horizontalCylinder": {
      const radius = height / 2;
      return (massKg * (3 * radius ** 2 + width ** 2)) / 12;
    }
    case "verticalCylinder": {
      const radius = width / 2;
      return (massKg * (3 * radius ** 2 + height ** 2)) / 12;
    }
    case "box":
    default:
      return (massKg * (width ** 2 + height ** 2)) / 12;
  }
}

type WaveComponent = {
  amplitudeM: number;
  angularFrequencyRadps: number;
  phaseOffsetRad: number;
  waveNumberRadM: number;
};

function waveComponentsFor(settings: OceanSettings): WaveComponent[] {
  const period = Math.max(1.8, settings.wavePeriodS);
  const amplitude = Math.max(0, settings.waveHeightM) / 2;
  const omega = tau / period;
  const windFactor = clamp(settings.windSpeedMps / 18, 0, 1);
  const primaryOmega = omega;
  const secondaryOmega = omega * 1.27;
  const capillaryOmega = omega * 2.35;
  return [
    {
      amplitudeM: amplitude,
      angularFrequencyRadps: primaryOmega,
      phaseOffsetRad: 0,
      waveNumberRadM: finiteDepthWaveNumberForAngularFrequencyRadM(primaryOmega, settings.waterDepthM, settings.gravity),
    },
    {
      amplitudeM: amplitude * 0.31,
      angularFrequencyRadps: secondaryOmega,
      phaseOffsetRad: 0.7,
      waveNumberRadM: finiteDepthWaveNumberForAngularFrequencyRadM(secondaryOmega, settings.waterDepthM, settings.gravity),
    },
    {
      amplitudeM: amplitude * 0.12 * windFactor,
      angularFrequencyRadps: capillaryOmega,
      phaseOffsetRad: 0,
      waveNumberRadM: finiteDepthWaveNumberForAngularFrequencyRadM(capillaryOmega, settings.waterDepthM, settings.gravity),
    },
  ];
}

export function finiteDepthWaveNumberRadM(periodS: number, waterDepthM: number, gravity: number): number {
  return finiteDepthWaveNumberForAngularFrequencyRadM(tau / Math.max(0.2, periodS), waterDepthM, gravity);
}

export function finiteDepthWaveLengthM(periodS: number, waterDepthM: number, gravity: number): number {
  return tau / finiteDepthWaveNumberRadM(periodS, waterDepthM, gravity);
}

export function finiteDepthWavePhaseSpeedMps(periodS: number, waterDepthM: number, gravity: number): number {
  const period = Math.max(0.2, periodS);
  return finiteDepthWaveLengthM(period, waterDepthM, gravity) / period;
}

function finiteDepthWaveNumberForAngularFrequencyRadM(angularFrequencyRadps: number, waterDepthM: number, gravity: number): number {
  const omega = Math.max(0.0001, angularFrequencyRadps);
  const g = Math.max(0.01, gravity);
  const h = Math.max(0.05, waterDepthM);
  const deepWaterK = omega ** 2 / g;
  const shallowWaterK = omega / Math.sqrt(g * h);
  let k = Math.max(0.000001, Math.max(deepWaterK, shallowWaterK));

  for (let index = 0; index < 16; index += 1) {
    const kh = k * h;
    const tanhKh = Math.tanh(kh);
    const sechSquaredKh = 1 / Math.cosh(Math.min(30, kh)) ** 2;
    const residual = g * k * tanhKh - omega ** 2;
    const slope = g * (tanhKh + k * h * sechSquaredKh);
    const nextK = k - residual / Math.max(1e-9, slope);
    if (!Number.isFinite(nextK) || nextK <= 0) break;
    if (Math.abs(nextK - k) < 1e-9) {
      k = nextK;
      break;
    }
    k = nextK;
  }

  return Math.max(0.000001, k);
}

export function surfaceElevationAt(xM: number, timeS: number, settings: OceanSettings): number {
  return waveComponentsFor(settings).reduce(
    (sum, component) =>
      sum +
      component.amplitudeM *
        Math.sin(component.waveNumberRadM * xM + component.phaseOffsetRad - component.angularFrequencyRadps * timeS),
    0
  );
}

export function dynamicSurfaceElevationAt(state: SimulationState, xM: number): number {
  return freeSurfaceElevationAt(state.freeSurface, xM);
}

export function dynamicSurfaceVelocityAt(state: SimulationState, xM: number): number {
  return freeSurfaceVelocityAt(state.freeSurface, xM);
}

export function dynamicSurfaceVolumePerMeterM2(state: SimulationState): number {
  return freeSurfaceVolumePerMeterM2(state.freeSurface);
}

export function dynamicSurfaceSlopeAt(state: SimulationState, xM: number): number {
  const dx = state.freeSurface.cellSizeM;
  return (freeSurfaceElevationAt(state.freeSurface, xM + dx) - freeSurfaceElevationAt(state.freeSurface, xM - dx)) / (dx * 2);
}

export function dynamicSurfaceSlopeRateAt(state: SimulationState, xM: number): number {
  const dx = state.freeSurface.cellSizeM;
  return (freeSurfaceVelocityAt(state.freeSurface, xM + dx) - freeSurfaceVelocityAt(state.freeSurface, xM - dx)) / (dx * 2);
}

export function resolvedSurfaceElevationAt(state: SimulationState, xM: number, timeS: number, settings: OceanSettings): number {
  return surfaceElevationAt(xM, timeS, settings) + dynamicSurfaceElevationAt(state, xM);
}

export function resolvedSurfaceVerticalVelocityAt(state: SimulationState, xM: number, timeS: number, settings: OceanSettings): number {
  return surfaceVerticalVelocityAt(xM, timeS, settings) + dynamicSurfaceVelocityAt(state, xM);
}

export function resolvedSurfaceSlopeAt(state: SimulationState, xM: number, timeS: number, settings: OceanSettings): number {
  return Math.atan(Math.tan(surfaceSlopeAt(xM, timeS, settings)) + dynamicSurfaceSlopeAt(state, xM));
}

export function resolvedSurfaceSlopeAngularVelocityAt(state: SimulationState, xM: number, timeS: number, settings: OceanSettings): number {
  const linearSlope = Math.tan(surfaceSlopeAt(xM, timeS, settings));
  const dynamicSlope = dynamicSurfaceSlopeAt(state, xM);
  const slope = linearSlope + dynamicSlope;
  const slopeRate = surfaceSlopeRateAt(xM, timeS, settings) + dynamicSurfaceSlopeRateAt(state, xM);
  return slopeRate / (1 + slope ** 2);
}

export function resolvedSurfaceSlopeAngularAccelerationAt(state: SimulationState, xM: number, timeS: number, settings: OceanSettings): number {
  const linearSlope = Math.tan(surfaceSlopeAt(xM, timeS, settings));
  const dynamicSlope = dynamicSurfaceSlopeAt(state, xM);
  const slope = linearSlope + dynamicSlope;
  const slopeRate = surfaceSlopeRateAt(xM, timeS, settings) + dynamicSurfaceSlopeRateAt(state, xM);
  const slopeAcceleration = surfaceSlopeAccelerationAt(xM, timeS, settings);
  return (slopeAcceleration * (1 + slope ** 2) - 2 * slope * slopeRate ** 2) / (1 + slope ** 2) ** 2;
}

export function waveOrbitalKinematicsAtDepth(xM: number, depthBelowSurfaceM: number, timeS: number, settings: OceanSettings): WaterKinematics {
  const depthM = clamp(depthBelowSurfaceM, 0, Math.max(0.1, settings.waterDepthM));
  let accelerationXMps2 = 0;
  let accelerationYMps2 = 0;
  let velocityXMps = 0;
  let velocityYMps = 0;

  for (const component of waveComponentsFor(settings)) {
    if (component.amplitudeM <= 0) continue;
    const phase = component.waveNumberRadM * xM + component.phaseOffsetRad - component.angularFrequencyRadps * timeS;
    const depthFactor = orbitalDepthFactorsFor(component.waveNumberRadM, depthM, settings.waterDepthM);
    velocityXMps += component.angularFrequencyRadps * component.amplitudeM * depthFactor.horizontal * Math.sin(phase);
    velocityYMps -= component.angularFrequencyRadps * component.amplitudeM * depthFactor.vertical * Math.cos(phase);
    accelerationXMps2 -= component.angularFrequencyRadps ** 2 * component.amplitudeM * depthFactor.horizontal * Math.cos(phase);
    accelerationYMps2 -= component.angularFrequencyRadps ** 2 * component.amplitudeM * depthFactor.vertical * Math.sin(phase);
  }

  return {
    accelerationXMps2,
    accelerationYMps2,
    depthBelowSurfaceM: depthM,
    velocityXMps,
    velocityYMps,
  };
}

export function resolvedWaterKinematicsAt(
  state: SimulationState,
  xM: number,
  yM: number,
  timeS: number,
  settings: OceanSettings
): WaterKinematics {
  const surfaceYM = resolvedSurfaceElevationAt(state, xM, timeS, settings);
  const depthBelowSurfaceM = clamp(surfaceYM - yM, 0, Math.max(0.1, settings.waterDepthM));
  const orbital = waveOrbitalKinematicsAtDepth(xM, depthBelowSurfaceM, timeS, settings);
  const localDisturbanceDecay = Math.exp(-depthBelowSurfaceM / Math.max(0.28, freeSurfaceCellSizeM * 2.6 + settings.waveHeightM * 0.12));
  return {
    accelerationXMps2: orbital.accelerationXMps2,
    accelerationYMps2: orbital.accelerationYMps2,
    depthBelowSurfaceM,
    velocityXMps: settings.currentSpeedMps + orbital.velocityXMps,
    velocityYMps: orbital.velocityYMps + dynamicSurfaceVelocityAt(state, xM) * localDisturbanceDecay,
  };
}

export function surfaceVerticalVelocityAt(xM: number, timeS: number, settings: OceanSettings): number {
  return waveComponentsFor(settings).reduce(
    (sum, component) =>
      sum -
      component.angularFrequencyRadps *
        component.amplitudeM *
        Math.cos(component.waveNumberRadM * xM + component.phaseOffsetRad - component.angularFrequencyRadps * timeS),
    0
  );
}

export function surfaceSlopeAt(xM: number, timeS: number, settings: OceanSettings): number {
  const slope = waveComponentsFor(settings).reduce(
    (sum, component) =>
      sum +
      component.amplitudeM *
        component.waveNumberRadM *
        Math.cos(component.waveNumberRadM * xM + component.phaseOffsetRad - component.angularFrequencyRadps * timeS),
    0
  );
  return Math.atan(slope);
}

export function surfaceSlopeRateAt(xM: number, timeS: number, settings: OceanSettings): number {
  return waveComponentsFor(settings).reduce(
    (sum, component) =>
      sum +
      component.amplitudeM *
        component.waveNumberRadM *
        component.angularFrequencyRadps *
        Math.sin(component.waveNumberRadM * xM + component.phaseOffsetRad - component.angularFrequencyRadps * timeS),
    0
  );
}

export function surfaceSlopeAccelerationAt(xM: number, timeS: number, settings: OceanSettings): number {
  return waveComponentsFor(settings).reduce(
    (sum, component) =>
      sum -
      component.amplitudeM *
        component.waveNumberRadM *
        component.angularFrequencyRadps ** 2 *
        Math.cos(component.waveNumberRadM * xM + component.phaseOffsetRad - component.angularFrequencyRadps * timeS),
    0
  );
}

export function displacedVolumeM3(spec: ObjectSpec, centerYM: number, surfaceYM: number): number {
  const height = objectHeightM(spec);
  const submergedDepthM = submergedDepthFor(spec, centerYM, surfaceYM);
  const volume = objectVolumeM3(spec);
  if (submergedDepthM <= 0) return 0;
  if (submergedDepthM >= height) return volume;

  switch (spec.shape) {
    case "sphere": {
      const radius = height / 2;
      const capHeight = submergedDepthM;
      return Math.PI * capHeight ** 2 * (radius - capHeight / 3);
    }
    case "horizontalCylinder": {
      const radius = height / 2;
      const segmentArea = circularSegmentAreaM2(radius, submergedDepthM);
      return segmentArea * objectLengthM(spec);
    }
    case "verticalCylinder":
    case "box":
    default:
      return volume * (submergedDepthM / height);
  }
}

export function displacedVolumeAtAngleM3(spec: ObjectSpec, centerYM: number, surfaceYM: number, angleRad: number): number {
  return hydrostaticGeometryForState(spec, centerYM, surfaceYM, angleRad).volumeM3;
}

function submergedDepthFor(spec: ObjectSpec, centerYM: number, surfaceYM: number): number {
  const height = objectHeightM(spec);
  return clamp(surfaceYM - (centerYM - height / 2), 0, height);
}

function hydrostaticGeometryForSubmergence(spec: ObjectSpec, submergedDepthM: number): HydrostaticGeometry {
  const height = objectHeightM(spec);
  const depth = clamp(submergedDepthM, 0, height);
  if (depth <= 0) {
    return {
      centerOfBuoyancyXM: 0,
      centerOfBuoyancyYM: -height / 2,
      submergedDepthM: 0,
      volumeM3: 0,
      waterplaneAreaM2: 0,
      waterplaneSecondMomentM4: 0,
    };
  }

  const slices = 96;
  const dy = depth / slices;
  let volumeM3 = 0;
  let firstMomentM4 = 0;
  for (let index = 0; index < slices; index += 1) {
    const yFromBottom = (index + 0.5) * dy;
    const area = crossSectionAreaAtDepthM2(spec, yFromBottom);
    volumeM3 += area * dy;
    firstMomentM4 += area * dy * (yFromBottom - height / 2);
  }

  return {
    centerOfBuoyancyXM: 0,
    centerOfBuoyancyYM: volumeM3 > 0 ? firstMomentM4 / volumeM3 : -height / 2,
    submergedDepthM: depth,
    volumeM3,
    waterplaneAreaM2: depth >= height ? 0 : crossSectionAreaAtDepthM2(spec, depth),
    waterplaneSecondMomentM4: waterplaneSecondMomentAtDepthM4(spec, depth),
  };
}

function hydrostaticGeometryForState(spec: ObjectSpec, centerYM: number, surfaceYM: number, angleRad: number): HydrostaticGeometry {
  const height = objectHeightM(spec);
  if (Math.abs(normalizeAngle(angleRad)) < 0.000001) {
    return hydrostaticGeometryForSubmergence(spec, submergedDepthFor(spec, centerYM, surfaceYM));
  }

  const width = objectWidthM(spec);
  const cellCountX = 84;
  const cellCountY = 84;
  const dx = width / cellCountX;
  const dy = height / cellCountY;
  const sin = Math.sin(angleRad);
  const cos = Math.cos(angleRad);
  const waterlineBandM = Math.max(dx, dy) * 1.6;
  let volumeM3 = 0;
  let firstMomentXM4 = 0;
  let firstMomentYM4 = 0;
  let lowestWorldY = Number.POSITIVE_INFINITY;
  let waterplaneAreaM2 = 0;
  let waterplaneSecondMomentM4 = 0;

  for (let ix = 0; ix < cellCountX; ix += 1) {
    const localX = -width / 2 + (ix + 0.5) * dx;
    for (let iy = 0; iy < cellCountY; iy += 1) {
      const localY = -height / 2 + (iy + 0.5) * dy;
      const thicknessM = localThicknessM(spec, localX, localY);
      if (thicknessM <= 0) continue;
      const worldYRelativeM = localX * sin + localY * cos;
      const worldYM = centerYM + worldYRelativeM;
      const cellVolumeM3 = dx * dy * thicknessM;
      if (worldYRelativeM < lowestWorldY) lowestWorldY = worldYRelativeM;
      if (worldYM <= surfaceYM) {
        volumeM3 += cellVolumeM3;
        const worldXRelativeM = localX * cos - localY * sin;
        firstMomentXM4 += cellVolumeM3 * worldXRelativeM;
        firstMomentYM4 += cellVolumeM3 * worldYRelativeM;
      }
      const waterlineDistanceM = Math.abs(worldYM - surfaceYM);
      if (waterlineDistanceM <= waterlineBandM / 2) {
        const areaContributionM2 = cellVolumeM3 / waterlineBandM;
        const worldXRelativeM = localX * cos - localY * sin;
        waterplaneAreaM2 += areaContributionM2;
        waterplaneSecondMomentM4 += areaContributionM2 * worldXRelativeM ** 2;
      }
    }
  }

  if (!Number.isFinite(lowestWorldY)) lowestWorldY = -height / 2;
  return {
    centerOfBuoyancyXM: volumeM3 > 0 ? firstMomentXM4 / volumeM3 : 0,
    centerOfBuoyancyYM: volumeM3 > 0 ? firstMomentYM4 / volumeM3 : lowestWorldY,
    submergedDepthM: clamp(surfaceYM - (centerYM + lowestWorldY), 0, rotatedVerticalSpanM(spec, angleRad)),
    volumeM3: clamp(volumeM3, 0, objectVolumeM3(spec)),
    waterplaneAreaM2,
    waterplaneSecondMomentM4,
  };
}

export function diagnosticsFor(state: SimulationState, spec: ObjectSpec, settings: OceanSettings): StepDiagnostics {
  const volumeM3 = objectVolumeM3(spec);
  const dryMass = dryMassKg(spec);
  const massKg = currentMassKg(spec, state, settings);
  const surfaceYM = resolvedSurfaceElevationAt(state, state.object.xM, state.timeS, settings);
  const waveSlopeRad = resolvedSurfaceSlopeAt(state, state.object.xM, state.timeS, settings);
  const waveSlopeRateRadps = resolvedSurfaceSlopeAngularVelocityAt(state, state.object.xM, state.timeS, settings);
  const waveSlopeAccelerationRadps2 = resolvedSurfaceSlopeAngularAccelerationAt(state, state.object.xM, state.timeS, settings);
  const angleToSurfaceRad = normalizeAngle(state.object.angleRad - waveSlopeRad);
  const hydrostatics = hydrostaticGeometryForState(spec, state.object.centerYM, surfaceYM, angleToSurfaceRad);
  const submergedDepthM = hydrostatics.submergedDepthM;
  const displaced = hydrostatics.volumeM3;
  const submergedFraction = clamp(displaced / volumeM3, 0, 1);
  const cavity = entryCavityEffectFor(state, spec, submergedDepthM, submergedFraction);
  const wettedDisplaced = displaced * cavity.wettedFraction;
  const wettedSubmergedFraction = clamp(wettedDisplaced / volumeM3, 0, 1);
  const buoyancyN = settings.waterDensityKgM3 * settings.gravity * wettedDisplaced;
  const surfaceTension = surfaceTensionSupportFor(spec, settings, hydrostatics, wettedSubmergedFraction);
  const weightN = massKg * settings.gravity;
  const hydrodynamicSampleYM = submergedFraction > 0.001 ? state.object.centerYM + hydrostatics.centerOfBuoyancyYM : surfaceYM;
  const waterKinematics = resolvedWaterKinematicsAt(state, state.object.xM, hydrodynamicSampleYM, state.timeS, settings);
  const densityMix = settings.waterDensityKgM3 * wettedSubmergedFraction + settings.airDensityKgM3 * (1 - wettedSubmergedFraction);
  const viscosityMix = dynamicViscosityForSubmergence(settings, wettedSubmergedFraction);
  const hydrodynamicDrag = hydrodynamicDragFor(
    spec,
    settings,
    wettedSubmergedFraction,
    waterKinematics,
    state.object.vxMps,
    state.object.vyMps,
    angleToSurfaceRad
  );
  const relativeVy = hydrodynamicDrag.relativeVyMps;
  const reynoldsNumber = hydrodynamicDrag.reynoldsNumber;
  const effectiveDragCoefficient = hydrodynamicDrag.coefficient;
  const baseDragN = hydrodynamicDrag.forceYN + heaveDampingForceN(wettedDisplaced, wettedSubmergedFraction, relativeVy, settings);
  const wakeHydrodynamics = wakeHydrodynamicsFor(
    spec,
    settings,
    wettedDisplaced,
    wettedSubmergedFraction,
    relativeVy,
    reynoldsNumber,
    state.wakeTurbulence ?? 0,
    cavity.ventilationFraction,
    state.object.angleRad
  );
  const dragN = baseDragN + wakeHydrodynamics.dragN;
  const addedMassKg = spec.addedMassCoefficient * settings.waterDensityKgM3 * wettedDisplaced;
  const heaveHydrodynamics = heaveRadiationHydrodynamicsFor(
    spec,
    settings,
    massKg,
    wettedDisplaced,
    hydrostatics.waterplaneAreaM2,
    wettedSubmergedFraction,
    relativeVy
  );
  const waveExcitation = waveExcitationForceFor(spec, settings, wettedDisplaced, wettedSubmergedFraction, waterKinematics);
  const heaveRadiationForceN = wettedSubmergedFraction > 0.001 ? state.heaveRadiationForceN ?? 0 : 0;
  const hydrodynamicLift = hydrodynamicLiftFor(
    spec,
    settings,
    wettedSubmergedFraction,
    waterKinematics,
    state.object.vxMps,
    state.object.vyMps,
    angleToSurfaceRad
  );
  const netForceN = buoyancyN + surfaceTension.forceN + dragN + heaveRadiationForceN + waveExcitation.forceYN + hydrodynamicLift.forceYN - weightN;
  const terminalVelocityMps = terminalVelocityMpsFor(spec, massKg, wettedDisplaced, densityMix, viscosityMix, state.object.angleRad, settings);
  const ingress = waterIngressFor(state, spec, settings, surfaceYM, submergedDepthM, wettedSubmergedFraction);
  const momentOfInertiaKgM2 = objectMomentOfInertiaKgM2(spec, massKg);
  const centerOfGravityYM = centerOfGravityRelativeYM(spec, state.object.waterFillFraction);
  const centerOfGravityXM = centerOfGravityWorldXM(centerOfGravityYM, angleToSurfaceRad);
  const internalFreeSurfaceMomentM4 = internalFreeSurfaceMomentM4For(spec, state.object.waterFillFraction);
  const internalFreeSurfaceGMReductionM = internalFreeSurfaceGMReductionMFor(settings, massKg, internalFreeSurfaceMomentM4);
  const hydrostaticMetacentricHeightM =
    wettedDisplaced > 0 ? hydrostatics.centerOfBuoyancyYM + hydrostatics.waterplaneSecondMomentM4 / wettedDisplaced - centerOfGravityYM : 0;
  const metacentricHeightM = hydrostaticMetacentricHeightM - internalFreeSurfaceGMReductionM;
  const hydrostaticRestoringMomentNm = hydrostaticRestoringMomentFor(
    buoyancyN,
    weightN,
    hydrostatics.centerOfBuoyancyXM,
    centerOfGravityXM
  );
  const internalFreeSurfaceMomentNm = internalFreeSurfaceMomentNmFor(
    weightN,
    internalFreeSurfaceGMReductionM,
    angleToSurfaceRad,
    spec
  );
  const restoringMomentNm = hydrostaticRestoringMomentNm + internalFreeSurfaceMomentNm;
  const hydrodynamicCenterOfPressure = hydrodynamicCenterOfPressureFor(
    spec,
    hydrostatics.centerOfBuoyancyXM,
    hydrostatics.centerOfBuoyancyYM,
    wettedSubmergedFraction
  );
  const hydrodynamicLoadForceXN = hydrodynamicDrag.forceXN + waveExcitation.forceXN + hydrodynamicLift.forceXN;
  const hydrodynamicLoadForceYN = dragN + heaveRadiationForceN + waveExcitation.forceYN + hydrodynamicLift.forceYN;
  const hydrodynamicLoadMomentNm = hydrodynamicLoadMomentFor(
    hydrodynamicCenterOfPressure.xM,
    hydrodynamicCenterOfPressure.yM,
    centerOfGravityXM,
    centerOfGravityYM,
    hydrodynamicLoadForceXN,
    hydrodynamicLoadForceYN
  );
  const waveAngularVelocityRadps = waveSlopeRateRadps * rotationalWaterCouplingFor(wettedSubmergedFraction);
  const waveAngularAccelerationRadps2 = waveSlopeAccelerationRadps2 * rotationalWaterCouplingFor(wettedSubmergedFraction);
  const relativeAngularVelocityRadps = state.object.angularVelocityRadps - waveAngularVelocityRadps;
  const angularDragNm = angularDragFor(relativeAngularVelocityRadps, wettedSubmergedFraction, spec, settings);
  const angularAddedInertiaKgM2 = angularAddedInertiaFor(spec, settings, wettedDisplaced, wettedSubmergedFraction);
  const rollExcitationTorqueNm = rollExcitationTorqueFor(
    angularAddedInertiaKgM2,
    waveAngularAccelerationRadps2,
    massKg,
    spec,
    settings
  );
  const waveLengthM = finiteDepthWaveLengthM(settings.wavePeriodS, settings.waterDepthM, settings.gravity);
  const wavePhaseSpeedMps = finiteDepthWavePhaseSpeedMps(settings.wavePeriodS, settings.waterDepthM, settings.gravity);
  return {
    massKg,
    dryMassKg: dryMass,
    volumeM3,
    displacedVolumeM3: displaced,
    wettedDisplacedVolumeM3: wettedDisplaced,
    cavityVentilationFraction: cavity.ventilationFraction,
    cavityDepthRemainingM: cavity.depthRemainingM,
    cavityCollapseTimeS: cavity.collapseTimeS,
    submergedDepthM,
    centerOfBuoyancyXM: hydrostatics.centerOfBuoyancyXM,
    centerOfBuoyancyYM: hydrostatics.centerOfBuoyancyYM,
    centerOfGravityXM,
    centerOfGravityYM,
    waterplaneAreaM2: hydrostatics.waterplaneAreaM2,
    waterplaneSecondMomentM4: hydrostatics.waterplaneSecondMomentM4,
    submergedFraction,
    effectiveDensityKgM3: massKg / volumeM3,
    buoyancyN,
    surfaceTensionForceN: surfaceTension.forceN,
    capillaryPerimeterM: surfaceTension.perimeterM,
    bondNumber: surfaceTension.bondNumber,
    weightN,
    addedMassKg,
    dragN,
    hydrodynamicDragForceXN: hydrodynamicDrag.forceXN,
    hydrodynamicDragForceYN: hydrodynamicDrag.forceYN,
    hydrodynamicDragSpeedMps: hydrodynamicDrag.speedMps,
    hydrodynamicDragAreaM2: hydrodynamicDrag.referenceAreaM2,
    wakeDragN: wakeHydrodynamics.dragN,
    wakeEntrainedMassKg: wakeHydrodynamics.entrainedMassKg,
    wakeSheddingFrequencyHz: wakeHydrodynamics.sheddingFrequencyHz,
    wakeTurbulence: state.wakeTurbulence ?? 0,
    heaveRadiationForceN,
    heaveRadiationDampingNsPerM: heaveHydrodynamics.dampingNsPerM,
    heaveNaturalPeriodS: heaveHydrodynamics.naturalPeriodS,
    hydrostaticStiffnessNpm: heaveHydrodynamics.hydrostaticStiffnessNpm,
    waveExcitationForceXN: waveExcitation.forceXN,
    waveExcitationForceYN: waveExcitation.forceYN,
    waveInertiaCoefficient: waveExcitation.inertiaCoefficient,
    hydrodynamicLiftForceXN: hydrodynamicLift.forceXN,
    hydrodynamicLiftForceYN: hydrodynamicLift.forceYN,
    hydrodynamicLiftCoefficient: hydrodynamicLift.coefficient,
    hydrodynamicAngleOfAttackRad: hydrodynamicLift.angleOfAttackRad,
    fluidVelocityXMps: waterKinematics.velocityXMps,
    fluidVelocityYMps: waterKinematics.velocityYMps,
    fluidAccelerationXMps2: waterKinematics.accelerationXMps2,
    fluidAccelerationYMps2: waterKinematics.accelerationYMps2,
    waveOrbitalDepthM: waterKinematics.depthBelowSurfaceM,
    waveOrbitalSpeedMps: Math.hypot(waterKinematics.velocityXMps - settings.currentSpeedMps, waterKinematics.velocityYMps),
    effectiveDragCoefficient,
    reynoldsNumber,
    terminalVelocityMps,
    netForceN,
    waterIngressRatePerMinute: ingress.rateFractionPerSecond * 60,
    leakFlowM3ps: ingress.leakFlowM3ps,
    hydrostaticHeadM: ingress.hydrostaticHeadM,
    externalPressurePa: ingress.externalPressurePa,
    internalAirPressurePa: ingress.internalAirPressurePa,
    pressureDifferentialPa: ingress.pressureDifferentialPa,
    trappedAirVolumeM3: ingress.trappedAirVolumeM3,
    momentOfInertiaKgM2,
    metacentricHeightM,
    restoringMomentNm,
    internalFreeSurfaceMomentM4,
    internalFreeSurfaceGMReductionM,
    internalFreeSurfaceMomentNm,
    angularDragNm,
    hydrodynamicCenterOfPressureXM: hydrodynamicCenterOfPressure.xM,
    hydrodynamicCenterOfPressureYM: hydrodynamicCenterOfPressure.yM,
    hydrodynamicLoadForceXN,
    hydrodynamicLoadForceYN,
    hydrodynamicLoadMomentNm,
    horizontalDragN: hydrodynamicDrag.forceXN,
    freeSurfaceEnergyJ: freeSurfaceEnergyJ(state.freeSurface, settings),
    freeSurfaceMaxDisplacementM: freeSurfaceMaxDisplacementM(state.freeSurface),
    freeSurfaceVolumePerMeterM2: freeSurfaceVolumePerMeterM2(state.freeSurface),
    freeSurfaceWaveSpeedMps: freeSurfaceWaveSpeedMps(settings),
    freeSurfaceEffectiveDepthM: freeSurfaceEffectiveDepthM(settings),
    waveLengthM,
    wavePhaseSpeedMps,
    waveSlopeRad,
    waveSlopeRateRadps,
    waveSlopeAccelerationRadps2,
    waveAngularVelocityRadps,
    waveAngularAccelerationRadps2,
    relativeAngularVelocityRadps,
    angularAddedInertiaKgM2,
    rollExcitationTorqueNm,
    angleToSurfaceRad,
    rotationalStability: metacentricHeightM > 0.015 ? "positive" : metacentricHeightM < -0.015 ? "negative" : "neutral",
    surfaceYM,
    equilibriumSubmergedFraction: clamp(massKg / (settings.waterDensityKgM3 * volumeM3), 0, Number.POSITIVE_INFINITY),
  };
}

export function stepSimulation(state: SimulationState, spec: ObjectSpec, settings: OceanSettings, dtS: number): SimulationState {
  if (state.phase === "ready" || state.phase === "sank") {
    return updateParticlesAndHistory(state, spec, settings, dtS);
  }

  const dt = clamp(dtS, 0, 0.04);
  const previousDiagnostics = diagnosticsFor(state, spec, settings);
  const previousSubmerged = previousDiagnostics.submergedFraction;
  const previousSurfaceY = previousDiagnostics.surfaceYM;
  let next = {
    ...state,
    timeS: state.timeS + dt,
    object: { ...state.object },
    particles: state.particles.slice(),
    ripples: state.ripples.slice(),
    freeSurface: cloneFreeSurface(state.freeSurface),
    history: state.history,
    heaveRadiationForceN: state.heaveRadiationForceN ?? 0,
    wakeTurbulence: state.wakeTurbulence ?? 0,
    lastDisplacedVolumeRateM3ps: 0,
    lastWaterEntrySlamN: 0,
    lastWaterEntrySlamMomentNm: 0,
    lastWaterEntrySlamCenterXM: 0,
    lastWaterEntrySlamCenterYM: 0,
    lastWaveCoupledVolumeM3: 0,
    lastSprayReentryCount: 0,
    lastSprayReentryEnergyJ: 0,
    lastSprayReentryMassKg: 0,
    lastSeabedImpactEnergyJ: 0,
    lastSeabedNormalImpulseNs: 0,
    lastSeabedFrictionImpulseNs: 0,
    lastSeabedPenetrationM: 0,
  };

  const volumeM3 = objectVolumeM3(spec);
  if (spec.maxWaterFillFraction > 0 && previousSubmerged > 0) {
    const previousWettedSubmergedFraction = clamp(previousDiagnostics.wettedDisplacedVolumeM3 / volumeM3, 0, 1);
    const ingress = waterIngressFor(next, spec, settings, previousSurfaceY, previousDiagnostics.submergedDepthM, previousWettedSubmergedFraction);
    next.object.waterFillFraction = clamp(
      next.object.waterFillFraction + ingress.rateFractionPerSecond * dt,
      0,
      spec.maxWaterFillFraction
    );
  }

  const massKg = currentMassKg(spec, next, settings);
  const surfaceY = resolvedSurfaceElevationAt(next, next.object.xM, next.timeS, settings);
  const surfaceSlopeRad = resolvedSurfaceSlopeAt(next, next.object.xM, next.timeS, settings);
  const hydrostatics = hydrostaticGeometryForState(spec, next.object.centerYM, surfaceY, normalizeAngle(next.object.angleRad - surfaceSlopeRad));
  const displaced = hydrostatics.volumeM3;
  const submergedFraction = clamp(displaced / volumeM3, 0, 1);
  const cavity = entryCavityEffectFor(next, spec, hydrostatics.submergedDepthM, submergedFraction);
  const wettedDisplaced = displaced * cavity.wettedFraction;
  const wettedSubmergedFraction = clamp(wettedDisplaced / volumeM3, 0, 1);
  const hydrodynamicSampleYM = submergedFraction > 0.001 ? next.object.centerYM + hydrostatics.centerOfBuoyancyYM : surfaceY;
  const waterKinematics = resolvedWaterKinematicsAt(next, next.object.xM, hydrodynamicSampleYM, next.timeS, settings);
  const buoyancyN = settings.waterDensityKgM3 * settings.gravity * wettedDisplaced;
  const surfaceTension = surfaceTensionSupportFor(spec, settings, hydrostatics, wettedSubmergedFraction);
  const weightN = massKg * settings.gravity;
  const hydrodynamicDrag = hydrodynamicDragFor(
    spec,
    settings,
    wettedSubmergedFraction,
    waterKinematics,
    next.object.vxMps,
    next.object.vyMps,
    normalizeAngle(next.object.angleRad - surfaceSlopeRad)
  );
  const relativeVy = hydrodynamicDrag.relativeVyMps;
  const reynoldsNumber = hydrodynamicDrag.reynoldsNumber;
  const baseDragN = hydrodynamicDrag.forceYN + heaveDampingForceN(wettedDisplaced, wettedSubmergedFraction, relativeVy, settings);
  const wakeHydrodynamics = wakeHydrodynamicsFor(
    spec,
    settings,
    wettedDisplaced,
    wettedSubmergedFraction,
    relativeVy,
    reynoldsNumber,
    next.wakeTurbulence,
    cavity.ventilationFraction,
    next.object.angleRad
  );
  const dragN = baseDragN + wakeHydrodynamics.dragN;
  const addedMassKg = spec.addedMassCoefficient * settings.waterDensityKgM3 * wettedDisplaced;
  const heaveHydrodynamics = heaveRadiationHydrodynamicsFor(
    spec,
    settings,
    massKg,
    wettedDisplaced,
    hydrostatics.waterplaneAreaM2,
    wettedSubmergedFraction,
    relativeVy
  );
  const waveExcitation = waveExcitationForceFor(spec, settings, wettedDisplaced, wettedSubmergedFraction, waterKinematics);
  const hydrodynamicLift = hydrodynamicLiftFor(
    spec,
    settings,
    wettedSubmergedFraction,
    waterKinematics,
    next.object.vxMps,
    next.object.vyMps,
    normalizeAngle(next.object.angleRad - surfaceSlopeRad)
  );
  next.heaveRadiationForceN = stepHeaveRadiationForceN(
    next.heaveRadiationForceN,
    heaveHydrodynamics.targetForceN,
    heaveHydrodynamics.timeConstantS,
    dt,
    wettedSubmergedFraction,
    heaveHydrodynamics.forceCapN
  );
  const ayMps2 =
    (buoyancyN + surfaceTension.forceN + dragN + next.heaveRadiationForceN + waveExcitation.forceYN + hydrodynamicLift.forceYN - weightN) /
    Math.max(0.001, massKg + addedMassKg + wakeHydrodynamics.entrainedMassKg * 0.22);

  next.object.vyMps += ayMps2 * dt;
  next.object.centerYM += next.object.vyMps * dt;

  const postSurfaceY = resolvedSurfaceElevationAt(next, next.object.xM, next.timeS, settings);
  const postSurfaceSlopeRad = resolvedSurfaceSlopeAt(next, next.object.xM, next.timeS, settings);
  const postHydrostatics = hydrostaticGeometryForState(spec, next.object.centerYM, postSurfaceY, normalizeAngle(next.object.angleRad - postSurfaceSlopeRad));
  const postSubmergedFraction = clamp(postHydrostatics.volumeM3 / volumeM3, 0, 1);
  const postCavity = entryCavityEffectFor(next, spec, postHydrostatics.submergedDepthM, postSubmergedFraction);
  const postWettedDisplaced = postHydrostatics.volumeM3 * postCavity.wettedFraction;
  const postWettedSubmergedFraction = clamp(postWettedDisplaced / volumeM3, 0, 1);
  const displacedVolumeDeltaM3 = postHydrostatics.volumeM3 - previousDiagnostics.displacedVolumeM3;
  const displacedVolumeRateM3ps = displacedVolumeDeltaM3 / Math.max(0.001, dt);
  const postHydrodynamicSampleYM = postSubmergedFraction > 0.001 ? next.object.centerYM + postHydrostatics.centerOfBuoyancyYM : postSurfaceY;
  const postWaterKinematics = resolvedWaterKinematicsAt(next, next.object.xM, postHydrodynamicSampleYM, next.timeS, settings);
  const postWaveExcitation = waveExcitationForceFor(spec, settings, postWettedDisplaced, postWettedSubmergedFraction, postWaterKinematics);
  const postHydrodynamicLift = hydrodynamicLiftFor(
    spec,
    settings,
    postWettedSubmergedFraction,
    postWaterKinematics,
    next.object.vxMps,
    next.object.vyMps,
    normalizeAngle(next.object.angleRad - postSurfaceSlopeRad)
  );
  const postWaveVy = postWaterKinematics.velocityYMps * postWettedSubmergedFraction;
  const postRelativeVy = next.object.vyMps - postWaveVy;
  const postDensityMix = settings.waterDensityKgM3 * postWettedSubmergedFraction + settings.airDensityKgM3 * (1 - postWettedSubmergedFraction);
  const postViscosityMix = dynamicViscosityForSubmergence(settings, postWettedSubmergedFraction);
  const postReynoldsNumber = reynoldsNumberFor(postRelativeVy, characteristicLengthM(spec), postDensityMix, postViscosityMix);
  next.wakeTurbulence = stepWakeTurbulence(
    next.wakeTurbulence,
    spec,
    settings,
    postWettedDisplaced,
    postWettedSubmergedFraction,
    postRelativeVy,
    postReynoldsNumber,
    postCavity.ventilationFraction,
    dt
  );
  const waterEntrySlamN = surfacePiercingDampingForceN(spec, settings, displacedVolumeRateM3ps, postRelativeVy, postWettedSubmergedFraction, massKg);
  if (waterEntrySlamN !== 0) {
    const postAddedMassKg = spec.addedMassCoefficient * settings.waterDensityKgM3 * postWettedDisplaced;
    const postAngleToSurfaceRad = normalizeAngle(next.object.angleRad - postSurfaceSlopeRad);
    const postCenterOfGravityYM = centerOfGravityRelativeYM(spec, next.object.waterFillFraction);
    const postCenterOfGravityXM = centerOfGravityWorldXM(postCenterOfGravityYM, postAngleToSurfaceRad);
    const slamCenter = waterEntrySlamCenterOfPressureFor(
      spec,
      postHydrostatics,
      displacedVolumeRateM3ps,
      postWettedSubmergedFraction
    );
    const rawSlamMomentNm = hydrodynamicLoadMomentFor(
      slamCenter.xM,
      slamCenter.yM,
      postCenterOfGravityXM,
      postCenterOfGravityYM,
      0,
      waterEntrySlamN
    );
    const slamMomentCapNm = Math.max(1, Math.abs(waterEntrySlamN) * characteristicLengthM(spec) * 0.65);
    next.lastWaterEntrySlamMomentNm = clamp(rawSlamMomentNm, -slamMomentCapNm, slamMomentCapNm);
    next.lastWaterEntrySlamCenterXM = slamCenter.xM;
    next.lastWaterEntrySlamCenterYM = slamCenter.yM;
    next.object.vyMps += (waterEntrySlamN / Math.max(0.001, massKg + postAddedMassKg)) * dt;
  }
  const shouldCoupleDisplacementWave = Math.abs(postRelativeVy) > 0.45 || state.phase === "falling" || state.impact !== null;
  const waveCoupledVolumeM3 =
    shouldCoupleDisplacementWave &&
    Math.abs(displacedVolumeDeltaM3) > Math.max(0.00002, volumeM3 * 0.00018) &&
    postSubmergedFraction > 0.001
      ? displacedVolumeDeltaM3
      : 0;
  if (waveCoupledVolumeM3 !== 0) {
    next.freeSurface = addFreeSurfaceDisplacementPulse(
      next.freeSurface,
      next.object.xM,
      waveCoupledVolumeM3,
      postRelativeVy,
      spec,
      settings
    );
  }
  next.lastDisplacedVolumeRateM3ps = displacedVolumeRateM3ps;
  next.lastWaterEntrySlamN = waterEntrySlamN;
  next.lastWaveCoupledVolumeM3 = waveCoupledVolumeM3;

  const horizontalArea = objectHeightM(spec) * objectDepthM(spec);
  const postHydrodynamicDrag = hydrodynamicDragFor(
    spec,
    settings,
    postWettedSubmergedFraction,
    postWaterKinematics,
    next.object.vxMps,
    next.object.vyMps,
    normalizeAngle(next.object.angleRad - postSurfaceSlopeRad)
  );
  const windPushN = 0.5 * settings.airDensityKgM3 * Math.max(0, settings.windSpeedMps) ** 2 * horizontalArea * 0.018 * (1 - postWettedSubmergedFraction);
  const horizontalAddedMassKg = spec.addedMassCoefficient * settings.waterDensityKgM3 * postWettedDisplaced;
  next.object.vxMps += ((postHydrodynamicDrag.forceXN + postWaveExcitation.forceXN + postHydrodynamicLift.forceXN + windPushN) / Math.max(0.001, massKg + horizontalAddedMassKg * 0.2)) * dt;
  next.object.xM = clamp(next.object.xM + next.object.vxMps * dt, -14, 14);

  const rotationDiagnostics = diagnosticsFor(next, spec, settings);
  const angularInertiaKgM2 =
    rotationDiagnostics.momentOfInertiaKgM2 + rotationDiagnostics.angularAddedInertiaKgM2;
  const angularAccelerationRadps2 =
    (
      rotationDiagnostics.restoringMomentNm +
      rotationDiagnostics.angularDragNm +
      rotationDiagnostics.rollExcitationTorqueNm +
      rotationDiagnostics.hydrodynamicLoadMomentNm +
      next.lastWaterEntrySlamMomentNm
    ) /
    Math.max(0.001, angularInertiaKgM2);
  next.object.angularVelocityRadps = clamp(next.object.angularVelocityRadps + angularAccelerationRadps2 * dt, -16, 16);
  next.object.angleRad = normalizeAngle(next.object.angleRad + next.object.angularVelocityRadps * dt);

  const nextDiagnostics = diagnosticsFor(next, spec, settings);
  if (!next.impact && previousSubmerged <= 0.001 && nextDiagnostics.submergedFraction > 0.001 && state.object.vyMps < -0.35) {
    const crossing = waterEntryCrossingFor(state, next, spec, settings, previousSurfaceY, postSurfaceY);
    if (crossing) {
      const entryWaterKinematics = resolvedWaterKinematicsAt(next, crossing.xM, crossing.surfaceYM, crossing.atS, settings);
      const surfaceSlopeRad = resolvedSurfaceSlopeAt(next, crossing.xM, crossing.atS, settings);
      const normalXM = -Math.sin(surfaceSlopeRad);
      const normalYM = Math.cos(surfaceSlopeRad);
      const relativeVxMps = crossing.objectVxMps - entryWaterKinematics.velocityXMps;
      const relativeVyMps = crossing.objectVyMps - entryWaterKinematics.velocityYMps;
      const impactRelativeSpeedMps = Math.max(0, -(relativeVxMps * normalXM + relativeVyMps * normalYM));
      if (impactRelativeSpeedMps > 0.15) {
        next = addImpactSplash(next, spec, settings, impactRelativeSpeedMps, crossing);
      }
    }
  }

  if (nextDiagnostics.effectiveDensityKgM3 >= settings.waterDensityKgM3 * 0.997 && nextDiagnostics.submergedFraction > 0.98) {
    next.phase = "sinking";
  } else if (nextDiagnostics.submergedFraction > 0 && nextDiagnostics.submergedFraction < 0.998) {
    next.phase = "floating";
  } else if (next.object.centerYM > nextDiagnostics.surfaceYM + objectHeightM(spec) / 2) {
    next.phase = "falling";
  }

  const staticBuoyancyError = Math.abs(nextDiagnostics.buoyancyN + nextDiagnostics.surfaceTensionForceN - nextDiagnostics.weightN) / Math.max(1, nextDiagnostics.weightN);
  const angularSettled = Math.abs(next.object.angularVelocityRadps) < 0.035 && Math.abs(nextDiagnostics.angleToSurfaceRad) < 0.085;
  if (nextDiagnostics.submergedFraction > 0.001 && nextDiagnostics.submergedFraction < 0.995 && Math.abs(next.object.vyMps) < 0.035 && staticBuoyancyError < 0.035 && angularSettled) {
    next.settledWindowS += dt;
    if (next.settledAtS === null && next.settledWindowS > 2.4) {
      next.settledAtS = next.timeS - next.settledWindowS;
    }
  } else {
    next.settledWindowS = 0;
  }

  const seabedCenterY = -settings.waterDepthM + objectHeightM(spec) / 2;
  if (next.object.centerYM <= seabedCenterY) {
    next = applySeabedContact(next, spec, settings, massKg, nextDiagnostics, dt, seabedCenterY);
  }

  return updateParticlesAndHistory(next, spec, settings, dt);
}

export function predictFloatOutcome(spec: ObjectSpec, settings: OceanSettings): FloatPrediction {
  const volume = objectVolumeM3(spec);
  const effectiveDensity = dryMassKg(spec) / volume;
  const fullWaterloggedDensity = effectiveDensity + spec.maxWaterFillFraction * settings.waterDensityKgM3;
  const equilibriumSubmergedFraction = effectiveDensity / settings.waterDensityKgM3;
  const criticalWaterFillFraction =
    effectiveDensity >= settings.waterDensityKgM3
      ? 0
      : fullWaterloggedDensity >= settings.waterDensityKgM3
        ? (settings.waterDensityKgM3 - effectiveDensity) / settings.waterDensityKgM3
        : null;
  const initialEquilibrium = solveFloatEquilibrium(spec, settings, 0);

  if (!initialEquilibrium) {
    return {
      outcome: "sinks-immediately",
      effectiveDensityKgM3: effectiveDensity,
      fullWaterloggedDensityKgM3: fullWaterloggedDensity,
      equilibriumSubmergedFraction,
      secondsUntilSink: 0,
      criticalWaterFillFraction,
      initialEquilibrium,
    };
  }

  if (spec.waterFillRatePerMinute <= 0 || fullWaterloggedDensity < settings.waterDensityKgM3) {
    return {
      outcome: "floats-indefinitely",
      effectiveDensityKgM3: effectiveDensity,
      fullWaterloggedDensityKgM3: fullWaterloggedDensity,
      equilibriumSubmergedFraction,
      secondsUntilSink: null,
      criticalWaterFillFraction,
      initialEquilibrium,
    };
  }

  if (criticalWaterFillFraction === null || criticalWaterFillFraction > spec.maxWaterFillFraction) {
    return {
      outcome: "floats-indefinitely",
      effectiveDensityKgM3: effectiveDensity,
      fullWaterloggedDensityKgM3: fullWaterloggedDensity,
      equilibriumSubmergedFraction,
      secondsUntilSink: null,
      criticalWaterFillFraction,
      initialEquilibrium,
    };
  }

  const secondsUntilSink = forecastWaterloggingSeconds(spec, settings);
  return {
    outcome: "waterlogs-then-sinks",
    effectiveDensityKgM3: effectiveDensity,
    fullWaterloggedDensityKgM3: fullWaterloggedDensity,
    equilibriumSubmergedFraction,
    secondsUntilSink,
    criticalWaterFillFraction,
    initialEquilibrium,
  };
}

export function solveFloatEquilibrium(spec: ObjectSpec, settings: OceanSettings, waterFillFraction = 0, preferredAngleRad?: number): FloatEquilibrium | null {
  const volume = objectVolumeM3(spec);
  const fillFraction = clamp(waterFillFraction, 0, spec.maxWaterFillFraction);
  const massKg = dryMassKg(spec) + fillFraction * volume * settings.waterDensityKgM3;
  const requiredDisplacementM3 = massKg / settings.waterDensityKgM3;
  const weightN = massKg * settings.gravity;
  const fullBuoyancyN = settings.waterDensityKgM3 * settings.gravity * volume;
  if (requiredDisplacementM3 <= 0 || weightN > fullBuoyancyN + maxSurfaceTensionSupportNFor(spec, settings) * 1.05) return null;

  const angles = equilibriumAngleCandidates(spec, preferredAngleRad);
  const candidates = angles
    .map((angleRad) => solveFloatEquilibriumAtAngle(spec, settings, fillFraction, requiredDisplacementM3, massKg, angleRad))
    .filter((candidate): candidate is FloatEquilibrium => candidate !== null);

  if (candidates.length === 0) return null;

  const momentScale = Math.max(1, massKg * settings.gravity * characteristicLengthM(spec));
  candidates.sort((left, right) => equilibriumScore(right, momentScale) - equilibriumScore(left, momentScale));
  return candidates[0];
}

export function equilibriumDeviationFor(state: SimulationState, spec: ObjectSpec, settings: OceanSettings): EquilibriumDeviation {
  const diagnostics = diagnosticsFor(state, spec, settings);
  const equilibrium = solveFloatEquilibrium(spec, settings, state.object.waterFillFraction, state.object.angleRad);
  const buoyancyErrorRatio = Math.abs(diagnostics.buoyancyN + diagnostics.surfaceTensionForceN - diagnostics.weightN) / Math.max(1, diagnostics.weightN);

  if (!equilibrium) {
    return {
      equilibrium: null,
      centerErrorM: null,
      draftErrorM: null,
      angleErrorRad: null,
      displacedVolumeErrorM3: null,
      buoyancyErrorRatio,
      verticalSpeedMps: Math.abs(state.object.vyMps),
      angularSpeedRadps: Math.abs(state.object.angularVelocityRadps),
      withinTolerance: false,
    };
  }

  const centerErrorM = state.object.centerYM - equilibrium.centerYM;
  const draftErrorM = diagnostics.submergedDepthM - equilibrium.submergedDepthM;
  const angleErrorRad = normalizeAngle(state.object.angleRad - equilibrium.angleRad);
  const displacedVolumeErrorM3 = diagnostics.displacedVolumeM3 - equilibrium.displacedVolumeM3;
  const verticalSpeedMps = Math.abs(state.object.vyMps);
  const angularSpeedRadps = Math.abs(state.object.angularVelocityRadps);
  const withinTolerance =
    Math.abs(draftErrorM) < 0.055 &&
    Math.abs(angleErrorRad) < 0.12 &&
    buoyancyErrorRatio < 0.08 &&
    verticalSpeedMps < 0.18 &&
    angularSpeedRadps < 0.22;

  return {
    equilibrium,
    centerErrorM,
    draftErrorM,
    angleErrorRad,
    displacedVolumeErrorM3,
    buoyancyErrorRatio,
    verticalSpeedMps,
    angularSpeedRadps,
    withinTolerance,
  };
}

export function forecastWaterloggingSeconds(spec: ObjectSpec, settings: OceanSettings): number | null {
  const volume = objectVolumeM3(spec);
  if (!solveFloatEquilibrium(spec, settings, 0, 0)) return 0;
  if (spec.maxWaterFillFraction <= 0) return null;

  const state = createSimulation(spec, 0.5, 0);
  state.phase = "floating";
  const maxForecastS = 60 * 60 * 24 * 14;
  let previousAngleRad = 0;
  for (let elapsedS = 0; elapsedS <= maxForecastS; ) {
    const massKg = dryMassKg(spec) + state.object.waterFillFraction * volume * settings.waterDensityKgM3;
    const requiredDisplacementM3 = massKg / settings.waterDensityKgM3;
    const equilibrium =
      elapsedS === 0
        ? solveFloatEquilibrium(spec, settings, state.object.waterFillFraction, previousAngleRad)
        : solveFloatEquilibriumAtAngle(spec, settings, state.object.waterFillFraction, requiredDisplacementM3, massKg, previousAngleRad) ??
          solveFloatEquilibrium(spec, settings, state.object.waterFillFraction, previousAngleRad);
    if (!equilibrium) return elapsedS;
    if (state.object.waterFillFraction >= spec.maxWaterFillFraction) return null;
    state.timeS = elapsedS;
    state.object.centerYM = equilibrium.centerYM;
    state.object.angleRad = equilibrium.angleRad;
    previousAngleRad = equilibrium.angleRad;
    const ingress = waterIngressFor(state, spec, settings, 0, equilibrium.submergedDepthM, equilibrium.submergedFraction);
    if (ingress.rateFractionPerSecond <= 1e-9) return null;
    const dtS = clamp(0.018 / ingress.rateFractionPerSecond, 5, 1800);
    const nextFillFraction = Math.min(spec.maxWaterFillFraction, state.object.waterFillFraction + ingress.rateFractionPerSecond * dtS);
    const effectiveDtS = (nextFillFraction - state.object.waterFillFraction) / ingress.rateFractionPerSecond;
    state.object.waterFillFraction = clamp(
      nextFillFraction,
      0,
      spec.maxWaterFillFraction
    );
    elapsedS += effectiveDtS;
  }
  return null;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Indefinite";
  if (!Number.isFinite(seconds)) return "Unknown";
  if (seconds < 0.1) return "0 s";
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} days`;
}

function equilibriumAngleCandidates(spec: ObjectSpec, preferredAngleRad?: number): number[] {
  const angles: number[] = [];
  const seen = new Set<string>();
  const addAngle = (angleRad: number) => {
    const folded = foldEquilibriumAngle(angleRad);
    const key = folded.toFixed(5);
    if (seen.has(key)) return;
    seen.add(key);
    angles.push(folded);
  };

  if (spec.shape === "sphere") {
    addAngle(0);
    return angles;
  }

  if (preferredAngleRad !== undefined) {
    [-15, -7.5, 0, 7.5, 15].forEach((offsetDeg) => addAngle(preferredAngleRad + (offsetDeg * Math.PI) / 180));
    addAngle(0);
    addAngle(Math.PI / 2);
    addAngle(-Math.PI / 2);
    return angles;
  }

  for (let degrees = -90; degrees <= 90; degrees += 5) {
    addAngle((degrees * Math.PI) / 180);
  }
  addAngle(0);
  return angles;
}

function solveFloatEquilibriumAtAngle(
  spec: ObjectSpec,
  settings: OceanSettings,
  waterFillFraction: number,
  requiredDisplacementM3: number,
  massKg: number,
  angleRad: number
): FloatEquilibrium | null {
  const boundedAngle = foldEquilibriumAngle(angleRad);
  const spanM = rotatedVerticalSpanM(spec, boundedAngle);
  const marginM = Math.max(0.05, characteristicLengthM(spec) * 0.28);
  let lowerCenterYM = -spanM / 2 - marginM;
  let upperCenterYM = spanM / 2 + marginM;
  const supportForceFor = (geometry: HydrostaticGeometry) => {
    const submergedFraction = clamp(geometry.volumeM3 / Math.max(0.000001, objectVolumeM3(spec)), 0, 1);
    const surfaceTension = surfaceTensionSupportFor(spec, settings, geometry, submergedFraction);
    return settings.waterDensityKgM3 * settings.gravity * geometry.volumeM3 + surfaceTension.forceN;
  };
  const supportBalanceFor = (geometry: HydrostaticGeometry) => supportForceFor(geometry) - massKg * settings.gravity;

  for (let attempts = 0; attempts < 3; attempts += 1) {
    const lowerGeometry = hydrostaticGeometryForState(spec, lowerCenterYM, 0, boundedAngle);
    const upperGeometry = hydrostaticGeometryForState(spec, upperCenterYM, 0, boundedAngle);
    if (supportBalanceFor(lowerGeometry) >= 0 || supportBalanceFor(upperGeometry) <= 0) break;
    lowerCenterYM -= spanM + marginM;
    upperCenterYM += spanM + marginM;
  }

  let bracketLowerCenterYM: number | null = null;
  let bracketUpperCenterYM: number | null = null;
  let previousCenterYM = upperCenterYM;
  let previousBalance = supportBalanceFor(hydrostaticGeometryForState(spec, previousCenterYM, 0, boundedAngle));
  for (let index = 1; index <= 128; index += 1) {
    const centerYM = upperCenterYM + (lowerCenterYM - upperCenterYM) * (index / 128);
    const geometry = hydrostaticGeometryForState(spec, centerYM, 0, boundedAngle);
    const balance = supportBalanceFor(geometry);
    if (balance >= 0 && previousBalance <= 0) {
      bracketLowerCenterYM = centerYM;
      bracketUpperCenterYM = previousCenterYM;
      break;
    }
    previousCenterYM = centerYM;
    previousBalance = balance;
  }

  if (bracketLowerCenterYM === null || bracketUpperCenterYM === null) {
    return null;
  }

  let lowerBracketYM = bracketLowerCenterYM;
  let upperBracketYM = bracketUpperCenterYM;
  for (let index = 0; index < 34; index += 1) {
    const midpointYM = (lowerBracketYM + upperBracketYM) / 2;
    const geometry = hydrostaticGeometryForState(spec, midpointYM, 0, boundedAngle);
    if (supportForceFor(geometry) > massKg * settings.gravity) {
      lowerBracketYM = midpointYM;
    } else {
      upperBracketYM = midpointYM;
    }
  }

  const centerYM = (lowerBracketYM + upperBracketYM) / 2;
  const geometry = hydrostaticGeometryForState(spec, centerYM, 0, boundedAngle);
  const displacedVolumeM3 = geometry.volumeM3;
  const equilibriumSurfaceTension = surfaceTensionSupportFor(spec, settings, geometry, clamp(displacedVolumeM3 / objectVolumeM3(spec), 0, 1));
  const supportErrorRatio = Math.abs(settings.waterDensityKgM3 * settings.gravity * displacedVolumeM3 + equilibriumSurfaceTension.forceN - massKg * settings.gravity) / Math.max(1, massKg * settings.gravity);
  if (supportErrorRatio > 0.025) {
    return null;
  }

  const volumeM3 = objectVolumeM3(spec);
  const submergedFraction = clamp(displacedVolumeM3 / volumeM3, 0, 1);
  const centerOfGravityYM = centerOfGravityRelativeYM(spec, waterFillFraction);
  const centerOfGravityXM = centerOfGravityWorldXM(centerOfGravityYM, boundedAngle);
  const buoyancyN = settings.waterDensityKgM3 * settings.gravity * displacedVolumeM3;
  const surfaceTension = equilibriumSurfaceTension;
  const weightN = massKg * settings.gravity;
  const internalFreeSurfaceMomentM4 = internalFreeSurfaceMomentM4For(spec, waterFillFraction);
  const internalFreeSurfaceGMReductionM = internalFreeSurfaceGMReductionMFor(settings, massKg, internalFreeSurfaceMomentM4);
  const hydrostaticMetacentricHeightM =
    displacedVolumeM3 > 0 ? geometry.centerOfBuoyancyYM + geometry.waterplaneSecondMomentM4 / displacedVolumeM3 - centerOfGravityYM : 0;
  const metacentricHeightM = hydrostaticMetacentricHeightM - internalFreeSurfaceGMReductionM;
  const hydrostaticRestoringMomentNm = hydrostaticRestoringMomentFor(
    buoyancyN,
    weightN,
    geometry.centerOfBuoyancyXM,
    centerOfGravityXM
  );
  const internalFreeSurfaceMomentNm = internalFreeSurfaceMomentNmFor(
    weightN,
    internalFreeSurfaceGMReductionM,
    boundedAngle,
    spec
  );
  const restoringMomentNm = hydrostaticRestoringMomentNm + internalFreeSurfaceMomentNm;
  const state = createSimulation(spec, 0.5, boundedAngle);
  state.phase = "floating";
  state.object.centerYM = centerYM;
  state.object.waterFillFraction = waterFillFraction;
  const ingress = waterIngressFor(state, spec, settings, 0, geometry.submergedDepthM, submergedFraction);

  return {
    canFloat: true,
    waterFillFraction,
    centerYM,
    angleRad: boundedAngle,
    displacedVolumeM3,
    submergedFraction,
    submergedDepthM: geometry.submergedDepthM,
    centerOfBuoyancyXM: geometry.centerOfBuoyancyXM,
    centerOfBuoyancyYM: geometry.centerOfBuoyancyYM,
    centerOfGravityXM,
    centerOfGravityYM,
    surfaceTensionForceN: surfaceTension.forceN,
    capillaryPerimeterM: surfaceTension.perimeterM,
    bondNumber: surfaceTension.bondNumber,
    metacentricHeightM,
    restoringMomentNm,
    internalFreeSurfaceMomentM4,
    internalFreeSurfaceGMReductionM,
    internalFreeSurfaceMomentNm,
    waterplaneAreaM2: geometry.waterplaneAreaM2,
    waterplaneSecondMomentM4: geometry.waterplaneSecondMomentM4,
    waterIngressRatePerMinute: ingress.rateFractionPerSecond * 60,
    leakFlowM3ps: ingress.leakFlowM3ps,
    hydrostaticHeadM: ingress.hydrostaticHeadM,
    externalPressurePa: ingress.externalPressurePa,
    internalAirPressurePa: ingress.internalAirPressurePa,
    pressureDifferentialPa: ingress.pressureDifferentialPa,
    trappedAirVolumeM3: ingress.trappedAirVolumeM3,
    rotationalStability: metacentricHeightM > 0.015 ? "positive" : metacentricHeightM < -0.015 ? "negative" : "neutral",
  };
}

function equilibriumScore(candidate: FloatEquilibrium, momentScaleNm: number): number {
  const momentPenalty = Math.abs(candidate.restoringMomentNm) / momentScaleNm;
  const stabilityBonus = candidate.rotationalStability === "positive" ? 2 : candidate.rotationalStability === "neutral" ? 0.35 : -2;
  const heelPenalty = Math.abs(candidate.angleRad) * 0.05;
  return stabilityBonus + candidate.metacentricHeightM * 1.6 + candidate.waterplaneAreaM2 * 0.015 - momentPenalty * 3 - heelPenalty;
}

function applySeabedContact(
  state: SimulationState,
  spec: ObjectSpec,
  settings: OceanSettings,
  massKg: number,
  diagnostics: StepDiagnostics,
  dtS: number,
  seabedCenterYM: number
): SimulationState {
  const dt = Math.max(0.001, dtS);
  const penetrationM = Math.max(0, seabedCenterYM - state.object.centerYM);
  const incomingVyMps = state.object.vyMps;
  const incomingVxMps = state.object.vxMps;
  const effectiveMassKg =
    massKg +
    spec.addedMassCoefficient *
      settings.waterDensityKgM3 *
      Math.max(0, diagnostics.wettedDisplacedVolumeM3 + diagnostics.wakeEntrainedMassKg / Math.max(1, settings.waterDensityKgM3)) *
      0.28;
  const normalLoadN = Math.max(0, diagnostics.weightN - diagnostics.buoyancyN - diagnostics.surfaceTensionForceN);
  const restitution = seabedRestitutionFor(spec, Math.abs(incomingVyMps), normalLoadN, diagnostics.weightN);
  const reboundVyMps = incomingVyMps < -0.08 ? -incomingVyMps * restitution : 0;
  const penetrationCorrectionVelocityMps = penetrationM / dt;
  const targetVyMps = Math.max(reboundVyMps, Math.min(0.45, penetrationCorrectionVelocityMps * 0.42));
  const normalImpulseNs =
    incomingVyMps < 0 ? effectiveMassKg * (targetVyMps - incomingVyMps) : effectiveMassKg * Math.max(0, penetrationCorrectionVelocityMps) * 0.18;
  const frictionCoefficient = seabedFrictionCoefficientFor(spec);
  const availableFrictionImpulseNs = frictionCoefficient * (Math.max(0, normalImpulseNs) + normalLoadN * dt);
  const desiredFrictionImpulseNs = -incomingVxMps * effectiveMassKg;
  const frictionImpulseNs = clamp(desiredFrictionImpulseNs, -availableFrictionImpulseNs, availableFrictionImpulseNs);
  const nextVxMps = Math.abs(incomingVxMps + frictionImpulseNs / Math.max(0.001, effectiveMassKg)) < 0.015 ? 0 : incomingVxMps + frictionImpulseNs / Math.max(0.001, effectiveMassKg);
  const angularDamping = clamp(0.18 + restitution * 0.45 - frictionCoefficient * 0.08, 0.08, 0.46);
  const impactEnergyJ = incomingVyMps < -0.04 ? 0.5 * effectiveMassKg * incomingVyMps ** 2 : 0;
  const settledOnBed = targetVyMps < 0.075 && Math.abs(nextVxMps) < 0.035 && Math.abs(state.object.angularVelocityRadps) < 0.22;

  return {
    ...state,
    object: {
      ...state.object,
      centerYM: seabedCenterYM,
      vxMps: nextVxMps,
      vyMps: settledOnBed ? 0 : targetVyMps,
      angularVelocityRadps: settledOnBed ? 0 : state.object.angularVelocityRadps * angularDamping,
    },
    heaveRadiationForceN: 0,
    wakeTurbulence: state.wakeTurbulence * (settledOnBed ? 0 : 0.35),
    phase: settledOnBed ? "sank" : "sinking",
    sankAtS: state.sankAtS ?? state.timeS,
    lastSeabedImpactEnergyJ: impactEnergyJ,
    lastSeabedNormalImpulseNs: Math.max(0, normalImpulseNs),
    lastSeabedFrictionImpulseNs: frictionImpulseNs,
    lastSeabedPenetrationM: penetrationM,
  };
}

function seabedRestitutionFor(spec: ObjectSpec, impactSpeedMps: number, normalLoadN: number, weightN: number): number {
  const materialHardness =
    spec.densityKgM3 > 5000
      ? 0.16
      : spec.densityKgM3 > 1800
        ? 0.1
        : spec.densityKgM3 > 900
          ? 0.055
          : 0.025;
  const shapeFactor = spec.shape === "sphere" ? 1.2 : spec.shape === "horizontalCylinder" ? 0.9 : 0.72;
  const loadDamping = clamp(normalLoadN / Math.max(1, weightN), 0, 1.4);
  const speedDamping = clamp(impactSpeedMps / 4, 0, 1);
  return clamp(materialHardness * shapeFactor * (0.9 - loadDamping * 0.28) * (0.65 + speedDamping * 0.35), 0.015, 0.22);
}

function seabedFrictionCoefficientFor(spec: ObjectSpec): number {
  if (spec.shape === "sphere") return 0.36;
  if (spec.shape === "horizontalCylinder") return 0.48;
  if (spec.shape === "verticalCylinder") return 0.58;
  return 0.66;
}

function surfacePiercingDampingForceN(
  spec: ObjectSpec,
  settings: OceanSettings,
  displacedVolumeRateM3ps: number,
  relativeVyMps: number,
  submergedFraction: number,
  massKg: number
): number {
  const piercingSpeedMps = Math.abs(relativeVyMps);
  if (Math.abs(displacedVolumeRateM3ps) <= 0 || piercingSpeedMps < 0.22 || submergedFraction <= 0) return 0;
  const froudeNumber = piercingSpeedMps / Math.sqrt(settings.gravity * characteristicLengthM(spec));
  const shapeCoefficient = waterEntrySlamCoefficientFor(spec, froudeNumber);
  const wettingRamp = clamp(0.18 + submergedFraction / 0.32, 0.18, 1.15);
  const direction = relativeVyMps < 0 ? 1 : -1;
  const rawForceN = settings.waterDensityKgM3 * Math.abs(displacedVolumeRateM3ps) * piercingSpeedMps * shapeCoefficient * wettingRamp;
  const forceCapN = massKg * settings.gravity * 52 + settings.waterDensityKgM3 * settings.gravity * objectVolumeM3(spec) * 9;
  return direction * clamp(rawForceN, 0, forceCapN);
}

function waterEntrySlamCenterOfPressureFor(
  spec: ObjectSpec,
  hydrostatics: HydrostaticGeometry,
  displacedVolumeRateM3ps: number,
  wettedSubmergedFraction: number
): { xM: number; yM: number } {
  const lengthM = characteristicLengthM(spec);
  const centerSign = Math.sign(hydrostatics.centerOfBuoyancyXM);
  const volumeRateScale = objectVolumeM3(spec) / Math.max(0.08, lengthM);
  const wettingBiasM =
    centerSign *
    lengthM *
    clamp(0.04 + (Math.abs(displacedVolumeRateM3ps) / Math.max(0.001, volumeRateScale)) * 0.018, 0.04, 0.18) *
    clamp(wettedSubmergedFraction / 0.28, 0.18, 1);
  return {
    xM: hydrostatics.centerOfBuoyancyXM + wettingBiasM,
    yM: hydrostatics.centerOfBuoyancyYM - lengthM * clamp(0.03 + wettedSubmergedFraction * 0.06, 0.03, 0.11),
  };
}

function waterEntrySlamCoefficientFor(spec: ObjectSpec, froudeNumber: number): number {
  const base =
    spec.shape === "box"
      ? 1.18
      : spec.shape === "verticalCylinder"
        ? 0.92
        : spec.shape === "horizontalCylinder"
          ? 0.78
          : 0.58;
  return base * clamp(0.82 + froudeNumber * 0.075, 0.84, 1.42);
}

type EntryCavityEffect = {
  collapseTimeS: number;
  depthRemainingM: number;
  ventilationFraction: number;
  wettedFraction: number;
};

type WaterEntryCrossing = {
  atS: number;
  fraction: number;
  objectAngleRad: number;
  objectVxMps: number;
  objectVyMps: number;
  surfaceYM: number;
  xM: number;
};

function entryCavityEffectFor(state: SimulationState, spec: ObjectSpec, submergedDepthM: number, submergedFraction: number): EntryCavityEffect {
  if (!state.impact || submergedFraction <= 0.001 || submergedDepthM <= 0) {
    return { collapseTimeS: 0, depthRemainingM: 0, ventilationFraction: 0, wettedFraction: 1 };
  }

  const ageS = Math.max(0, state.timeS - state.impact.atS);
  const collapseTimeS = Math.max(0.05, state.impact.cavityCollapseTimeS);
  if (ageS >= collapseTimeS) {
    return { collapseTimeS, depthRemainingM: 0, ventilationFraction: 0, wettedFraction: 1 };
  }

  const timeFraction = clamp(1 - ageS / collapseTimeS, 0, 1);
  const lengthM = characteristicLengthM(spec);
  const depthRemainingM = Math.max(0, state.impact.cavityDepthM * timeFraction - Math.max(0, submergedDepthM - state.impact.cavityDepthM) * 0.35);
  const depthCoupling = clamp(depthRemainingM / Math.max(0.08, lengthM * 0.8), 0, 1);
  const ventilationFraction = clamp(
    state.impact.initialVentilationFraction * timeFraction ** 1.35 * depthCoupling * clamp(submergedFraction / 0.12, 0, 1),
    0,
    0.9
  );
  return {
    collapseTimeS,
    depthRemainingM,
    ventilationFraction,
    wettedFraction: clamp(1 - ventilationFraction * 0.72, 0.28, 1),
  };
}

function waterEntryCrossingFor(
  previous: SimulationState,
  next: SimulationState,
  spec: ObjectSpec,
  settings: OceanSettings,
  previousSurfaceYM: number,
  nextSurfaceYM: number
): WaterEntryCrossing | null {
  const previousSurfaceSlopeRad = resolvedSurfaceSlopeAt(previous, previous.object.xM, previous.timeS, settings);
  const nextSurfaceSlopeRad = resolvedSurfaceSlopeAt(next, next.object.xM, next.timeS, settings);
  const previousAngleToSurfaceRad = normalizeAngle(previous.object.angleRad - previousSurfaceSlopeRad);
  const nextAngleToSurfaceRad = normalizeAngle(next.object.angleRad - nextSurfaceSlopeRad);
  const previousLowestYM = previous.object.centerYM - rotatedVerticalSpanM(spec, previousAngleToSurfaceRad) / 2;
  const nextLowestYM = next.object.centerYM - rotatedVerticalSpanM(spec, nextAngleToSurfaceRad) / 2;
  const previousClearanceM = previousLowestYM - previousSurfaceYM;
  const nextClearanceM = nextLowestYM - nextSurfaceYM;
  if (nextClearanceM > 0) return null;

  const fraction =
    previousClearanceM <= 0
      ? 0
      : clamp(previousClearanceM / Math.max(0.000001, previousClearanceM - nextClearanceM), 0, 1);
  const atS = previous.timeS + (next.timeS - previous.timeS) * fraction;
  const xM = lerp(previous.object.xM, next.object.xM, fraction);
  const objectAngleRad = normalizeAngle(previous.object.angleRad + normalizeAngle(next.object.angleRad - previous.object.angleRad) * fraction);
  const previousDiagnostics = diagnosticsFor(previous, spec, settings);
  const previousVerticalAccelerationMps2 =
    previousDiagnostics.netForceN / Math.max(0.001, previousDiagnostics.massKg + previousDiagnostics.addedMassKg * 0.1);
  const impactVySquared =
    previousClearanceM > 0
      ? Math.max(0, previous.object.vyMps ** 2 - 2 * previousVerticalAccelerationMps2 * previousClearanceM)
      : previous.object.vyMps ** 2;
  const impactVySign = previous.object.vyMps < 0 || previousVerticalAccelerationMps2 < 0 ? -1 : 1;
  return {
    atS,
    fraction,
    objectAngleRad,
    objectVxMps: lerp(previous.object.vxMps, next.object.vxMps, fraction),
    objectVyMps: impactVySign * Math.sqrt(impactVySquared),
    surfaceYM: lerp(previousSurfaceYM, nextSurfaceYM, fraction),
    xM,
  };
}

function impactSplashAsymmetryFor(horizontalEntrySpeedMps: number, entryAngleRad: number, impactSpeedMps: number): number {
  const speedRatio = horizontalEntrySpeedMps / Math.max(0.35, impactSpeedMps);
  const angleBias = Math.sin(entryAngleRad) * 0.34;
  return clamp(speedRatio * 0.86 + angleBias, -0.85, 0.85);
}

function addImpactSplash(
  state: SimulationState,
  spec: ObjectSpec,
  settings: OceanSettings,
  impactSpeedMps: number,
  crossing: WaterEntryCrossing
): SimulationState {
  const mass = currentMassKg(spec, state, settings);
  const kineticEnergyJ = 0.5 * mass * impactSpeedMps ** 2;
  const length = characteristicLengthM(spec);
  const entryWaterKinematics = resolvedWaterKinematicsAt(state, crossing.xM, crossing.surfaceYM, crossing.atS, settings);
  const horizontalEntrySpeedMps = crossing.objectVxMps - entryWaterKinematics.velocityXMps;
  const entryAngleRad = normalizeAngle(crossing.objectAngleRad - resolvedSurfaceSlopeAt(state, crossing.xM, crossing.atS, settings));
  const entryAreaM2 = Math.max(0.001, projectedVerticalAreaAtAngleM2(spec, crossing.objectAngleRad));
  const equivalentEntryDiameterM = Math.sqrt((4 * entryAreaM2) / Math.PI);
  const froudeNumber = impactSpeedMps / Math.sqrt(settings.gravity * length);
  const reynoldsNumber = reynoldsNumberFor(impactSpeedMps, length, settings.waterDensityKgM3, settings.waterDynamicViscosityPaS);
  const weberNumber = weberNumberFor(impactSpeedMps, length, settings.waterDensityKgM3, settings.surfaceTensionNpm);
  const splashAsymmetry = impactSplashAsymmetryFor(horizontalEntrySpeedMps, entryAngleRad, impactSpeedMps);
  const surfaceBreakupFactor = clamp(Math.log10(Math.max(1, weberNumber)) / 5, 0.18, 1.25);
  const splashHeightM = clamp(
    0.095 * (impactSpeedMps ** 2 / settings.gravity) * surfaceBreakupFactor + 0.24 * equivalentEntryDiameterM + 0.035 * froudeNumber * length,
    0.08,
    14
  );
  const splashEnergyJ = kineticEnergyJ * clamp((0.035 + 0.018 * froudeNumber) * surfaceBreakupFactor, 0.018, 0.2);
  const ejectedWaterKg = Math.min(settings.waterDensityKgM3 * objectVolumeM3(spec) * 0.65, splashEnergyJ / Math.max(0.1, settings.gravity * splashHeightM * 0.55));
  const cavityDepthM = clamp(
    0.07 * (impactSpeedMps ** 2 / settings.gravity) * surfaceBreakupFactor + equivalentEntryDiameterM * clamp(0.22 + froudeNumber * 0.035, 0.22, 0.62),
    0.03,
    9
  );
  const ventilationShapeFactor =
    spec.shape === "box"
      ? 1.06
      : spec.shape === "verticalCylinder"
        ? 0.98
        : spec.shape === "horizontalCylinder"
          ? 1.02
          : 0.86;
  const initialVentilationFraction = clamp(
    (0.16 + froudeNumber * 0.095 + surfaceBreakupFactor * 0.18 + Math.log10(Math.max(1, weberNumber)) * 0.028) * ventilationShapeFactor,
    0.18,
    0.88
  );
  const cavityCollapseTimeS = clamp(0.18 + Math.sqrt((2 * cavityDepthM) / settings.gravity) * 0.72 + froudeNumber * 0.16, 0.22, 4.2);
  const particleCount = Math.round(clamp(18 + ejectedWaterKg * 1.8 + froudeNumber * 9, 18, 170));
  const nextParticles = state.particles.slice();
  let nextId = state.nextParticleId;
  const spread = Math.max(0.18, objectWidthM(spec) * 0.55);
  const coupledWaterMassKg =
    settings.waterDensityKgM3 * objectVolumeM3(spec) * clamp(0.12 + froudeNumber * 0.028, 0.14, 0.42) * (0.8 + spec.addedMassCoefficient * 0.35);
  const retainedVelocityRatio = clamp(mass / (mass + coupledWaterMassKg), 0.2, 0.94);
  const inertia = objectMomentOfInertiaKgM2(spec, mass);
  const leverArmM = characteristicLengthM(spec) * clamp(Math.sin(crossing.objectAngleRad) * 0.34 + surfaceSlopeAt(crossing.xM, crossing.atS, settings) * 0.9, -0.55, 0.55);
  const angularImpulseRadps = inertia > 0 ? (mass * impactSpeedMps * leverArmM * 0.08) / inertia : 0;

  for (let index = 0; index < particleCount; index += 1) {
    const angle = (Math.random() * 0.82 + 0.24) * Math.PI;
    const asymmetryDirection = Math.sign(splashAsymmetry);
    const side =
      asymmetryDirection === 0
        ? index % 2 === 0
          ? -1
          : 1
        : Math.random() < 0.5 + Math.abs(splashAsymmetry) * 0.28
          ? asymmetryDirection
          : -asymmetryDirection;
    const directionalSpeedBias = clamp(1 + splashAsymmetry * side * 0.34, 0.68, 1.42);
    const speed = impactSpeedMps * (0.18 + Math.random() * 0.46) * directionalSpeedBias;
    nextParticles.push({
      id: nextId,
      xM: crossing.xM + side * Math.random() * spread * 0.55,
      yM: crossing.surfaceYM + Math.random() * 0.08,
      vxMps: Math.cos(angle) * speed * side + horizontalEntrySpeedMps * 0.24 + settings.currentSpeedMps * 0.3,
      vyMps: Math.abs(Math.sin(angle) * speed) + Math.sqrt(2 * settings.gravity * splashHeightM) * (0.12 + Math.random() * 0.28),
      ageS: 0,
      lifetimeS: 0.65 + Math.random() * 1.45,
      radiusM: 0.0035 + Math.random() * 0.018,
    });
    nextId += 1;
  }

  return {
    ...state,
    object: {
      ...state.object,
      angularVelocityRadps: clamp(state.object.angularVelocityRadps + angularImpulseRadps, -10, 10),
      vyMps: state.object.vyMps < 0 ? state.object.vyMps * retainedVelocityRatio : state.object.vyMps,
    },
    impact: {
      atS: crossing.atS,
      substepFraction: crossing.fraction,
      surfaceYM: crossing.surfaceYM,
      impactSpeedMps,
      horizontalEntrySpeedMps,
      entryAngleRad,
      kineticEnergyJ,
      froudeNumber,
      reynoldsNumber,
      weberNumber,
      splashAsymmetry,
      splashEnergyJ,
      coupledWaterMassKg,
      cavityDepthM,
      cavityCollapseTimeS,
      initialVentilationFraction,
      splashHeightM,
      ejectedWaterKg,
    },
    nextParticleId: nextId + 2,
    particles: nextParticles,
    freeSurface: addFreeSurfaceImpact(state.freeSurface, crossing.xM, impactSpeedMps, splashAsymmetry, splashHeightM, ejectedWaterKg, settings),
    ripples: [
      ...state.ripples,
      {
        id: nextId,
        xM: crossing.xM,
        ageS: 0,
        lifetimeS: clamp(1.8 + froudeNumber * 0.8, 2, 6.5),
        amplitudeM: clamp(0.06 + splashHeightM * 0.11, 0.06, 1.3),
        speedMps: clamp(1.1 + impactSpeedMps * 0.18, 1.2, 4.8),
      },
    ],
  };
}

function updateParticlesAndHistory(state: SimulationState, spec: ObjectSpec, settings: OceanSettings, dtS: number): SimulationState {
  const dt = clamp(dtS, 0, 0.06);
  let freeSurface = stepFreeSurface(state.freeSurface, settings, dt);
  const surfaceSampleState = { ...state, timeS: state.timeS + dt, freeSurface };
  const particles: SplashParticle[] = [];
  let sprayReentryCount = 0;
  let sprayReentryEnergyJ = 0;
  let sprayReentryMassKg = 0;
  for (const particle of state.particles) {
    const nextParticle = stepSplashParticle(particle, settings, dt);
    const surfaceY = resolvedSurfaceElevationAt(surfaceSampleState, nextParticle.xM, state.timeS + dt, settings);
    const surfaceVy = resolvedSurfaceVerticalVelocityAt(surfaceSampleState, nextParticle.xM, state.timeS + dt, settings);
    if (nextParticle.yM <= surfaceY && particle.yM > surfaceY && nextParticle.vyMps < surfaceVy) {
      const massKg = splashParticleMassKg(particle, settings);
      const relativeSpeedMps = Math.hypot(nextParticle.vxMps - settings.currentSpeedMps, nextParticle.vyMps - surfaceVy);
      const energyJ = 0.5 * massKg * relativeSpeedMps ** 2;
      freeSurface = addFreeSurfaceDropletImpact(freeSurface, nextParticle.xM, energyJ, massKg, Math.max(0, surfaceVy - nextParticle.vyMps), settings);
      surfaceSampleState.freeSurface = freeSurface;
      sprayReentryCount += 1;
      sprayReentryEnergyJ += energyJ;
      sprayReentryMassKg += massKg;
    } else if (nextParticle.ageS < nextParticle.lifetimeS && nextParticle.yM > surfaceY - 0.18) {
      particles.push(nextParticle);
    }
  }
  const ripples = state.ripples
    .map((ripple) => ({ ...ripple, ageS: ripple.ageS + dt }))
    .filter((ripple) => ripple.ageS < ripple.lifetimeS);
  const diagnostics = diagnosticsFor(state, spec, settings);
  const shouldSample = state.history.length === 0 || state.timeS - state.history[state.history.length - 1].timeS >= 0.16;
  const history = shouldSample
    ? [
        ...state.history.slice(-420),
        {
          timeS: state.timeS,
          angleRad: state.object.angleRad,
          centerYM: state.object.centerYM,
          velocityYMps: state.object.vyMps,
          submergedFraction: diagnostics.submergedFraction,
          effectiveDensityKgM3: diagnostics.effectiveDensityKgM3,
        },
      ]
    : state.history;
  return {
    ...state,
    particles,
    ripples,
    freeSurface,
    history,
    lastSprayReentryCount: sprayReentryCount,
    lastSprayReentryEnergyJ: sprayReentryEnergyJ,
    lastSprayReentryMassKg: sprayReentryMassKg,
  };
}

function stepSplashParticle(particle: SplashParticle, settings: OceanSettings, dtS: number): SplashParticle {
  const dt = clamp(dtS, 0, 0.06);
  const radiusM = clamp(particle.radiusM, 0.0015, 0.04);
  const massKg = splashParticleMassKg(particle, settings);
  const areaM2 = Math.PI * radiusM ** 2;
  const windVelocityXMps = settings.windSpeedMps * 0.16 + settings.currentSpeedMps * 0.12;
  const relativeVxMps = particle.vxMps - windVelocityXMps;
  const relativeVyMps = particle.vyMps;
  const relativeSpeedMps = Math.hypot(relativeVxMps, relativeVyMps);
  const reynolds = reynoldsNumberFor(relativeSpeedMps, radiusM * 2, settings.airDensityKgM3, settings.airDynamicViscosityPaS);
  const dragCoefficient = clamp(0.45 + 18 / Math.sqrt(Math.max(1, reynolds)), 0.45, 2.7);
  const dragScale = (0.5 * settings.airDensityKgM3 * dragCoefficient * areaM2 * relativeSpeedMps) / Math.max(0.000001, massKg);
  const ax = -dragScale * relativeVxMps;
  const ay = -settings.gravity - dragScale * relativeVyMps;
  const vx = particle.vxMps + ax * dt;
  const vy = particle.vyMps + ay * dt;
  return {
    ...particle,
    ageS: particle.ageS + dt,
    xM: particle.xM + vx * dt,
    yM: particle.yM + vy * dt,
    vxMps: vx,
    vyMps: vy,
  };
}

function splashParticleMassKg(particle: SplashParticle, settings: OceanSettings): number {
  const radiusM = clamp(particle.radiusM, 0.0015, 0.04);
  return (4 / 3) * Math.PI * radiusM ** 3 * settings.waterDensityKgM3;
}

function crossSectionAreaAtDepthM2(spec: ObjectSpec, depthFromBottomM: number): number {
  const height = objectHeightM(spec);
  const y = clamp(depthFromBottomM, 0, height);
  if (y <= 0 || y >= height) {
    if (spec.shape === "box" || spec.shape === "verticalCylinder") return y <= 0 ? 0 : crossSectionAreaAtDepthM2(spec, height * 0.5);
    return 0;
  }

  switch (spec.shape) {
    case "sphere": {
      const radius = height / 2;
      const offset = y - radius;
      return Math.PI * Math.max(0, radius ** 2 - offset ** 2);
    }
    case "horizontalCylinder": {
      const radius = height / 2;
      const offset = y - radius;
      const chordM = 2 * Math.sqrt(Math.max(0, radius ** 2 - offset ** 2));
      return chordM * objectLengthM(spec);
    }
    case "verticalCylinder": {
      const radius = objectWidthM(spec) / 2;
      return Math.PI * radius ** 2;
    }
    case "box":
    default:
      return objectWidthM(spec) * objectDepthM(spec);
  }
}

function localThicknessM(spec: ObjectSpec, localX: number, localY: number): number {
  const width = objectWidthM(spec);
  const height = objectHeightM(spec);
  switch (spec.shape) {
    case "sphere": {
      const radius = height / 2;
      const radialSquared = localX ** 2 + localY ** 2;
      if (radialSquared > radius ** 2) return 0;
      return 2 * Math.sqrt(Math.max(0, radius ** 2 - radialSquared));
    }
    case "horizontalCylinder": {
      if (Math.abs(localX) > width / 2) return 0;
      const radius = height / 2;
      if (Math.abs(localY) > radius) return 0;
      return 2 * Math.sqrt(Math.max(0, radius ** 2 - localY ** 2));
    }
    case "verticalCylinder": {
      if (Math.abs(localY) > height / 2) return 0;
      const radius = width / 2;
      if (Math.abs(localX) > radius) return 0;
      return 2 * Math.sqrt(Math.max(0, radius ** 2 - localX ** 2));
    }
    case "box":
    default:
      return Math.abs(localX) <= width / 2 && Math.abs(localY) <= height / 2 ? objectDepthM(spec) : 0;
  }
}

function rotatedVerticalSpanM(spec: ObjectSpec, angleRad: number): number {
  const width = objectWidthM(spec);
  const height = objectHeightM(spec);
  const sin = Math.abs(Math.sin(angleRad));
  const cos = Math.abs(Math.cos(angleRad));
  if (spec.shape === "sphere") return height;
  return width * sin + height * cos;
}

function waterplaneSecondMomentAtDepthM4(spec: ObjectSpec, depthFromBottomM: number): number {
  const height = objectHeightM(spec);
  const y = clamp(depthFromBottomM, 0, height);
  if (y <= 0 || y >= height) return 0;

  switch (spec.shape) {
    case "sphere": {
      const radius = height / 2;
      const offset = y - radius;
      const waterlineRadiusM = Math.sqrt(Math.max(0, radius ** 2 - offset ** 2));
      return (Math.PI * waterlineRadiusM ** 4) / 4;
    }
    case "horizontalCylinder": {
      const radius = height / 2;
      const offset = y - radius;
      const waterlineChordM = 2 * Math.sqrt(Math.max(0, radius ** 2 - offset ** 2));
      const lengthM = objectLengthM(spec);
      return (waterlineChordM * lengthM ** 3) / 12;
    }
    case "verticalCylinder": {
      const radius = objectWidthM(spec) / 2;
      return (Math.PI * radius ** 4) / 4;
    }
    case "box":
    default: {
      const widthM = objectWidthM(spec);
      return (objectDepthM(spec) * widthM ** 3) / 12;
    }
  }
}

function centerOfGravityRelativeYM(spec: ObjectSpec, waterFillFraction: number): number {
  return -objectHeightM(spec) * 0.18 * clamp(waterFillFraction, 0, 1);
}

function centerOfGravityWorldXM(centerOfGravityYM: number, angleToSurfaceRad: number): number {
  return -centerOfGravityYM * Math.sin(angleToSurfaceRad);
}

type SurfaceTensionSupport = {
  bondNumber: number;
  forceN: number;
  perimeterM: number;
};

function surfaceTensionSupportFor(
  spec: ObjectSpec,
  settings: OceanSettings,
  geometry: HydrostaticGeometry,
  submergedFraction: number
): SurfaceTensionSupport {
  const bondNumber = bondNumberFor(spec, settings);
  if (settings.surfaceTensionNpm <= 0 || geometry.waterplaneAreaM2 <= 0 || submergedFraction <= 0 || submergedFraction >= 0.998) {
    return { bondNumber, forceN: 0, perimeterM: 0 };
  }

  const perimeterM = waterlineContactPerimeterMFor(spec, geometry.waterplaneAreaM2);
  const meniscusRamp = clamp(submergedFraction / 0.012, 0, 1) * clamp((1 - submergedFraction) / 0.035, 0, 1);
  const capillaryCoefficient = capillaryLiftCoefficientFor(spec);
  return {
    bondNumber,
    forceN: settings.surfaceTensionNpm * perimeterM * capillaryCoefficient * meniscusRamp,
    perimeterM,
  };
}

function maxSurfaceTensionSupportNFor(spec: ObjectSpec, settings: OceanSettings): number {
  return settings.surfaceTensionNpm * maxWaterlineContactPerimeterMFor(spec) * capillaryLiftCoefficientFor(spec);
}

function bondNumberFor(spec: ObjectSpec, settings: OceanSettings): number {
  const lengthM = Math.max(0.001, (objectHeightM(spec) * objectWidthM(spec) * objectDepthM(spec)) ** (1 / 3));
  return (settings.waterDensityKgM3 * settings.gravity * lengthM ** 2) / Math.max(1e-6, settings.surfaceTensionNpm);
}

function capillaryLiftCoefficientFor(spec: ObjectSpec): number {
  if (spec.shape === "sphere") return 0.82;
  if (spec.shape === "horizontalCylinder") return 0.76;
  if (spec.shape === "verticalCylinder") return 0.72;
  return 0.68;
}

function waterlineContactPerimeterMFor(spec: ObjectSpec, waterplaneAreaM2: number): number {
  if (waterplaneAreaM2 <= 0) return 0;
  const width = objectWidthM(spec);
  const depth = objectDepthM(spec);
  const height = objectHeightM(spec);

  switch (spec.shape) {
    case "sphere": {
      const waterlineRadiusM = Math.sqrt(waterplaneAreaM2 / Math.PI);
      return clamp(2 * Math.PI * waterlineRadiusM, 0, maxWaterlineContactPerimeterMFor(spec));
    }
    case "horizontalCylinder": {
      const lengthM = objectLengthM(spec);
      const chordM = clamp(waterplaneAreaM2 / Math.max(0.001, lengthM), 0, height);
      return clamp(2 * lengthM + 2 * chordM, 0, maxWaterlineContactPerimeterMFor(spec));
    }
    case "verticalCylinder": {
      const radius = width / 2;
      const fullAreaM2 = Math.PI * radius ** 2;
      const areaRamp = clamp(Math.sqrt(waterplaneAreaM2 / Math.max(0.000001, fullAreaM2)), 0.15, 1);
      return Math.PI * width * areaRamp;
    }
    case "box":
    default: {
      const fullAreaM2 = width * depth;
      const areaRamp = clamp(Math.sqrt(waterplaneAreaM2 / Math.max(0.000001, fullAreaM2)), 0.15, 1.25);
      return 2 * (width + depth) * areaRamp;
    }
  }
}

function maxWaterlineContactPerimeterMFor(spec: ObjectSpec): number {
  const width = objectWidthM(spec);
  const depth = objectDepthM(spec);
  const height = objectHeightM(spec);
  if (spec.shape === "sphere") return Math.PI * width;
  if (spec.shape === "horizontalCylinder") return 2 * objectLengthM(spec) + 2 * height;
  if (spec.shape === "verticalCylinder") return Math.PI * width;
  return 2 * (width + depth);
}

function internalFreeSurfaceMomentM4For(spec: ObjectSpec, waterFillFraction: number): number {
  const maxFillFraction = Math.max(0, spec.maxWaterFillFraction);
  const fillFraction = clamp(waterFillFraction, 0, maxFillFraction);
  if (maxFillFraction <= 0 || fillFraction <= 0 || fillFraction >= maxFillFraction) return 0;

  const fillRatio = clamp(fillFraction / Math.max(0.001, maxFillFraction), 0, 1);
  const endRamp = clamp(fillRatio / 0.04, 0, 1) * clamp((1 - fillRatio) / 0.04, 0, 1);
  if (endRamp <= 0) return 0;

  const compartmentScale = maxFillFraction ** (4 / 3);
  const width = objectWidthM(spec);
  const depth = objectDepthM(spec);
  const height = objectHeightM(spec);
  let freeSurfaceMomentM4 = 0;

  switch (spec.shape) {
    case "sphere": {
      const radius = height / 2;
      const offsetFromCenterM = fillRatio * height - radius;
      const surfaceRadiusM = Math.sqrt(Math.max(0, radius ** 2 - offsetFromCenterM ** 2));
      freeSurfaceMomentM4 = (Math.PI * surfaceRadiusM ** 4) / 4;
      break;
    }
    case "horizontalCylinder": {
      const radius = height / 2;
      const offsetFromCenterM = fillRatio * height - radius;
      const freeSurfaceChordM = 2 * Math.sqrt(Math.max(0, radius ** 2 - offsetFromCenterM ** 2));
      freeSurfaceMomentM4 = (freeSurfaceChordM * objectLengthM(spec) ** 3) / 12;
      break;
    }
    case "verticalCylinder": {
      const radius = width / 2;
      freeSurfaceMomentM4 = (Math.PI * radius ** 4) / 4;
      break;
    }
    case "box":
    default:
      freeSurfaceMomentM4 = (depth * width ** 3) / 12;
      break;
  }

  return freeSurfaceMomentM4 * compartmentScale * endRamp;
}

function internalFreeSurfaceGMReductionMFor(settings: OceanSettings, massKg: number, internalFreeSurfaceMomentM4: number): number {
  if (massKg <= 0 || internalFreeSurfaceMomentM4 <= 0) return 0;
  return (settings.waterDensityKgM3 * internalFreeSurfaceMomentM4) / massKg;
}

function internalFreeSurfaceMomentNmFor(
  weightN: number,
  internalFreeSurfaceGMReductionM: number,
  angleToSurfaceRad: number,
  spec: ObjectSpec
): number {
  if (weightN <= 0 || internalFreeSurfaceGMReductionM <= 0) return 0;
  const rawMomentNm = weightN * internalFreeSurfaceGMReductionM * Math.sin(angleToSurfaceRad);
  const capNm = Math.max(1, weightN * characteristicLengthM(spec) * 0.65);
  return clamp(rawMomentNm, -capNm, capNm);
}

function pressureReliefCoefficientFor(spec: ObjectSpec): number {
  if (spec.vented === true) return 1;
  return clamp(spec.airReliefCoefficient ?? 0, 0, 1);
}

function trappedAirVolumeM3For(spec: ObjectSpec, waterFillFraction: number): number {
  const floodableVolumeM3 = objectVolumeM3(spec) * Math.max(0, spec.maxWaterFillFraction);
  const waterInsideM3 = objectVolumeM3(spec) * clamp(waterFillFraction, 0, spec.maxWaterFillFraction);
  return Math.max(floodableVolumeM3 * 0.015, floodableVolumeM3 - waterInsideM3);
}

function internalAirPressurePaFor(spec: ObjectSpec, waterFillFraction: number): number {
  if (spec.vented === true || spec.maxWaterFillFraction <= 0) return ambientAirPressurePa;
  const initialAirVolumeM3 = Math.max(0.000001, objectVolumeM3(spec) * spec.maxWaterFillFraction);
  const currentAirVolumeM3 = Math.max(0.000001, trappedAirVolumeM3For(spec, waterFillFraction));
  return ambientAirPressurePa * (initialAirVolumeM3 / currentAirVolumeM3);
}

function waterIngressFor(
  state: SimulationState,
  spec: ObjectSpec,
  settings: OceanSettings,
  surfaceYM: number,
  submergedDepthM: number,
  submergedFraction: number
): {
  externalPressurePa: number;
  hydrostaticHeadM: number;
  internalAirPressurePa: number;
  leakFlowM3ps: number;
  pressureDifferentialPa: number;
  rateFractionPerSecond: number;
  trappedAirVolumeM3: number;
} {
  const emptyIngress = {
    externalPressurePa: 0,
    hydrostaticHeadM: 0,
    internalAirPressurePa: ambientAirPressurePa,
    leakFlowM3ps: 0,
    pressureDifferentialPa: 0,
    rateFractionPerSecond: 0,
    trappedAirVolumeM3: 0,
  };
  if (spec.maxWaterFillFraction <= 0 || submergedFraction <= 0) {
    return emptyIngress;
  }

  const volumeM3 = objectVolumeM3(spec);
  const fillRemainingFraction = clamp(spec.maxWaterFillFraction - state.object.waterFillFraction, 0, spec.maxWaterFillFraction);
  if (fillRemainingFraction <= 0) {
    return {
      ...emptyIngress,
      internalAirPressurePa: internalAirPressurePaFor(spec, state.object.waterFillFraction),
      trappedAirVolumeM3: trappedAirVolumeM3For(spec, state.object.waterFillFraction),
    };
  }

  const leakHeadM =
    spec.leakAreaM2 && spec.leakAreaM2 > 0
      ? clamp(submergedDepthM - objectHeightM(spec) * 0.12 + Math.max(0, -surfaceYM) * 0.08, 0, Math.max(0.05, submergedDepthM))
      : 0;
  const discharge = spec.leakDischargeCoefficient ?? 0.62;
  const internalAirPressurePa = internalAirPressurePaFor(spec, state.object.waterFillFraction);
  const trappedAirVolumeM3 = trappedAirVolumeM3For(spec, state.object.waterFillFraction);
  const externalPressurePa = settings.waterDensityKgM3 * settings.gravity * leakHeadM;
  const pressureRelief = pressureReliefCoefficientFor(spec);
  const internalBackPressurePa = Math.max(0, internalAirPressurePa - ambientAirPressurePa) * (1 - pressureRelief);
  const pressureDifferentialPa = Math.max(0, externalPressurePa - internalBackPressurePa);
  const pressureLimitedHeadM = pressureDifferentialPa / Math.max(1, settings.waterDensityKgM3 * settings.gravity);
  const airLockFactor =
    spec.vented === true ? 1 : clamp(pressureRelief + (1 - pressureRelief) * (1 - state.object.waterFillFraction / Math.max(0.001, spec.maxWaterFillFraction)), 0.04, 1);
  const leakFlowM3ps =
    spec.leakAreaM2 && pressureLimitedHeadM > 0
      ? discharge * spec.leakAreaM2 * Math.sqrt(2 * settings.gravity * pressureLimitedHeadM) * airLockFactor
      : 0;

  const absorptionRatePerMinute = spec.porousAbsorptionRatePerMinute ?? (spec.leakAreaM2 ? 0 : spec.waterFillRatePerMinute);
  const saturationFactor = clamp(fillRemainingFraction / Math.max(0.001, spec.maxWaterFillFraction), 0, 1);
  const absorptionFractionPerSecond = (Math.max(0, absorptionRatePerMinute) / 60) * submergedFraction * saturationFactor;
  const leakFractionPerSecond = leakFlowM3ps / Math.max(0.000001, volumeM3);
  const fallbackFractionPerSecond =
    leakFlowM3ps <= 0 && absorptionFractionPerSecond <= 0 ? (Math.max(0, spec.waterFillRatePerMinute) / 60) * submergedFraction * saturationFactor : 0;
  const maxRateToRemaining = fillRemainingFraction / 0.05;

  return {
    hydrostaticHeadM: leakHeadM,
    externalPressurePa,
    internalAirPressurePa,
    leakFlowM3ps,
    pressureDifferentialPa,
    rateFractionPerSecond: clamp(leakFractionPerSecond + absorptionFractionPerSecond + fallbackFractionPerSecond, 0, maxRateToRemaining),
    trappedAirVolumeM3,
  };
}

function hydrostaticRestoringMomentFor(
  buoyancyN: number,
  weightN: number,
  centerOfBuoyancyXM: number,
  centerOfGravityXM: number
): number {
  if (buoyancyN <= 0 || weightN <= 0) return 0;
  return centerOfBuoyancyXM * buoyancyN - centerOfGravityXM * weightN;
}

function hydrodynamicCenterOfPressureFor(
  spec: ObjectSpec,
  centerOfBuoyancyXM: number,
  centerOfBuoyancyYM: number,
  submergedFraction: number
): { xM: number; yM: number } {
  const verticalBiasM = characteristicLengthM(spec) * clamp(0.05 + submergedFraction * 0.1, 0.04, 0.16);
  return {
    xM: centerOfBuoyancyXM,
    yM: centerOfBuoyancyYM - verticalBiasM,
  };
}

function hydrodynamicLoadMomentFor(
  centerOfPressureXM: number,
  centerOfPressureYM: number,
  centerOfGravityXM: number,
  centerOfGravityYM: number,
  forceXN: number,
  forceYN: number
): number {
  const leverXM = centerOfPressureXM - centerOfGravityXM;
  const leverYM = centerOfPressureYM - centerOfGravityYM;
  return leverXM * forceYN - leverYM * forceXN;
}

function heaveDampingForceN(displacedVolumeM3: number, submergedFraction: number, relativeVyMps: number, settings: OceanSettings): number {
  if (displacedVolumeM3 <= 0 || submergedFraction <= 0) return 0;
  const entrainedMassKg = settings.waterDensityKgM3 * displacedVolumeM3;
  const dampingPerSecond = 1.8 + 5.2 * clamp(submergedFraction, 0, 1);
  return -entrainedMassKg * dampingPerSecond * relativeVyMps;
}

type WakeHydrodynamics = {
  dragN: number;
  entrainedMassKg: number;
  sheddingFrequencyHz: number;
};

function wakeHydrodynamicsFor(
  spec: ObjectSpec,
  settings: OceanSettings,
  displacedVolumeM3: number,
  submergedFraction: number,
  relativeVyMps: number,
  reynoldsNumber: number,
  wakeTurbulence: number,
  cavityVentilationFraction: number,
  angleRad: number
): WakeHydrodynamics {
  if (displacedVolumeM3 <= 0 || submergedFraction <= 0.001) {
    return { dragN: 0, entrainedMassKg: 0, sheddingFrequencyHz: 0 };
  }

  const speedMps = Math.abs(relativeVyMps);
  if (speedMps < 0.025) {
    return { dragN: 0, entrainedMassKg: 0, sheddingFrequencyHz: 0 };
  }

  const lengthM = characteristicLengthM(spec);
  const turbulentRamp = turbulentWakeRampFor(reynoldsNumber);
  const wake = clamp(wakeTurbulence, 0, 1.8);
  const ventilation = clamp(cavityVentilationFraction, 0, 0.9);
  const wakeIntensity = clamp((wake * 0.7 + ventilation * 0.5) * turbulentRamp * clamp(submergedFraction / 0.12, 0, 1), 0, 1.8);
  const projectedAreaM2 = projectedVerticalAreaAtAngleM2(spec, angleRad);
  const wakeCd = wakeDragCoefficientFor(spec, wakeIntensity);
  const dragDirection = relativeVyMps === 0 ? 0 : -Math.sign(relativeVyMps);
  const dragN =
    dragDirection *
    0.5 *
    settings.waterDensityKgM3 *
    wakeCd *
    projectedAreaM2 *
    speedMps ** 2 *
    clamp(0.35 + submergedFraction * 0.75, 0.35, 1.1);
  const displacedWaterMassKg = settings.waterDensityKgM3 * displacedVolumeM3;
  const entrainedMassKg =
    displacedWaterMassKg * clamp((0.08 + wakeIntensity * 0.38 + ventilation * 0.16) * submergedFraction, 0, 0.82);
  const sheddingFrequencyHz = strouhalNumberFor(spec, reynoldsNumber) * speedMps / Math.max(0.05, lengthM);

  return {
    dragN,
    entrainedMassKg,
    sheddingFrequencyHz,
  };
}

function stepWakeTurbulence(
  previousWakeTurbulence: number,
  spec: ObjectSpec,
  settings: OceanSettings,
  displacedVolumeM3: number,
  submergedFraction: number,
  relativeVyMps: number,
  reynoldsNumber: number,
  cavityVentilationFraction: number,
  dtS: number
): number {
  const previous = clamp(Number.isFinite(previousWakeTurbulence) ? previousWakeTurbulence : 0, 0, 1.8);
  const dt = Math.max(0, dtS);
  if (dt <= 0) return previous;

  const speedMps = Math.abs(relativeVyMps);
  if (displacedVolumeM3 <= 0 || submergedFraction <= 0.001 || speedMps < 0.04) {
    return previous * Math.exp(-dt / 0.85);
  }

  const lengthM = characteristicLengthM(spec);
  const froudeNumber = speedMps / Math.sqrt(settings.gravity * lengthM);
  const turbulentRamp = turbulentWakeRampFor(reynoldsNumber);
  const wettingRamp = clamp(submergedFraction / 0.18, 0, 1);
  const cavityKick = cavityVentilationFraction * clamp(speedMps / 1.2, 0, 1) * 0.78;
  const target = clamp((0.14 + froudeNumber * 0.18) * turbulentRamp * wettingRamp + cavityKick, 0, 1.8);
  const timeScaleS =
    target > previous
      ? clamp(lengthM / Math.max(0.08, speedMps) * 0.62, 0.05, 0.9)
      : clamp(lengthM / Math.max(0.08, speedMps) * 3.8 + 0.45, 0.65, 5.5);
  const alpha = 1 - Math.exp(-dt / timeScaleS);
  return clamp(previous + (target - previous) * alpha, 0, 1.8);
}

function turbulentWakeRampFor(reynoldsNumber: number): number {
  return clamp((Math.log10(Math.max(10, reynoldsNumber)) - 4) / 2.1, 0, 1);
}

function wakeDragCoefficientFor(spec: ObjectSpec, wakeIntensity: number): number {
  const shapeFactor =
    spec.shape === "box"
      ? 1.12
      : spec.shape === "verticalCylinder"
        ? 0.96
        : spec.shape === "horizontalCylinder"
          ? 0.88
          : 0.62;
  return shapeFactor * clamp(0.08 + wakeIntensity * 0.42, 0, 0.92);
}

function strouhalNumberFor(spec: ObjectSpec, reynoldsNumber: number): number {
  const highReRamp = turbulentWakeRampFor(reynoldsNumber);
  const base =
    spec.shape === "box"
      ? 0.15
      : spec.shape === "sphere"
        ? 0.19
        : spec.shape === "horizontalCylinder"
          ? 0.2
          : 0.18;
  return base * highReRamp;
}

type WaveExcitationForce = {
  forceXN: number;
  forceYN: number;
  forceCapN: number;
  inertiaCoefficient: number;
};

type HydrodynamicDrag = {
  forceXN: number;
  forceYN: number;
  coefficient: number;
  reynoldsNumber: number;
  speedMps: number;
  referenceAreaM2: number;
  relativeVxMps: number;
  relativeVyMps: number;
};

type HydrodynamicLift = {
  forceXN: number;
  forceYN: number;
  coefficient: number;
  angleOfAttackRad: number;
};

function hydrodynamicDragFor(
  spec: ObjectSpec,
  settings: OceanSettings,
  wettedSubmergedFraction: number,
  waterKinematics: WaterKinematics,
  objectVxMps: number,
  objectVyMps: number,
  angleToSurfaceRad: number
): HydrodynamicDrag {
  const relativeVxMps = objectVxMps - waterKinematics.velocityXMps * wettedSubmergedFraction;
  const relativeVyMps = objectVyMps - waterKinematics.velocityYMps * wettedSubmergedFraction;
  const speedMps = Math.hypot(relativeVxMps, relativeVyMps);
  if (speedMps < 0.005) {
    return {
      coefficient: 0,
      forceXN: 0,
      forceYN: 0,
      referenceAreaM2: 0,
      relativeVxMps,
      relativeVyMps,
      reynoldsNumber: 0,
      speedMps,
    };
  }

  const fluidDensity = settings.waterDensityKgM3 * wettedSubmergedFraction + settings.airDensityKgM3 * (1 - wettedSubmergedFraction);
  const fluidViscosity = dynamicViscosityForSubmergence(settings, wettedSubmergedFraction);
  const reynoldsNumber = reynoldsNumberFor(speedMps, characteristicLengthM(spec), fluidDensity, fluidViscosity);
  const coefficient = effectiveDragCoefficientFor(spec, reynoldsNumber);
  const verticalProjectedAreaM2 = projectedVerticalAreaAtAngleM2(spec, angleToSurfaceRad);
  const horizontalProjectedAreaM2 = rotatedVerticalSpanM(spec, angleToSurfaceRad) * objectDepthM(spec);
  const horizontalFlowShare = Math.abs(relativeVxMps) / speedMps;
  const verticalFlowShare = Math.abs(relativeVyMps) / speedMps;
  const referenceAreaM2 = Math.max(
    0.0001,
    horizontalProjectedAreaM2 * horizontalFlowShare + verticalProjectedAreaM2 * verticalFlowShare
  );
  const dragMagnitudeN = 0.5 * fluidDensity * coefficient * referenceAreaM2 * speedMps ** 2;
  return {
    coefficient,
    forceXN: -dragMagnitudeN * (relativeVxMps / speedMps),
    forceYN: -dragMagnitudeN * (relativeVyMps / speedMps),
    referenceAreaM2,
    relativeVxMps,
    relativeVyMps,
    reynoldsNumber,
    speedMps,
  };
}

function hydrodynamicLiftFor(
  spec: ObjectSpec,
  settings: OceanSettings,
  wettedSubmergedFraction: number,
  waterKinematics: WaterKinematics,
  objectVxMps: number,
  objectVyMps: number,
  angleToSurfaceRad: number
): HydrodynamicLift {
  if (wettedSubmergedFraction <= 0.015) {
    return { angleOfAttackRad: 0, coefficient: 0, forceXN: 0, forceYN: 0 };
  }

  const relativeVxMps = objectVxMps - waterKinematics.velocityXMps * wettedSubmergedFraction;
  const relativeVyMps = objectVyMps - waterKinematics.velocityYMps * wettedSubmergedFraction;
  const speedMps = Math.hypot(relativeVxMps, relativeVyMps);
  if (speedMps < 0.08) {
    return { angleOfAttackRad: 0, coefficient: 0, forceXN: 0, forceYN: 0 };
  }

  const flowAngleRad = Math.atan2(relativeVyMps, relativeVxMps);
  const angleOfAttackRad = foldEquilibriumAngle(flowAngleRad - angleToSurfaceRad);
  const shapeLiftScale =
    spec.shape === "sphere"
      ? 0.035
      : spec.shape === "horizontalCylinder"
        ? 0.38
        : spec.shape === "verticalCylinder"
          ? 0.46
          : 0.78;
  const fluidDensity = settings.waterDensityKgM3 * wettedSubmergedFraction + settings.airDensityKgM3 * (1 - wettedSubmergedFraction);
  const fluidViscosity = dynamicViscosityForSubmergence(settings, wettedSubmergedFraction);
  const reynoldsNumber = reynoldsNumberFor(speedMps, characteristicLengthM(spec), fluidDensity, fluidViscosity);
  const inertialRamp = clamp((Math.log10(Math.max(1, reynoldsNumber)) - 3) / 3.2, 0, 1);
  const stallDamping = clamp(1 - Math.max(0, Math.abs(angleOfAttackRad) - 1.05) / 0.55, 0.28, 1);
  const wettingRamp = clamp(wettedSubmergedFraction / 0.16, 0, 1);
  const coefficient = clamp(
    shapeLiftScale * Math.sin(2 * angleOfAttackRad) * inertialRamp * stallDamping * wettingRamp,
    -1.05,
    1.05
  );
  const referenceAreaM2 = Math.max(0.0001, projectedVerticalAreaAtAngleM2(spec, angleToSurfaceRad));
  const forceMagnitudeN = 0.5 * fluidDensity * speedMps ** 2 * referenceAreaM2 * coefficient;
  const normalXM = -relativeVyMps / speedMps;
  const normalYM = relativeVxMps / speedMps;
  const forceCapN = Math.max(1, settings.waterDensityKgM3 * settings.gravity * objectVolumeM3(spec) * 1.8);

  return {
    angleOfAttackRad,
    coefficient,
    forceXN: clamp(forceMagnitudeN * normalXM, -forceCapN, forceCapN),
    forceYN: clamp(forceMagnitudeN * normalYM, -forceCapN, forceCapN),
  };
}

function waveExcitationForceFor(
  spec: ObjectSpec,
  settings: OceanSettings,
  displacedVolumeM3: number,
  submergedFraction: number,
  waterKinematics: WaterKinematics
): WaveExcitationForce {
  const inertiaCoefficient = waveInertiaCoefficientFor(spec);
  if (displacedVolumeM3 <= 0 || submergedFraction <= 0.001) {
    return { forceXN: 0, forceYN: 0, forceCapN: 0, inertiaCoefficient };
  }

  const wettingRamp = clamp(submergedFraction / 0.08, 0, 1);
  const displacedWaterMassKg = settings.waterDensityKgM3 * displacedVolumeM3;
  const forceCapN = Math.max(1, displacedWaterMassKg * settings.gravity * 3.5);
  return {
    forceXN: clamp(displacedWaterMassKg * inertiaCoefficient * waterKinematics.accelerationXMps2 * wettingRamp, -forceCapN, forceCapN),
    forceYN: clamp(displacedWaterMassKg * inertiaCoefficient * waterKinematics.accelerationYMps2 * wettingRamp, -forceCapN, forceCapN),
    forceCapN,
    inertiaCoefficient,
  };
}

function waveInertiaCoefficientFor(spec: ObjectSpec): number {
  const shapeBias =
    spec.shape === "box"
      ? 0.95
      : spec.shape === "verticalCylinder"
        ? 1.04
        : spec.shape === "horizontalCylinder"
          ? 1.08
          : 1;
  return clamp((1 + spec.addedMassCoefficient) * shapeBias, 1, 2.35);
}

type HeaveRadiationHydrodynamics = {
  dampingNsPerM: number;
  forceCapN: number;
  hydrostaticStiffnessNpm: number;
  naturalPeriodS: number | null;
  targetForceN: number;
  timeConstantS: number;
};

function heaveRadiationHydrodynamicsFor(
  spec: ObjectSpec,
  settings: OceanSettings,
  massKg: number,
  displacedVolumeM3: number,
  waterplaneAreaM2: number,
  submergedFraction: number,
  relativeVyMps: number
): HeaveRadiationHydrodynamics {
  const hydrostaticStiffnessNpm = settings.waterDensityKgM3 * settings.gravity * Math.max(0, waterplaneAreaM2);
  const addedMassKg = spec.addedMassCoefficient * settings.waterDensityKgM3 * Math.max(0, displacedVolumeM3);
  const effectiveHeaveMassKg = Math.max(0.001, massKg + addedMassKg);
  const noRadiation = hydrostaticStiffnessNpm <= 1e-6 || submergedFraction <= 0.001 || displacedVolumeM3 <= 0;
  if (noRadiation) {
    return {
      dampingNsPerM: 0,
      forceCapN: Math.max(1, massKg * settings.gravity * 3),
      hydrostaticStiffnessNpm,
      naturalPeriodS: null,
      targetForceN: 0,
      timeConstantS: 0.08,
    };
  }

  const naturalAngularFrequencyRadps = Math.sqrt(hydrostaticStiffnessNpm / effectiveHeaveMassKg);
  const naturalPeriodS = tau / Math.max(0.001, naturalAngularFrequencyRadps);
  const dampingRatio = heaveRadiationDampingRatioFor(spec, submergedFraction);
  const dampingNsPerM = 2 * dampingRatio * Math.sqrt(hydrostaticStiffnessNpm * effectiveHeaveMassKg);
  const forceCapN = Math.max(massKg * settings.gravity * 8, hydrostaticStiffnessNpm * characteristicLengthM(spec) * 2.4);
  return {
    dampingNsPerM,
    forceCapN,
    hydrostaticStiffnessNpm,
    naturalPeriodS,
    targetForceN: clamp(-dampingNsPerM * relativeVyMps, -forceCapN, forceCapN),
    timeConstantS: clamp(naturalPeriodS * 0.11, 0.06, 1.4),
  };
}

function heaveRadiationDampingRatioFor(spec: ObjectSpec, submergedFraction: number): number {
  const base =
    spec.shape === "box"
      ? 0.42
      : spec.shape === "verticalCylinder"
        ? 0.34
        : spec.shape === "horizontalCylinder"
          ? 0.3
          : 0.22;
  const waterplaneCoupling = clamp(0.64 + submergedFraction * 0.42, 0.64, 1.06);
  return base * waterplaneCoupling;
}

function stepHeaveRadiationForceN(
  previousForceN: number,
  targetForceN: number,
  timeConstantS: number,
  dtS: number,
  submergedFraction: number,
  forceCapN: number
): number {
  const previous = Number.isFinite(previousForceN) ? previousForceN : 0;
  const relaxationS = submergedFraction > 0.001 ? Math.max(0.02, timeConstantS) : 0.06;
  const alpha = 1 - Math.exp(-Math.max(0, dtS) / relaxationS);
  return clamp(previous + (targetForceN - previous) * alpha, -forceCapN, forceCapN);
}

function rotationalWaterCouplingFor(submergedFraction: number): number {
  return clamp((submergedFraction - 0.02) / 0.28, 0, 1);
}

function angularAddedInertiaFor(spec: ObjectSpec, settings: OceanSettings, displacedVolumeM3: number, submergedFraction: number): number {
  if (displacedVolumeM3 <= 0 || submergedFraction <= 0.001) return 0;
  const displacedWaterMassKg = settings.waterDensityKgM3 * displacedVolumeM3;
  const lengthM = characteristicLengthM(spec);
  const shapeFactor =
    spec.shape === "box"
      ? 1.05
      : spec.shape === "horizontalCylinder"
        ? 0.92
        : spec.shape === "verticalCylinder"
          ? 0.86
          : 0.68;
  return (
    spec.addedMassCoefficient *
    displacedWaterMassKg *
    lengthM ** 2 *
    shapeFactor *
    clamp(0.08 + submergedFraction * 0.22, 0.08, 0.34)
  );
}

function rollExcitationTorqueFor(
  angularAddedInertiaKgM2: number,
  waveAngularAccelerationRadps2: number,
  massKg: number,
  spec: ObjectSpec,
  settings: OceanSettings
): number {
  if (angularAddedInertiaKgM2 <= 0) return 0;
  const torqueCapNm = Math.max(1, massKg * settings.gravity * characteristicLengthM(spec) * 2.5);
  return clamp(angularAddedInertiaKgM2 * waveAngularAccelerationRadps2, -torqueCapNm, torqueCapNm);
}

function angularDragFor(relativeAngularVelocityRadps: number, submergedFraction: number, spec: ObjectSpec, settings: OceanSettings): number {
  const length = characteristicLengthM(spec);
  const area = projectedVerticalAreaAtAngleM2(spec, 0);
  const fluidDensity = settings.waterDensityKgM3 * submergedFraction + settings.airDensityKgM3 * (1 - submergedFraction);
  const tipSpeedMps = Math.abs(relativeAngularVelocityRadps) * length;
  const reynoldsNumber = reynoldsNumberFor(tipSpeedMps, length, fluidDensity, dynamicViscosityForSubmergence(settings, submergedFraction));
  const effectiveCd = effectiveDragCoefficientFor(spec, reynoldsNumber);
  const quadratic = -0.5 * fluidDensity * effectiveCd * area * length ** 3 * relativeAngularVelocityRadps * Math.abs(relativeAngularVelocityRadps);
  const linear = -fluidDensity * objectVolumeM3(spec) * length ** 2 * (0.18 + submergedFraction * 0.72) * relativeAngularVelocityRadps;
  return quadratic + linear;
}

function dynamicViscosityForSubmergence(settings: OceanSettings, submergedFraction: number): number {
  return settings.waterDynamicViscosityPaS * submergedFraction + settings.airDynamicViscosityPaS * (1 - submergedFraction);
}

function defaultReleaseAngleRad(spec: ObjectSpec): number {
  switch (spec.shape) {
    case "sphere":
      return 0;
    case "horizontalCylinder":
      return 0.12;
    case "verticalCylinder":
      return -0.1;
    case "box":
    default:
      return spec.densityKgM3 > 1000 ? 0.08 : -0.09;
  }
}

function createFreeSurfaceState(): FreeSurfaceState {
  return {
    originXM: freeSurfaceOriginXM,
    cellSizeM: freeSurfaceCellSizeM,
    displacementM: Array.from({ length: freeSurfaceCellCount }, () => 0),
    velocityMps: Array.from({ length: freeSurfaceCellCount }, () => 0),
  };
}

function cloneFreeSurface(surface: FreeSurfaceState): FreeSurfaceState {
  return {
    originXM: surface.originXM,
    cellSizeM: surface.cellSizeM,
    displacementM: surface.displacementM.slice(),
    velocityMps: surface.velocityMps.slice(),
  };
}

function freeSurfaceVolumePerMeterM2(surface: FreeSurfaceState): number {
  return surface.displacementM.reduce((sum, value) => sum + value * surface.cellSizeM, 0);
}

function neutralizeFreeSurfaceVolume(surface: FreeSurfaceState): FreeSurfaceState {
  const meanDisplacementM = freeSurfaceVolumePerMeterM2(surface) / Math.max(surface.cellSizeM, surface.cellSizeM * surface.displacementM.length);
  if (Math.abs(meanDisplacementM) < 1e-9) return surface;
  return {
    ...surface,
    displacementM: surface.displacementM.map((value) => clamp(value - meanDisplacementM, -3, 3)),
  };
}

function freeSurfaceElevationAt(surface: FreeSurfaceState, xM: number): number {
  return sampleFreeSurface(surface.displacementM, surface, xM);
}

function freeSurfaceVelocityAt(surface: FreeSurfaceState, xM: number): number {
  return sampleFreeSurface(surface.velocityMps, surface, xM);
}

function sampleFreeSurface(values: number[], surface: FreeSurfaceState, xM: number): number {
  const position = (xM - surface.originXM) / surface.cellSizeM;
  const lower = Math.floor(position);
  if (lower < 0 || lower >= values.length - 1) return 0;
  const t = position - lower;
  return values[lower] * (1 - t) + values[lower + 1] * t;
}

function addFreeSurfaceImpact(
  surface: FreeSurfaceState,
  impactXM: number,
  impactSpeedMps: number,
  splashAsymmetry: number,
  splashHeightM: number,
  ejectedWaterKg: number,
  settings: OceanSettings
): FreeSurfaceState {
  const next = cloneFreeSurface(surface);
  const disturbanceRadiusM = clamp(0.35 + splashHeightM * 0.28, 0.35, 2.8);
  const impulseVelocityMps = clamp(0.18 * impactSpeedMps + Math.sqrt(Math.max(0, splashHeightM) * settings.gravity) * 0.18, 0.18, 4.8);
  const depressionM = clamp(ejectedWaterKg / Math.max(1, settings.waterDensityKgM3 * disturbanceRadiusM * 2.4), 0.02, Math.max(0.08, splashHeightM * 0.22));
  const asymmetry = clamp(splashAsymmetry, -0.85, 0.85);
  const asymmetryDirection = Math.sign(asymmetry);
  const asymmetryMagnitude = Math.abs(asymmetry);

  for (let index = 0; index < next.displacementM.length; index += 1) {
    const xM = next.originXM + index * next.cellSizeM;
    const distanceM = xM - impactXM;
    const normalized = distanceM / disturbanceRadiusM;
    const gaussian = Math.exp(-(normalized ** 2));
    const rimOffset = (Math.abs(distanceM) - disturbanceRadiusM * 0.82) / Math.max(0.08, disturbanceRadiusM * 0.28);
    const rim = Math.exp(-(rimOffset ** 2));
    const directionalGain = clamp(1 + asymmetry * Math.tanh(normalized) * 0.88, 0.36, 1.88);
    const signedDistanceM = asymmetryDirection === 0 ? 0 : distanceM * asymmetryDirection;
    const trailingWake = asymmetryDirection === 0
      ? 0
      : Math.exp(-(((signedDistanceM + disturbanceRadiusM * 1.12) / Math.max(0.12, disturbanceRadiusM * 0.68)) ** 2));
    const shearVelocityMps = asymmetry * normalized * gaussian * impulseVelocityMps * 0.28;
    next.displacementM[index] = clamp(
      next.displacementM[index] -
        depressionM * gaussian * (1 + asymmetryMagnitude * 0.16) +
        depressionM * 0.44 * rim * directionalGain -
        depressionM * 0.18 * asymmetryMagnitude * trailingWake,
      -3,
      3
    );
    next.velocityMps[index] = clamp(
      next.velocityMps[index] + impulseVelocityMps * (rim * 0.85 * directionalGain - gaussian * 0.38 - trailingWake * 0.14 * asymmetryMagnitude) + shearVelocityMps,
      -8,
      8
    );
  }

  return neutralizeFreeSurfaceVolume(next);
}

function addFreeSurfaceDisplacementPulse(
  surface: FreeSurfaceState,
  centerXM: number,
  displacedVolumeDeltaM3: number,
  relativeVyMps: number,
  spec: ObjectSpec,
  settings: OceanSettings
): FreeSurfaceState {
  const volumeMagnitudeM3 = Math.abs(displacedVolumeDeltaM3);
  if (volumeMagnitudeM3 <= 0) return surface;

  const next = cloneFreeSurface(surface);
  const sign = Math.sign(displacedVolumeDeltaM3);
  const beamM = Math.max(0.08, objectDepthM(spec));
  const disturbanceRadiusM = clamp(0.32 + Math.sqrt(volumeMagnitudeM3 / beamM) * 0.9, 0.28, 2.4);
  const speedCoupling = clamp(Math.abs(relativeVyMps) / 2.1, 0.04, 1);
  const amplitudeM = clamp((volumeMagnitudeM3 / Math.max(0.08, beamM * disturbanceRadiusM * 2.35)) * speedCoupling, 0.0003, 0.42);
  const velocityScaleMps = clamp((Math.abs(relativeVyMps) * 0.12 + Math.sqrt(settings.gravity * amplitudeM) * 0.35) * speedCoupling, 0.003, 1.9);

  for (let index = 0; index < next.displacementM.length; index += 1) {
    const xM = next.originXM + index * next.cellSizeM;
    const distanceM = xM - centerXM;
    const normalized = distanceM / disturbanceRadiusM;
    const gaussian = Math.exp(-(normalized ** 2));
    const rimOffset = (Math.abs(distanceM) - disturbanceRadiusM * 0.78) / Math.max(0.08, disturbanceRadiusM * 0.3);
    const rim = Math.exp(-(rimOffset ** 2));
    next.displacementM[index] = clamp(next.displacementM[index] - sign * amplitudeM * gaussian + sign * amplitudeM * 0.32 * rim, -3, 3);
    next.velocityMps[index] = clamp(next.velocityMps[index] + sign * velocityScaleMps * (rim * 0.48 - gaussian * 0.22), -8, 8);
  }

  return neutralizeFreeSurfaceVolume(next);
}

function addFreeSurfaceDropletImpact(
  surface: FreeSurfaceState,
  impactXM: number,
  impactEnergyJ: number,
  massKg: number,
  verticalImpactSpeedMps: number,
  settings: OceanSettings
): FreeSurfaceState {
  if (impactEnergyJ <= 0 || massKg <= 0 || verticalImpactSpeedMps <= 0.02) return surface;
  const next = cloneFreeSurface(surface);
  const disturbanceRadiusM = clamp(0.045 + Math.cbrt(massKg / Math.max(1, settings.waterDensityKgM3)) * 2.2, 0.045, 0.42);
  const equivalentDepthM = Math.max(0.006, disturbanceRadiusM * 0.18);
  const impulseVelocityMps = clamp(impactEnergyJ / Math.max(0.02, settings.waterDensityKgM3 * disturbanceRadiusM * equivalentDepthM), 0.002, 0.55);
  const depressionM = clamp((massKg / settings.waterDensityKgM3) / Math.max(0.003, disturbanceRadiusM * 0.34), 0.0004, 0.045);

  for (let index = 0; index < next.displacementM.length; index += 1) {
    const xM = next.originXM + index * next.cellSizeM;
    const distanceM = xM - impactXM;
    const normalized = distanceM / disturbanceRadiusM;
    const gaussian = Math.exp(-(normalized ** 2));
    const rimOffset = (Math.abs(distanceM) - disturbanceRadiusM * 0.72) / Math.max(0.025, disturbanceRadiusM * 0.32);
    const rim = Math.exp(-(rimOffset ** 2));
    next.displacementM[index] = clamp(next.displacementM[index] - depressionM * gaussian + depressionM * 0.36 * rim, -3, 3);
    next.velocityMps[index] = clamp(next.velocityMps[index] + impulseVelocityMps * (rim * 0.32 - gaussian * 0.42), -8, 8);
  }

  return neutralizeFreeSurfaceVolume(next);
}

function stepFreeSurface(surface: FreeSurfaceState, settings: OceanSettings, dtS: number): FreeSurfaceState {
  const dt = clamp(dtS, 0, 0.035);
  if (dt <= 0) return cloneFreeSurface(surface);
  const displacement = surface.displacementM;
  const velocity = surface.velocityMps;
  const nextDisplacement = displacement.slice();
  const nextVelocity = velocity.slice();
  const dx = surface.cellSizeM;
  const waveSpeedMps = freeSurfaceWaveSpeedMps(settings);
  const dampingPerSecond = 0.26 + clamp(settings.windSpeedMps / 40, 0, 0.28);
  const boundaryDamping = 0.72;

  for (let index = 1; index < displacement.length - 1; index += 1) {
    const curvature = (displacement[index - 1] - 2 * displacement[index] + displacement[index + 1]) / dx ** 2;
    const slope = (displacement[index + 1] - displacement[index - 1]) / (2 * dx);
    const advection = -settings.currentSpeedMps * slope * 0.18;
    const acceleration = waveSpeedMps ** 2 * curvature + advection - dampingPerSecond * velocity[index];
    nextVelocity[index] = clamp(velocity[index] + acceleration * dt, -9, 9);
  }

  for (let index = 1; index < displacement.length - 1; index += 1) {
    nextDisplacement[index] = clamp(displacement[index] + nextVelocity[index] * dt, -3, 3);
  }

  nextVelocity[0] *= boundaryDamping;
  nextVelocity[nextVelocity.length - 1] *= boundaryDamping;
  nextDisplacement[0] *= boundaryDamping;
  nextDisplacement[nextDisplacement.length - 1] *= boundaryDamping;

  return neutralizeFreeSurfaceVolume({
    originXM: surface.originXM,
    cellSizeM: surface.cellSizeM,
    displacementM: nextDisplacement,
    velocityMps: nextVelocity,
  });
}

function freeSurfaceEffectiveDepthM(settings: OceanSettings): number {
  const depthM = Math.max(0.05, settings.waterDepthM);
  const impactLayerM = Math.max(0.22, settings.waveHeightM * 0.55 + 1.2);
  return clamp(impactLayerM, 0.18, depthM);
}

function freeSurfaceWaveSpeedMps(settings: OceanSettings): number {
  const effectiveDepthM = freeSurfaceEffectiveDepthM(settings);
  const shallowCelerityMps = Math.sqrt(settings.gravity * effectiveDepthM);
  const capillaryFloorMps = Math.sqrt(settings.gravity * 0.18);
  const deepCapMps = finiteDepthWavePhaseSpeedMps(Math.max(1.2, settings.wavePeriodS * 0.42), effectiveDepthM, settings.gravity);
  return clamp(Math.min(shallowCelerityMps, deepCapMps * 1.18), capillaryFloorMps, 6.8);
}

function freeSurfaceEnergyJ(surface: FreeSurfaceState, settings: OceanSettings): number {
  let total = 0;
  const effectiveDepthM = freeSurfaceEffectiveDepthM(settings);
  for (let index = 0; index < surface.displacementM.length; index += 1) {
    const h = surface.displacementM[index];
    const v = surface.velocityMps[index];
    total += 0.5 * settings.waterDensityKgM3 * settings.gravity * h ** 2 * surface.cellSizeM;
    total += 0.5 * settings.waterDensityKgM3 * effectiveDepthM * v ** 2 * surface.cellSizeM;
  }
  return total;
}

function freeSurfaceMaxDisplacementM(surface: FreeSurfaceState): number {
  return surface.displacementM.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
}

function orbitalDepthFactorsFor(waveNumberRadM: number, depthBelowSurfaceM: number, waterDepthM: number): { horizontal: number; vertical: number } {
  const k = Math.max(0.000001, waveNumberRadM);
  const h = Math.max(0.1, waterDepthM);
  const depthM = clamp(depthBelowSurfaceM, 0, h);
  const kh = k * h;
  if (kh > 18) {
    const decay = Math.exp(-k * depthM);
    return { horizontal: decay, vertical: decay };
  }

  const denominator = Math.sinh(Math.max(0.0001, kh));
  const distanceAboveBedM = Math.max(0, h - depthM);
  return {
    horizontal: Math.cosh(k * distanceAboveBedM) / denominator,
    vertical: Math.sinh(k * distanceAboveBedM) / denominator,
  };
}

function circularSegmentAreaM2(radiusM: number, depthM: number): number {
  const depth = clamp(depthM, 0, radiusM * 2);
  if (depth <= 0) return 0;
  if (depth >= radiusM * 2) return Math.PI * radiusM ** 2;
  const offset = radiusM - depth;
  return radiusM ** 2 * Math.acos(offset / radiusM) - offset * Math.sqrt(Math.max(0, radiusM ** 2 - offset ** 2));
}

function requiredDimension(spec: ObjectSpec, key: keyof ObjectSpec["dimensions"]): number {
  const value = spec.dimensions[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return value;
}

function normalizeAngle(angleRad: number): number {
  let angle = angleRad;
  while (angle > Math.PI) angle -= tau;
  while (angle < -Math.PI) angle += tau;
  return angle;
}

function foldEquilibriumAngle(angleRad: number): number {
  let angle = normalizeAngle(angleRad);
  while (angle > Math.PI / 2) angle -= Math.PI;
  while (angle < -Math.PI / 2) angle += Math.PI;
  return clamp(angle, -Math.PI / 2, Math.PI / 2);
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
