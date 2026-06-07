import type { FluidGridStepPlan } from "./fluidGridGpu";

export type FluidGridCouplingShape = "box" | "horizontalCylinder" | "sphere" | "verticalCylinder";

export type FluidGridObjectCouplingBounds = {
  xEnd: number;
  xStart: number;
  yEnd: number;
  yStart: number;
};

export type FluidGridObjectCouplingInput = {
  buoyancyN: number;
  canvasHeightPx: number;
  canvasWidthPx: number;
  currentSpeedMps: number;
  displacedVolumeM3: number;
  displacedVolumeRateM3ps: number;
  dragForceXN: number;
  dragForceYN: number;
  gravityMps2: number;
  impactStrength: number;
  massKg: number;
  netForceN: number;
  objectAngleRad: number;
  objectCenterXPx: number;
  objectCenterYPx: number;
  objectDepthM: number;
  objectHalfHeightPx: number;
  objectHalfWidthPx: number;
  objectHeightM: number;
  objectVxMps: number;
  objectVyMps: number;
  objectWidthM: number;
  plan: FluidGridStepPlan;
  scalePxPerM: number;
  shape: FluidGridCouplingShape;
  slamForceN: number;
  submergedFraction: number;
  surfaceYPx: number;
  timeS: number;
  waterDensityKgM3: number;
  waterDepthM: number;
  waveHeightM: number;
};

export type FluidGridObjectCouplingSample = {
  depthScale: number;
  envelope: number;
  impulseMps: number;
  obstacle: number;
  x: number;
  y: number;
};

export type FluidGridObjectCouplingSummary = {
  active: boolean;
  appliedImpulseNs: number;
  boundedDiagnostics: true;
  bounds: FluidGridObjectCouplingBounds;
  buoyancyDeltaN: number;
  coupling: "object-grid-v1";
  dragDeltaN: number;
  footprintAreaM2: number;
  footprintCells: number;
  forceDeltaN: number;
  gridSampleCount: number;
  gridVelocityMps: number;
  horizontalForceDeltaN: number;
  impulseCells: number;
  impulseMagnitude: number;
  liftDeltaN: number;
  sampleTimeS: number;
  slamDeltaN: number;
  surfaceOffsetM: number;
  verticalForceDeltaN: number;
};

export type FluidGridObjectCoupling = {
  samples: FluidGridObjectCouplingSample[];
  summary: FluidGridObjectCouplingSummary;
};

const emptyBounds: FluidGridObjectCouplingBounds = { xEnd: 0, xStart: 0, yEnd: 0, yStart: 0 };
const maxFootprintCells = 8192;

export function gridObjectCouplingFor(input: FluidGridObjectCouplingInput): FluidGridObjectCoupling {
  const plan = input.plan;
  const scalePxPerM = Math.max(1, input.scalePxPerM);
  const surfaceOffsetM = (input.objectCenterYPx - input.surfaceYPx) / scalePxPerM;
  const contact = clamp(input.submergedFraction + input.impactStrength * 0.62, 0, 1);
  const isNearSurface = surfaceOffsetM > -input.objectHeightM * 0.82;
  if (contact <= 0.001 || !isNearSurface) {
    return { samples: [], summary: inactiveSummary(input, surfaceOffsetM) };
  }

  const centerX = clampInt(Math.round((input.objectCenterXPx / Math.max(1, input.canvasWidthPx)) * plan.cellsX), 1, plan.cellsX - 2);
  const waterColumnPx = Math.max(1, input.canvasHeightPx - input.surfaceYPx);
  const surfaceGridY = Math.round(plan.cellsY * 0.48);
  const centerY = clampInt(
    Math.round(surfaceGridY + ((input.objectCenterYPx - input.surfaceYPx) / waterColumnPx) * plan.cellsY * 0.48),
    1,
    plan.cellsY - 2
  );
  const shapeAspect = shapeFootprintScale(input.shape);
  const rawRadiusX = Math.ceil((input.objectHalfWidthPx / Math.max(1, input.canvasWidthPx)) * plan.cellsX * shapeAspect.x + 2);
  const rawRadiusY = Math.ceil((input.objectHalfHeightPx / waterColumnPx) * plan.cellsY * 0.72 * shapeAspect.y + 2);
  let radiusX = clampInt(rawRadiusX, 2, Math.max(2, Math.floor(plan.cellsX * 0.09)));
  let radiusY = clampInt(rawRadiusY, 2, Math.max(2, Math.floor(plan.cellsY * 0.1)));
  const estimatedBoundsCells = (radiusX * 2 + 1) * (radiusY * 2 + 1);
  if (estimatedBoundsCells > maxFootprintCells) {
    const shrink = Math.sqrt(maxFootprintCells / estimatedBoundsCells);
    radiusX = Math.max(2, Math.floor(radiusX * shrink));
    radiusY = Math.max(2, Math.floor(radiusY * shrink));
  }

  const bounds = {
    xStart: clampInt(centerX - radiusX, 1, plan.cellsX - 2),
    xEnd: clampInt(centerX + radiusX, 1, plan.cellsX - 2),
    yStart: clampInt(centerY - radiusY, 1, plan.cellsY - 2),
    yEnd: clampInt(centerY + radiusY, 1, plan.cellsY - 2),
  };

  const entrySpeedMps = Math.max(0, -input.objectVyMps);
  const lateralSpeedMps = input.objectVxMps - input.currentSpeedMps;
  const displacedRate = Math.abs(input.displacedVolumeRateM3ps);
  const footprintAreaM2 = projectedFootprintAreaM2(input);
  const impactVelocity = clamp(
    entrySpeedMps * (0.1 + input.impactStrength * 0.28) + displacedRate * 0.06 + Math.abs(input.slamForceN) / Math.max(250, input.massKg) * 0.0008,
    0,
    4.25
  );
  const impulseScale = clamp((impactVelocity + input.waveHeightM * 0.08) * contact, 0, 4.25);
  const obstacleScale = clamp(contact * (0.22 + input.submergedFraction * 0.58), 0, 0.86);
  const depthShadow = clamp(contact * (0.12 + input.submergedFraction * 0.34), 0, 0.58);
  const samples: FluidGridObjectCouplingSample[] = [];

  for (let y = bounds.yStart; y <= bounds.yEnd; y += 1) {
    for (let x = bounds.xStart; x <= bounds.xEnd; x += 1) {
      const nx = (x - centerX) / Math.max(1, radiusX);
      const ny = (y - centerY) / Math.max(1, radiusY);
      const radial = nx * nx + ny * ny;
      if (radial > 1) continue;
      const envelope = Math.pow(1 - radial, input.shape === "box" ? 0.55 : 0.82);
      if (envelope < 0.025) continue;
      samples.push({
        depthScale: clamp(1 - depthShadow * envelope, 0.2, 1),
        envelope,
        impulseMps: impulseScale * envelope,
        obstacle: obstacleScale * envelope,
        x,
        y,
      });
    }
  }

  const cellAreaM2 = plan.cellSizeM * plan.cellSizeM;
  const sampleAreaM2 = samples.length * cellAreaM2;
  const impulseMagnitude = samples.reduce((total, sample) => total + Math.abs(sample.impulseMps), 0) * cellAreaM2;
  const impulseCells = samples.filter((sample) => Math.abs(sample.impulseMps) > 0.002).length;
  const displacedMassKg = input.waterDensityKgM3 * Math.max(0, input.displacedVolumeM3);
  const appliedImpulseNs = impulseMagnitude * input.waterDensityKgM3 * plan.dtS;
  const surfaceOffsetRatio = clamp(surfaceOffsetM / Math.max(0.08, input.objectHeightM), -1, 1);
  const buoyancyDeltaN = input.waterDensityKgM3 * input.gravityMps2 * Math.max(0, input.displacedVolumeM3) * surfaceOffsetRatio * 0.045 * contact;
  const slamDeltaN = input.waterDensityKgM3 * footprintAreaM2 * entrySpeedMps * entrySpeedMps * 0.055 * contact;
  const liftDeltaN = input.waterDensityKgM3 * sampleAreaM2 * entrySpeedMps * Math.abs(lateralSpeedMps) * 0.025 * contact;
  const dragDeltaN = -0.5 * input.waterDensityKgM3 * Math.max(sampleAreaM2, footprintAreaM2 * 0.15) * lateralSpeedMps * Math.abs(lateralSpeedMps) * 0.045 * contact;
  const verticalForceDeltaN = clamp(buoyancyDeltaN + slamDeltaN + liftDeltaN, -Math.max(1, input.massKg * input.gravityMps2 * 0.18), Math.max(1, input.massKg * input.gravityMps2 * 0.28));
  const horizontalForceDeltaN = clamp(dragDeltaN, -Math.max(1, input.massKg * input.gravityMps2 * 0.12), Math.max(1, input.massKg * input.gravityMps2 * 0.12));
  const gridVelocityMps = clamp(
    input.currentSpeedMps - input.objectVyMps * input.submergedFraction * 0.055 + impulseScale * 0.16 - displacedMassKg * 0.00004,
    -8,
    8
  );

  return {
    samples,
    summary: {
      active: samples.length > 0,
      appliedImpulseNs,
      boundedDiagnostics: true,
      bounds,
      buoyancyDeltaN,
      coupling: "object-grid-v1",
      dragDeltaN,
      footprintAreaM2: sampleAreaM2,
      footprintCells: samples.length,
      forceDeltaN: verticalForceDeltaN,
      gridSampleCount: samples.length,
      gridVelocityMps,
      horizontalForceDeltaN,
      impulseCells,
      impulseMagnitude,
      liftDeltaN,
      sampleTimeS: input.timeS,
      slamDeltaN,
      surfaceOffsetM,
      verticalForceDeltaN,
    },
  };
}

function inactiveSummary(input: FluidGridObjectCouplingInput, surfaceOffsetM: number): FluidGridObjectCouplingSummary {
  return {
    active: false,
    appliedImpulseNs: 0,
    boundedDiagnostics: true,
    bounds: emptyBounds,
    buoyancyDeltaN: 0,
    coupling: "object-grid-v1",
    dragDeltaN: 0,
    footprintAreaM2: 0,
    footprintCells: 0,
    forceDeltaN: 0,
    gridSampleCount: 0,
    gridVelocityMps: input.currentSpeedMps,
    horizontalForceDeltaN: 0,
    impulseCells: 0,
    impulseMagnitude: 0,
    liftDeltaN: 0,
    sampleTimeS: input.timeS,
    slamDeltaN: 0,
    surfaceOffsetM,
    verticalForceDeltaN: 0,
  };
}

function projectedFootprintAreaM2(input: FluidGridObjectCouplingInput): number {
  switch (input.shape) {
    case "sphere": {
      const radius = Math.max(input.objectWidthM, input.objectHeightM) * 0.5;
      return Math.PI * radius * radius;
    }
    case "horizontalCylinder":
      return Math.max(0.001, input.objectWidthM * input.objectHeightM);
    case "verticalCylinder": {
      const radius = input.objectWidthM * 0.5;
      return Math.max(0.001, Math.PI * radius * radius);
    }
    case "box":
    default:
      return Math.max(0.001, input.objectWidthM * input.objectDepthM);
  }
}

function shapeFootprintScale(shape: FluidGridCouplingShape) {
  switch (shape) {
    case "sphere":
      return { x: 0.92, y: 0.92 };
    case "horizontalCylinder":
      return { x: 1.05, y: 0.74 };
    case "verticalCylinder":
      return { x: 0.84, y: 1.05 };
    case "box":
    default:
      return { x: 1, y: 1 };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}
