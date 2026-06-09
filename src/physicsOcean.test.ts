import { describe, expect, it } from "vitest";
import {
  cloneObjectSpec,
  createSimulation,
  defaultOceanSettings,
  diagnosticsFor,
  displacedVolumeAtAngleM3,
  displacedVolumeM3,
  dryMassKg,
  dynamicSurfaceElevationAt,
  dynamicSurfaceVolumePerMeterM2,
  effectiveDragCoefficientFor,
  equilibriumDeviationFor,
  finiteDepthWaveLengthM,
  finiteDepthWavePhaseSpeedMps,
  forecastWaterloggingSeconds,
  objectPresets,
  objectVolumeM3,
  predictFloatOutcome,
  projectedVerticalAreaAtAngleM2,
  resolvedSurfaceSlopeAngularAccelerationAt,
  resolvedSurfaceSlopeAt,
  resolvedSurfaceSlopeAngularVelocityAt,
  solveFloatEquilibrium,
  startDrop,
  stepSimulation,
  surfaceVerticalVelocityAt,
  terminalVelocityMpsFor,
  waveOrbitalKinematicsAtDepth,
  type ObjectSpec,
  type OceanSettings,
  type SplashParticle,
} from "./physicsOcean";

const calmTank: OceanSettings = {
  ...defaultOceanSettings,
  currentSpeedMps: 0,
  waterDepthM: 5,
  waveHeightM: 0,
  windSpeedMps: 0,
};

describe("physics ocean model", () => {
  it("displaces half of a sphere when the calm waterline crosses its center", () => {
    const sphere = cloneObjectSpec(objectPresets.find((preset) => preset.id === "steel-sphere") ?? objectPresets[0]);
    const displaced = displacedVolumeM3(sphere, 0, 0);
    expect(displaced / objectVolumeM3(sphere)).toBeCloseTo(0.5, 5);
  });

  it("matches Archimedes equilibrium fraction for a floating box", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    const centerY = height / 2 - equilibriumFraction * height;
    const state = createSimulation(foam, 1, 0);
    state.object.centerYM = centerY;
    const diagnostics = diagnosticsFor(state, foam, calmTank);
    expect(diagnostics.submergedFraction).toBeCloseTo(equilibriumFraction, 4);
    expect(Math.abs(diagnostics.buoyancyN - diagnostics.weightN) / diagnostics.weightN).toBeLessThan(0.001);
  });

  it("changes displaced volume for a shallow box when it heels through the waterline", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const centerY = height / 2 - height * 0.18;
    const upright = displacedVolumeAtAngleM3(foam, centerY, 0, 0);
    const heeled = displacedVolumeAtAngleM3(foam, centerY, 0, Math.PI / 5);
    const totalVolume = objectVolumeM3(foam);
    expect(heeled).toBeGreaterThan(0);
    expect(heeled).toBeLessThan(totalVolume);
    expect(Math.abs(heeled - upright) / totalVolume).toBeGreaterThan(0.04);
  });

  it("uses exact upright hydrostatics for tiny foam heel angles", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    const upright = createSimulation(foam, 1, 0);
    upright.phase = "floating";
    upright.object.centerYM = height / 2 - equilibriumFraction * height;
    const tinyHeel = createSimulation(foam, 1, 0.004);
    tinyHeel.phase = "floating";
    tinyHeel.object.centerYM = upright.object.centerYM;
    const uprightDiagnostics = diagnosticsFor(upright, foam, calmTank);
    const tinyHeelDiagnostics = diagnosticsFor(tinyHeel, foam, calmTank);

    expect(tinyHeelDiagnostics.submergedFraction).toBeCloseTo(uprightDiagnostics.submergedFraction, 5);
    expect(tinyHeelDiagnostics.buoyancyN).toBeCloseTo(uprightDiagnostics.buoyancyN, 5);
  });

  it("reports the orientation-aware displaced volume in diagnostics", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const state = createSimulation(foam, 1, Math.PI / 5);
    state.object.centerYM = height / 2 - height * 0.18;
    const diagnostics = diagnosticsFor(state, foam, calmTank);
    const sampledVolume = displacedVolumeAtAngleM3(foam, state.object.centerYM, 0, state.object.angleRad);
    expect(diagnostics.displacedVolumeM3).toBeCloseTo(sampledVolume, 6);
  });

  it("predicts immediate sinking for objects denser than water", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    expect(predictFloatOutcome(concrete, calmTank).outcome).toBe("sinks-immediately");
  });

  it("predicts finite waterlogging time for a leaky sealed drum", () => {
    const drum = cloneObjectSpec(objectPresets.find((preset) => preset.id === "leaky-steel-drum") ?? objectPresets[0]);
    const prediction = predictFloatOutcome(drum, calmTank);
    expect(prediction.outcome).toBe("waterlogs-then-sinks");
    expect(prediction.secondsUntilSink).toBeGreaterThan(60);
    expect(prediction.initialEquilibrium?.hydrostaticHeadM ?? 0).toBeGreaterThan(0);
    expect(prediction.criticalWaterFillFraction).toBeGreaterThan(0);
  });

  it("solves floating equilibrium by matching displaced water to object mass", () => {
    const ice = cloneObjectSpec(objectPresets.find((preset) => preset.id === "ice-block") ?? objectPresets[0]);
    const equilibrium = solveFloatEquilibrium(ice, calmTank, 0);
    expect(equilibrium).not.toBeNull();
    expect(equilibrium?.displacedVolumeM3 ?? 0).toBeCloseTo(dryMassKg(ice) / calmTank.waterDensityKgM3, 2);
    expect(equilibrium?.submergedFraction ?? 0).toBeCloseTo(ice.densityKgM3 / calmTank.waterDensityKgM3, 2);
    expect(equilibrium?.waterplaneAreaM2 ?? 0).toBeGreaterThan(0);
  });

  it("uses capillary support for small objects at the waterline", () => {
    const capillaryChip: ObjectSpec = {
      id: "capillary-chip",
      name: "Capillary test chip",
      shape: "box",
      densityKgM3: 1040,
      dragCoefficient: 1.08,
      addedMassCoefficient: 0.7,
      color: "#d7c8a5",
      waterFillRatePerMinute: 0,
      maxWaterFillFraction: 0,
      dimensions: { width: 0.02, height: 0.01, depth: 0.02 },
    };
    const equilibrium = solveFloatEquilibrium(capillaryChip, calmTank, 0, 0);
    expect(equilibrium).not.toBeNull();
    expect(equilibrium?.surfaceTensionForceN ?? 0).toBeGreaterThan(0);
    expect(equilibrium?.capillaryPerimeterM ?? 0).toBeGreaterThan(0);
    expect(equilibrium?.bondNumber ?? Infinity).toBeLessThan(100);
    expect(equilibrium?.displacedVolumeM3 ?? Infinity).toBeLessThan(dryMassKg(capillaryChip) / calmTank.waterDensityKgM3);
    expect(predictFloatOutcome(capillaryChip, calmTank).outcome).toBe("floats-indefinitely");
  });

  it("increases leak ingress with hydrostatic head", () => {
    const drum = cloneObjectSpec(objectPresets.find((preset) => preset.id === "leaky-steel-drum") ?? objectPresets[0]);
    const height = drum.dimensions.diameter ?? 1;
    const shallow = createSimulation(drum, 1);
    const deep = createSimulation(drum, 1);
    shallow.object.centerYM = height / 2 - height * 0.25;
    deep.object.centerYM = height / 2 - height * 0.85;
    const shallowDiagnostics = diagnosticsFor(shallow, drum, calmTank);
    const deepDiagnostics = diagnosticsFor(deep, drum, calmTank);
    expect(deepDiagnostics.hydrostaticHeadM).toBeGreaterThan(shallowDiagnostics.hydrostaticHeadM);
    expect(deepDiagnostics.leakFlowM3ps).toBeGreaterThan(shallowDiagnostics.leakFlowM3ps);
    expect(deepDiagnostics.waterIngressRatePerMinute).toBeGreaterThan(shallowDiagnostics.waterIngressRatePerMinute);
  });

  it("throttles airtight leak flow as trapped air pressure rises", () => {
    const airtight = cloneObjectSpec(objectPresets.find((preset) => preset.id === "leaky-steel-drum") ?? objectPresets[0]);
    airtight.airReliefCoefficient = 0;
    airtight.vented = false;
    const vented = cloneObjectSpec(airtight);
    vented.airReliefCoefficient = 1;
    vented.vented = true;
    const height = airtight.dimensions.diameter ?? 1;
    const airtightState = createSimulation(airtight, 1);
    const ventedState = createSimulation(vented, 1);
    airtightState.object.centerYM = height / 2 - height * 0.85;
    ventedState.object.centerYM = airtightState.object.centerYM;
    airtightState.object.waterFillFraction = 0.65;
    ventedState.object.waterFillFraction = 0.65;
    const airtightDiagnostics = diagnosticsFor(airtightState, airtight, calmTank);
    const ventedDiagnostics = diagnosticsFor(ventedState, vented, calmTank);
    expect(airtightDiagnostics.internalAirPressurePa).toBeGreaterThan(101_325);
    expect(airtightDiagnostics.pressureDifferentialPa).toBeLessThan(ventedDiagnostics.pressureDifferentialPa * 0.25);
    expect(airtightDiagnostics.leakFlowM3ps).toBeLessThan(ventedDiagnostics.leakFlowM3ps * 0.25);
    expect(airtightDiagnostics.trappedAirVolumeM3).toBeLessThan(ventedDiagnostics.trappedAirVolumeM3 * 1.01);
  });

  it("reduces stability when a flooded object has an internal free surface", () => {
    const drum = cloneObjectSpec(objectPresets.find((preset) => preset.id === "leaky-steel-drum") ?? objectPresets[0]);
    const fillFraction = drum.maxWaterFillFraction * 0.5;
    const equilibrium = solveFloatEquilibrium(drum, calmTank, fillFraction, 0.22);
    expect(equilibrium).not.toBeNull();
    const sloshing = createSimulation(drum, 1, 0.22);
    sloshing.phase = "floating";
    sloshing.object.centerYM = equilibrium?.centerYM ?? 0;
    sloshing.object.waterFillFraction = fillFraction;
    const fixedInternalWater = cloneObjectSpec(drum);
    fixedInternalWater.maxWaterFillFraction = 0;
    const fixedState = createSimulation(fixedInternalWater, 1, 0.22);
    fixedState.phase = "floating";
    fixedState.object.centerYM = sloshing.object.centerYM;
    fixedState.object.waterFillFraction = fillFraction;
    const sloshingDiagnostics = diagnosticsFor(sloshing, drum, calmTank);
    const fixedDiagnostics = diagnosticsFor(fixedState, fixedInternalWater, calmTank);
    expect(sloshingDiagnostics.internalFreeSurfaceMomentM4).toBeGreaterThan(0);
    expect(sloshingDiagnostics.internalFreeSurfaceGMReductionM).toBeGreaterThan(0);
    expect(Math.sign(sloshingDiagnostics.internalFreeSurfaceMomentNm)).toBe(Math.sign(sloshing.object.angleRad));
    expect(fixedDiagnostics.internalFreeSurfaceGMReductionM).toBe(0);
    expect(sloshingDiagnostics.metacentricHeightM).toBeLessThan(fixedDiagnostics.metacentricHeightM);
  });

  it("removes the internal free-surface correction once a flooded compartment is full", () => {
    const drum = cloneObjectSpec(objectPresets.find((preset) => preset.id === "leaky-steel-drum") ?? objectPresets[0]);
    const state = createSimulation(drum, 1, 0.22);
    state.phase = "floating";
    state.object.centerYM = 0;
    state.object.waterFillFraction = drum.maxWaterFillFraction;
    const diagnostics = diagnosticsFor(state, drum, calmTank);
    expect(diagnostics.internalFreeSurfaceMomentM4).toBe(0);
    expect(diagnostics.internalFreeSurfaceGMReductionM).toBe(0);
    expect(diagnostics.internalFreeSurfaceMomentNm).toBe(0);
  });

  it("forecasts shorter float duration for larger leaks", () => {
    const smallLeak = cloneObjectSpec(objectPresets.find((preset) => preset.id === "leaky-steel-drum") ?? objectPresets[0]);
    const largeLeak = cloneObjectSpec(smallLeak);
    smallLeak.leakAreaM2 = 0.000006;
    largeLeak.leakAreaM2 = 0.00003;
    const smallDuration = forecastWaterloggingSeconds(smallLeak, calmTank);
    const largeDuration = forecastWaterloggingSeconds(largeLeak, calmTank);
    expect(smallDuration).not.toBeNull();
    expect(largeDuration).not.toBeNull();
    expect(largeDuration ?? Infinity).toBeLessThan((smallDuration ?? 0) * 0.55);
  });

  it("matches the expected seawater draft for fresh-water ice", () => {
    const ice = cloneObjectSpec(objectPresets.find((preset) => preset.id === "ice-block") ?? objectPresets[0]);
    const expectedSubmergedFraction = ice.densityKgM3 / calmTank.waterDensityKgM3;
    const height = ice.dimensions.height ?? 1;
    const state = createSimulation(ice, 1, 0);
    state.object.centerYM = height / 2 - expectedSubmergedFraction * height;
    const diagnostics = diagnosticsFor(state, ice, calmTank);
    expect(diagnostics.submergedFraction).toBeCloseTo(0.894, 2);
    expect(diagnostics.submergedFraction).toBeCloseTo(expectedSubmergedFraction, 4);
  });

  it("sinks a dense object to the seabed in the time-domain simulation", () => {
    const steel = cloneObjectSpec(objectPresets.find((preset) => preset.id === "steel-sphere") ?? objectPresets[0]);
    let state = startDrop(createSimulation(steel, 0.35));
    for (let index = 0; index < 1400 && state.phase !== "sank"; index += 1) {
      state = stepSimulation(state, steel, calmTank, 0.01);
    }
    expect(state.phase).toBe("sank");
    expect(state.sankAtS).not.toBeNull();
  });

  it("records damped seabed impact impulses on first bottom contact", () => {
    const steel = cloneObjectSpec(objectPresets.find((preset) => preset.id === "steel-sphere") ?? objectPresets[0]);
    const state = createSimulation(steel, 1, 0);
    const seabedCenterY = -calmTank.waterDepthM + (steel.dimensions.diameter ?? 1) / 2;
    state.phase = "sinking";
    state.object.centerYM = seabedCenterY + 0.001;
    state.object.vyMps = -4;
    state.object.vxMps = 0.7;
    state.object.angularVelocityRadps = 0.9;

    const next = stepSimulation(state, steel, calmTank, 0.04);

    expect(next.sankAtS).not.toBeNull();
    expect(next.object.centerYM).toBeCloseTo(seabedCenterY, 6);
    expect(next.lastSeabedImpactEnergyJ).toBeGreaterThan(0);
    expect(next.lastSeabedNormalImpulseNs).toBeGreaterThan(0);
    expect(Math.abs(next.lastSeabedFrictionImpulseNs)).toBeGreaterThan(0);
    expect(Math.abs(next.object.vxMps)).toBeLessThan(Math.abs(state.object.vxMps));
    expect(next.object.vyMps).toBeGreaterThanOrEqual(0);
  });

  it("settles on the seabed after damped contact motion", () => {
    const steel = cloneObjectSpec(objectPresets.find((preset) => preset.id === "steel-sphere") ?? objectPresets[0]);
    let state = createSimulation(steel, 1, 0);
    const seabedCenterY = -calmTank.waterDepthM + (steel.dimensions.diameter ?? 1) / 2;
    state.phase = "sinking";
    state.object.centerYM = seabedCenterY + 0.01;
    state.object.vyMps = -1.2;
    state.object.vxMps = 0.35;
    state.object.angularVelocityRadps = 0.18;

    for (let index = 0; index < 420 && state.phase !== "sank"; index += 1) {
      state = stepSimulation(state, steel, calmTank, 0.02);
    }

    expect(state.phase).toBe("sank");
    expect(state.sankAtS).not.toBeNull();
    expect(state.object.centerYM).toBeCloseTo(seabedCenterY, 6);
    expect(Math.abs(state.object.vyMps)).toBeLessThan(0.001);
    expect(Math.abs(state.object.vxMps)).toBeLessThan(0.04);
  });

  it("creates an energy-scaled splash on water entry", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    let state = startDrop(createSimulation(concrete, 8));
    for (let index = 0; index < 500 && !state.impact; index += 1) {
      state = stepSimulation(state, concrete, calmTank, 0.01);
    }
    expect(state.impact).not.toBeNull();
    expect(state.impact?.substepFraction ?? 0).toBeGreaterThanOrEqual(0);
    expect(state.impact?.substepFraction ?? 1).toBeLessThanOrEqual(1);
    expect(state.impact?.impactSpeedMps).toBeGreaterThan(8);
    expect(Math.abs(state.impact?.horizontalEntrySpeedMps ?? 0)).toBeLessThan(0.35);
    expect(state.impact?.splashHeightM).toBeGreaterThan(0.8);
    expect(state.impact?.splashEnergyJ).toBeGreaterThan(0);
    expect(state.impact?.coupledWaterMassKg).toBeGreaterThan(0);
    expect(state.impact?.cavityDepthM).toBeGreaterThan(0.1);
    expect(state.impact?.cavityCollapseTimeS).toBeGreaterThan(0.2);
    expect(state.impact?.initialVentilationFraction).toBeGreaterThan(0.2);
    expect(state.particles.length).toBeGreaterThan(10);
  });

  it("interpolates water-entry impact inside a coarse simulation step", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    let state = createSimulation(concrete, 1, 0);
    state.phase = "falling";
    state.object.centerYM = (concrete.dimensions.height ?? 1) / 2 + 0.05;
    state.object.vyMps = -2.5;

    state = stepSimulation(state, concrete, calmTank, 0.04);

    expect(state.impact).not.toBeNull();
    expect(state.impact?.atS ?? Infinity).toBeGreaterThan(0);
    expect(state.impact?.atS ?? Infinity).toBeLessThan(state.timeS);
    expect(state.impact?.substepFraction ?? 1).toBeGreaterThan(0);
    expect(state.impact?.substepFraction ?? 0).toBeLessThan(1);
    expect(state.impact?.surfaceYM ?? Infinity).toBeCloseTo(0, 5);
  });

  it("keeps impact speed stable across coarse and fine time steps", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const coarse = runUntilImpact(concrete, 4, 0, calmTank, 0.018);
    const fine = runUntilImpact(concrete, 4, 0, calmTank, 0.005);
    const speedDelta = Math.abs((coarse.impact?.impactSpeedMps ?? 0) - (fine.impact?.impactSpeedMps ?? 0));
    const timeDelta = Math.abs((coarse.impact?.atS ?? 0) - (fine.impact?.atS ?? 0));

    expect(speedDelta).toBeLessThan(0.12);
    expect(timeDelta).toBeLessThan(0.02);
  });

  it("biases oblique impact waves downrange while conserving surface volume", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    let state = startDrop(createSimulation(concrete, 8, 0.32));
    state.object.vxMps = 2.8;
    for (let index = 0; index < 500 && !state.impact; index += 1) {
      state = stepSimulation(state, concrete, calmTank, 0.01);
    }

    expect(state.impact).not.toBeNull();
    expect(state.impact?.horizontalEntrySpeedMps ?? 0).toBeGreaterThan(1.2);
    expect(state.impact?.splashAsymmetry ?? 0).toBeGreaterThan(0.18);
    const impactX = state.object.xM;
    const downrangeElevationM = dynamicSurfaceElevationAt(state, impactX + 0.8);
    const upstreamElevationM = dynamicSurfaceElevationAt(state, impactX - 0.8);
    expect(downrangeElevationM).toBeGreaterThan(upstreamElevationM + 0.004);
    expect(Math.abs(dynamicSurfaceVolumePerMeterM2(state))).toBeLessThan(0.000001);
  });

  it("applies radius-dependent air drag to splash droplets", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    let state = createSimulation(foam, 1);
    const droplet: SplashParticle = {
      id: 99,
      xM: 0,
      yM: 1.2,
      vxMps: 4,
      vyMps: 10,
      ageS: 0,
      lifetimeS: 2,
      radiusM: 0.004,
    };
    state = {
      ...state,
      particles: [droplet],
    };
    const next = stepSimulation(state, foam, calmTank, 0.04);
    expect(next.particles.length).toBe(1);
    expect(next.particles[0].vyMps).toBeLessThan(droplet.vyMps - calmTank.gravity * 0.04);
    expect(next.particles[0].vxMps).toBeLessThan(droplet.vxMps);
  });

  it("returns falling spray energy into secondary free-surface impacts", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    let state = createSimulation(foam, 1);
    const fallingDroplet: SplashParticle = {
      id: 100,
      xM: 0.4,
      yM: 0.05,
      vxMps: 0,
      vyMps: -3,
      ageS: 0,
      lifetimeS: 2,
      radiusM: 0.012,
    };
    state = {
      ...state,
      particles: [fallingDroplet],
    };
    const next = stepSimulation(state, foam, calmTank, 0.04);
    expect(next.particles.length).toBe(0);
    expect(next.lastSprayReentryCount).toBe(1);
    expect(next.lastSprayReentryEnergyJ).toBeGreaterThan(0);
    expect(next.lastSprayReentryMassKg).toBeGreaterThan(0);
    expect(diagnosticsFor(next, foam, calmTank).freeSurfaceEnergyJ).toBeGreaterThan(0);
  });

  it("keeps a transient ventilated cavity after water entry", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const state = runUntilImpact(concrete, 8);
    state.object.centerYM = -0.18;
    const diagnostics = diagnosticsFor(state, concrete, calmTank);
    expect(diagnostics.cavityCollapseTimeS).toBeGreaterThan(0);
    expect(diagnostics.cavityDepthRemainingM).toBeGreaterThan(0);
    expect(diagnostics.cavityVentilationFraction).toBeGreaterThan(0.1);
    expect(diagnostics.wettedDisplacedVolumeM3).toBeLessThan(diagnostics.displacedVolumeM3);
  });

  it("reduces attached-flow drag while an entry cavity is ventilated", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const ventilated = runUntilImpact(concrete, 8);
    ventilated.object.centerYM = -0.18;
    ventilated.object.vyMps = -2.5;
    const attached = {
      ...ventilated,
      impact: null,
      object: { ...ventilated.object },
      particles: ventilated.particles.slice(),
      ripples: ventilated.ripples.slice(),
      history: ventilated.history.slice(),
      freeSurface: {
        ...ventilated.freeSurface,
        displacementM: ventilated.freeSurface.displacementM.slice(),
        velocityMps: ventilated.freeSurface.velocityMps.slice(),
      },
    };
    const ventilatedDiagnostics = diagnosticsFor(ventilated, concrete, calmTank);
    const attachedDiagnostics = diagnosticsFor(attached, concrete, calmTank);
    expect(ventilatedDiagnostics.cavityVentilationFraction).toBeGreaterThan(0.1);
    expect(ventilatedDiagnostics.wettedDisplacedVolumeM3).toBeLessThan(attachedDiagnostics.wettedDisplacedVolumeM3);
    expect(Math.abs(ventilatedDiagnostics.dragN)).toBeLessThan(Math.abs(attachedDiagnostics.dragN) * 0.75);
  });

  it("collapses entry ventilation after the cavity lifetime", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const state = runUntilImpact(concrete, 8);
    state.object.centerYM = -0.18;
    state.timeS = (state.impact?.atS ?? 0) + (state.impact?.cavityCollapseTimeS ?? 0) + 0.05;
    const diagnostics = diagnosticsFor(state, concrete, calmTank);
    expect(diagnostics.cavityVentilationFraction).toBe(0);
    expect(diagnostics.cavityDepthRemainingM).toBe(0);
    expect(diagnostics.wettedDisplacedVolumeM3).toBeCloseTo(diagnostics.displacedVolumeM3, 8);
  });

  it("applies displacement-rate slam and couples the water surface during entry", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const state = runUntilImpact(concrete, 8);
    expect(state.lastDisplacedVolumeRateM3ps).toBeGreaterThan(0);
    expect(state.lastWaterEntrySlamN).toBeGreaterThan(0);
    expect(Math.abs(state.lastWaveCoupledVolumeM3)).toBeGreaterThan(0);
    expect(diagnosticsFor(state, concrete, calmTank).freeSurfaceEnergyJ).toBeGreaterThan(0);
  });

  it("builds turbulent wake memory and entrained-water drag after high-energy entry", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    let state = runUntilImpact(concrete, 8);
    for (let index = 0; index < 30; index += 1) {
      state = stepSimulation(state, concrete, calmTank, 0.01);
    }
    const diagnostics = diagnosticsFor(state, concrete, calmTank);
    expect(state.wakeTurbulence).toBeGreaterThan(0.05);
    expect(diagnostics.wakeTurbulence).toBeCloseTo(state.wakeTurbulence, 6);
    expect(diagnostics.wakeEntrainedMassKg).toBeGreaterThan(0);
    expect(diagnostics.wakeDragN).toBeGreaterThan(0);
    expect(diagnostics.wakeSheddingFrequencyHz).toBeGreaterThan(0);
  });

  it("applies wake drag opposite the submerged motion direction", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const downward = createSimulation(concrete, 1, 0);
    downward.phase = "sinking";
    downward.object.centerYM = -1;
    downward.object.vyMps = -2.2;
    downward.wakeTurbulence = 1.1;
    const upward = createSimulation(concrete, 1, 0);
    upward.phase = "floating";
    upward.object.centerYM = downward.object.centerYM;
    upward.object.vyMps = 2.2;
    upward.wakeTurbulence = downward.wakeTurbulence;
    const downwardDiagnostics = diagnosticsFor(downward, concrete, calmTank);
    const upwardDiagnostics = diagnosticsFor(upward, concrete, calmTank);
    expect(downwardDiagnostics.wakeDragN).toBeGreaterThan(0);
    expect(upwardDiagnostics.wakeDragN).toBeLessThan(0);
    expect(Math.abs(downwardDiagnostics.wakeEntrainedMassKg)).toBeGreaterThan(0);
  });

  it("adds water-entry slam torque for angled impacts", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const state = runUntilImpact(concrete, 8, 0.36);
    expect(state.lastWaterEntrySlamN).toBeGreaterThan(0);
    expect(Math.abs(state.lastWaterEntrySlamCenterXM)).toBeGreaterThan(0.01);
    expect(Math.abs(state.lastWaterEntrySlamMomentNm)).toBeGreaterThan(0.1);
    expect(Math.sign(state.lastWaterEntrySlamMomentNm)).toBe(Math.sign(state.lastWaterEntrySlamCenterXM * state.lastWaterEntrySlamN));
  });

  it("deposits more free-surface energy for a higher-energy impact", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const low = runUntilImpact(concrete, 2);
    const high = runUntilImpact(concrete, 10);
    expect(diagnosticsFor(low, concrete, calmTank).freeSurfaceEnergyJ).toBeGreaterThan(0);
    expect(diagnosticsFor(high, concrete, calmTank).freeSurfaceEnergyJ).toBeGreaterThan(diagnosticsFor(low, concrete, calmTank).freeSurfaceEnergyJ * 1.6);
    expect(diagnosticsFor(high, concrete, calmTank).freeSurfaceMaxDisplacementM).toBeGreaterThan(0.05);
  });

  it("propagates the impact disturbance across the free surface", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    let state = runUntilImpact(concrete, 8);
    const impactX = state.object.xM;
    const farBefore = Math.abs(dynamicSurfaceElevationAt(state, impactX + 3));
    for (let index = 0; index < 140; index += 1) {
      state = stepSimulation(state, concrete, calmTank, 0.01);
    }
    const farAfter = Math.abs(dynamicSurfaceElevationAt(state, impactX + 3));
    expect(farAfter).toBeGreaterThan(Math.max(0.003, farBefore * 2));
  });

  it("propagates impact waves faster in deeper water than in a shallow tank", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const shallowTank = { ...calmTank, waterDepthM: 0.45, waveHeightM: 0.6 };
    const deepTank = { ...calmTank, waterDepthM: 18, waveHeightM: 0.6 };
    let shallow = runUntilImpact(concrete, 3, 0, shallowTank);
    let deep = runUntilImpact(concrete, 3, 0, deepTank);
    const shallowImpactX = shallow.object.xM;
    const deepImpactX = deep.object.xM;
    for (let index = 0; index < 58; index += 1) {
      shallow = stepSimulation(shallow, concrete, shallowTank, 0.01);
      deep = stepSimulation(deep, concrete, deepTank, 0.01);
    }

    const shallowNearM = Math.abs(dynamicSurfaceElevationAt(shallow, shallowImpactX + 1.2));
    const shallowFarM = Math.abs(dynamicSurfaceElevationAt(shallow, shallowImpactX + 2.5));
    const deepFarM = Math.abs(dynamicSurfaceElevationAt(deep, deepImpactX + 2.5));
    expect(diagnosticsFor(deep, concrete, deepTank).freeSurfaceWaveSpeedMps).toBeGreaterThan(
      diagnosticsFor(shallow, concrete, shallowTank).freeSurfaceWaveSpeedMps * 1.7
    );
    expect(deepFarM).toBeGreaterThan(shallowFarM * 12);
    expect(shallowNearM).toBeGreaterThan(shallowFarM);
  });

  it("reports depth-aware impact-wave layer speed and effective depth", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const shallowTank = { ...calmTank, waterDepthM: 0.42, waveHeightM: 0.2 };
    const deepTank = { ...calmTank, waterDepthM: 12, waveHeightM: 0.2 };
    const shallowDiagnostics = diagnosticsFor(createSimulation(foam, 1), foam, shallowTank);
    const deepDiagnostics = diagnosticsFor(createSimulation(foam, 1), foam, deepTank);

    expect(shallowDiagnostics.freeSurfaceEffectiveDepthM).toBeCloseTo(shallowTank.waterDepthM, 6);
    expect(deepDiagnostics.freeSurfaceEffectiveDepthM).toBeGreaterThan(shallowDiagnostics.freeSurfaceEffectiveDepthM);
    expect(deepDiagnostics.freeSurfaceWaveSpeedMps).toBeGreaterThan(shallowDiagnostics.freeSurfaceWaveSpeedMps);
    expect(shallowDiagnostics.freeSurfaceWaveSpeedMps).toBeCloseTo(Math.sqrt(shallowTank.gravity * shallowTank.waterDepthM), 1);
  });

  it("keeps water-entry speed close to gravity free-fall for compact dense bodies", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const dropHeightM = 8;
    let state = startDrop(createSimulation(concrete, dropHeightM));
    for (let index = 0; index < 500 && !state.impact; index += 1) {
      state = stepSimulation(state, concrete, calmTank, 0.01);
    }
    const idealSpeed = Math.sqrt(2 * calmTank.gravity * dropHeightM);
    expect(state.impact?.impactSpeedMps).toBeGreaterThan(idealSpeed * 0.88);
    expect(state.impact?.impactSpeedMps).toBeLessThan(idealSpeed);
  });

  it("applies vector air drag before water entry", () => {
    const crate = cloneObjectSpec(objectPresets.find((preset) => preset.id === "hardwood-crate") ?? objectPresets[0]);
    const state = startDrop(createSimulation(crate, 12, 0.25));
    state.object.vxMps = 2.2;
    state.object.vyMps = -10;
    const diagnostics = diagnosticsFor(state, crate, calmTank);
    const dragPowerW =
      diagnostics.hydrodynamicDragForceXN * state.object.vxMps +
      diagnostics.hydrodynamicDragForceYN * state.object.vyMps;

    expect(diagnostics.submergedFraction).toBe(0);
    expect(diagnostics.hydrodynamicDragSpeedMps).toBeCloseTo(Math.hypot(state.object.vxMps, state.object.vyMps), 2);
    expect(diagnostics.hydrodynamicDragForceXN).toBeLessThan(0);
    expect(diagnostics.hydrodynamicDragForceYN).toBeGreaterThan(0);
    expect(dragPowerW).toBeLessThan(0);
  });

  it("computes a righting moment opposite the heel angle for a stable floating block", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const state = createSimulation(foam, 1, 0.22);
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    const diagnostics = diagnosticsFor(state, foam, calmTank);
    expect(diagnostics.rotationalStability).toBe("positive");
    expect(diagnostics.metacentricHeightM).toBeGreaterThan(0);
    expect(diagnostics.centerOfBuoyancyXM).toBeLessThan(0);
    expect(diagnostics.restoringMomentNm).toBeLessThan(0);
  });

  it("reports roll moment from off-center hydrodynamic loads", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    const state = createSimulation(foam, 1, Math.PI / 5);
    state.phase = "floating";
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    state.object.vxMps = 0.9;
    state.object.vyMps = -0.45;
    const diagnostics = diagnosticsFor(state, foam, calmTank);
    const expectedMoment =
      (diagnostics.hydrodynamicCenterOfPressureXM - diagnostics.centerOfGravityXM) * diagnostics.hydrodynamicLoadForceYN -
      (diagnostics.hydrodynamicCenterOfPressureYM - diagnostics.centerOfGravityYM) * diagnostics.hydrodynamicLoadForceXN;
    expect(Math.abs(diagnostics.hydrodynamicLoadMomentNm)).toBeGreaterThan(0.5);
    expect(diagnostics.hydrodynamicLoadMomentNm).toBeCloseTo(expectedMoment, 6);
  });

  it("computes drag opposite the combined relative flow vector", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const state = createSimulation(concrete, 1, 0.22);
    state.phase = "sinking";
    state.object.centerYM = -0.8;
    state.object.vxMps = 1.4;
    state.object.vyMps = -1.9;
    const diagnostics = diagnosticsFor(state, concrete, calmTank);
    const dragPowerW =
      diagnostics.hydrodynamicDragForceXN * state.object.vxMps +
      diagnostics.hydrodynamicDragForceYN * state.object.vyMps;

    expect(diagnostics.hydrodynamicDragSpeedMps).toBeCloseTo(Math.hypot(state.object.vxMps, state.object.vyMps), 2);
    expect(diagnostics.hydrodynamicDragAreaM2).toBeGreaterThan(0);
    expect(diagnostics.hydrodynamicDragForceXN).toBeLessThan(0);
    expect(diagnostics.hydrodynamicDragForceYN).toBeGreaterThan(0);
    expect(dragPowerW).toBeLessThan(0);
  });

  it("uses the same vector drag to slow horizontal underwater motion", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    let state = createSimulation(concrete, 1, 0);
    state.phase = "sinking";
    state.object.centerYM = -0.8;
    state.object.vxMps = 1.4;
    state.object.vyMps = 0;
    const before = diagnosticsFor(state, concrete, calmTank);

    state = stepSimulation(state, concrete, calmTank, 0.04);

    expect(before.hydrodynamicDragForceXN).toBeLessThan(0);
    expect(state.object.vxMps).toBeLessThan(1.4);
  });

  it("generates cross-flow lift for angled bluff bodies moving through water", () => {
    const crate = cloneObjectSpec(objectPresets.find((preset) => preset.id === "hardwood-crate") ?? objectPresets[0]);
    const positive = createSimulation(crate, 1, 0.38);
    positive.phase = "sinking";
    positive.object.centerYM = -0.65;
    positive.object.vyMps = -2.4;
    const negative = createSimulation(crate, 1, -0.38);
    negative.phase = positive.phase;
    negative.object.centerYM = positive.object.centerYM;
    negative.object.vyMps = positive.object.vyMps;

    const positiveDiagnostics = diagnosticsFor(positive, crate, calmTank);
    const negativeDiagnostics = diagnosticsFor(negative, crate, calmTank);

    expect(positiveDiagnostics.hydrodynamicLiftCoefficient).toBeGreaterThan(0.1);
    expect(positiveDiagnostics.hydrodynamicLiftForceXN).toBeGreaterThan(1);
    expect(negativeDiagnostics.hydrodynamicLiftCoefficient).toBeLessThan(-0.1);
    expect(negativeDiagnostics.hydrodynamicLiftForceXN).toBeLessThan(-1);
    expect(Math.sign(positiveDiagnostics.hydrodynamicLiftForceXN)).toBe(-Math.sign(negativeDiagnostics.hydrodynamicLiftForceXN));
  });

  it("keeps sphere cross-flow lift small compared with bluff-body lift", () => {
    const crate = cloneObjectSpec(objectPresets.find((preset) => preset.id === "hardwood-crate") ?? objectPresets[0]);
    const sphere = cloneObjectSpec(objectPresets.find((preset) => preset.id === "steel-sphere") ?? objectPresets[0]);
    const crateState = createSimulation(crate, 1, 0.38);
    crateState.phase = "sinking";
    crateState.object.centerYM = -0.65;
    crateState.object.vyMps = -2.4;
    const sphereState = createSimulation(sphere, 1, 0.38);
    sphereState.phase = "sinking";
    sphereState.object.centerYM = -0.65;
    sphereState.object.vyMps = -2.4;

    const crateLift = Math.abs(diagnosticsFor(crateState, crate, calmTank).hydrodynamicLiftForceXN);
    const sphereLift = Math.abs(diagnosticsFor(sphereState, sphere, calmTank).hydrodynamicLiftForceXN);
    expect(crateLift).toBeGreaterThan(1);
    expect(sphereLift).toBeLessThan(crateLift * 0.12);
  });

  it("couples cross-flow lift into horizontal motion", () => {
    const crate = cloneObjectSpec(objectPresets.find((preset) => preset.id === "hardwood-crate") ?? objectPresets[0]);
    let state = createSimulation(crate, 1, 0.38);
    state.phase = "sinking";
    state.object.centerYM = -0.65;
    state.object.vyMps = -2.4;
    state.object.vxMps = 0;

    state = stepSimulation(state, crate, calmTank, 0.04);

    expect(state.object.vxMps).toBeGreaterThan(0.0001);
  });

  it("applies off-center horizontal water drag as roll torque", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    let state = createSimulation(foam, 1, 0);
    state.phase = "floating";
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    state.object.vxMps = 1.5;
    const before = diagnosticsFor(state, foam, calmTank);
    expect(Math.abs(before.hydrodynamicLoadMomentNm)).toBeGreaterThan(0.5);
    state = stepSimulation(state, foam, calmTank, 0.04);
    expect(Math.sign(state.object.angularVelocityRadps)).toBe(Math.sign(before.hydrodynamicLoadMomentNm));
    expect(Math.abs(state.object.angularVelocityRadps)).toBeGreaterThan(0.0001);
  });

  it("reports wave slope angular velocity consistent with finite-difference slope motion", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const waveTank = { ...calmTank, waveHeightM: 1.4, wavePeriodS: 6.2, waterDepthM: 22 };
    const state = createSimulation(foam, 1, 0);
    state.object.xM = 2.25;
    state.timeS = 0.7;
    const dt = 0.0005;
    const previous = resolvedSurfaceSlopeAt(state, state.object.xM, state.timeS - dt, waveTank);
    const next = resolvedSurfaceSlopeAt(state, state.object.xM, state.timeS + dt, waveTank);
    const finiteDifferenceRadps = (next - previous) / (2 * dt);
    const analyticRadps = resolvedSurfaceSlopeAngularVelocityAt(state, state.object.xM, state.timeS, waveTank);
    expect(Math.abs(analyticRadps)).toBeGreaterThan(0.002);
    expect(analyticRadps).toBeCloseTo(finiteDifferenceRadps, 4);
  });

  it("reports wave slope angular acceleration consistent with finite-difference slope velocity", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const waveTank = { ...calmTank, waveHeightM: 1.4, wavePeriodS: 5.8, waterDepthM: 22 };
    const state = createSimulation(foam, 1, 0);
    state.object.xM = 1.85;
    let bestTimeS = 0;
    let bestAcceleration = 0;
    for (let timeS = 0; timeS <= waveTank.wavePeriodS; timeS += 0.1) {
      const acceleration = resolvedSurfaceSlopeAngularAccelerationAt(state, state.object.xM, timeS, waveTank);
      if (Math.abs(acceleration) > Math.abs(bestAcceleration)) {
        bestAcceleration = acceleration;
        bestTimeS = timeS;
      }
    }
    const dt = 0.0005;
    const previous = resolvedSurfaceSlopeAngularVelocityAt(state, state.object.xM, bestTimeS - dt, waveTank);
    const next = resolvedSurfaceSlopeAngularVelocityAt(state, state.object.xM, bestTimeS + dt, waveTank);
    const finiteDifferenceRadps2 = (next - previous) / (2 * dt);
    const analyticRadps2 = resolvedSurfaceSlopeAngularAccelerationAt(state, state.object.xM, bestTimeS, waveTank);
    expect(Math.abs(analyticRadps2)).toBeGreaterThan(0.0005);
    expect(analyticRadps2).toBeCloseTo(finiteDifferenceRadps2, 4);
  });

  it("damps roll relative to the moving wave face instead of the fixed world", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const waveTank = { ...calmTank, waveHeightM: 1.6, wavePeriodS: 5.8, waterDepthM: 22 };
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / waveTank.waterDensityKgM3;
    const lagging = createSimulation(foam, 1, 0);
    lagging.phase = "floating";
    lagging.object.centerYM = height / 2 - equilibriumFraction * height;
    lagging.object.xM = 2.4;
    lagging.object.angularVelocityRadps = 0;
    let laggingDiagnostics = diagnosticsFor(lagging, foam, waveTank);
    let bestTimeS = lagging.timeS;
    for (let timeS = 0; timeS <= waveTank.wavePeriodS; timeS += 0.1) {
      lagging.timeS = timeS;
      const candidate = diagnosticsFor(lagging, foam, waveTank);
      if (Math.abs(candidate.waveAngularVelocityRadps) > Math.abs(laggingDiagnostics.waveAngularVelocityRadps)) {
        laggingDiagnostics = candidate;
        bestTimeS = timeS;
      }
    }
    lagging.timeS = bestTimeS;
    const tracking = createSimulation(foam, 1, 0);
    tracking.phase = "floating";
    tracking.object.centerYM = lagging.object.centerYM;
    tracking.object.xM = lagging.object.xM;
    tracking.timeS = lagging.timeS;
    tracking.object.angularVelocityRadps = laggingDiagnostics.waveAngularVelocityRadps;
    const trackingDiagnostics = diagnosticsFor(tracking, foam, waveTank);
    expect(Math.abs(laggingDiagnostics.waveAngularVelocityRadps)).toBeGreaterThan(0.002);
    expect(Math.sign(laggingDiagnostics.angularDragNm)).toBe(Math.sign(laggingDiagnostics.waveAngularVelocityRadps));
    expect(Math.abs(trackingDiagnostics.relativeAngularVelocityRadps)).toBeLessThan(0.000001);
    expect(Math.abs(trackingDiagnostics.angularDragNm)).toBeLessThan(Math.abs(laggingDiagnostics.angularDragNm) * 0.02);
  });

  it("adds roll excitation torque from wave angular acceleration and roll added inertia", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const waveTank = { ...calmTank, waveHeightM: 2, wavePeriodS: 4.8, waterDepthM: 22 };
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / waveTank.waterDensityKgM3;
    const state = createSimulation(foam, 1, 0);
    state.phase = "floating";
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    state.object.xM = 1.6;
    let diagnostics = diagnosticsFor(state, foam, waveTank);
    for (let timeS = 0; timeS <= waveTank.wavePeriodS; timeS += 0.1) {
      state.timeS = timeS;
      const candidate = diagnosticsFor(state, foam, waveTank);
      if (Math.abs(candidate.waveAngularAccelerationRadps2) > Math.abs(diagnostics.waveAngularAccelerationRadps2)) {
        diagnostics = candidate;
      }
    }
    expect(diagnostics.angularAddedInertiaKgM2).toBeGreaterThan(0);
    expect(Math.abs(diagnostics.waveAngularAccelerationRadps2)).toBeGreaterThan(0.0005);
    expect(diagnostics.rollExcitationTorqueNm).toBeCloseTo(
      diagnostics.angularAddedInertiaKgM2 * diagnostics.waveAngularAccelerationRadps2,
      5
    );
    expect(Math.sign(diagnostics.rollExcitationTorqueNm)).toBe(Math.sign(diagnostics.waveAngularAccelerationRadps2));
  });

  it("damps a floating block toward the local water surface angle", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    let state = createSimulation(foam, 1, 0.32);
    state.phase = "floating";
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    for (let index = 0; index < 700; index += 1) {
      state = stepSimulation(state, foam, calmTank, 0.01);
    }
    expect(Math.abs(state.object.angleRad)).toBeLessThan(0.16);
    expect(Math.abs(state.object.angularVelocityRadps)).toBeLessThan(0.18);
  });

  it("reports heave stiffness, added mass, and natural period from waterplane physics", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    const state = createSimulation(foam, 1, 0);
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    const diagnostics = diagnosticsFor(state, foam, calmTank);
    const expectedStiffness = calmTank.waterDensityKgM3 * calmTank.gravity * diagnostics.waterplaneAreaM2;
    const expectedPeriod = Math.PI * 2 * Math.sqrt((diagnostics.massKg + diagnostics.addedMassKg) / expectedStiffness);
    expect(diagnostics.hydrostaticStiffnessNpm).toBeCloseTo(expectedStiffness, 5);
    expect(diagnostics.addedMassKg).toBeGreaterThan(0);
    expect(diagnostics.heaveRadiationDampingNsPerM).toBeGreaterThan(0);
    expect(diagnostics.heaveNaturalPeriodS).toBeCloseTo(expectedPeriod, 4);
  });

  it("adds extra heave and roll damping for shallow low-density floaters", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const ice = cloneObjectSpec(objectPresets.find((preset) => preset.id === "ice-block") ?? objectPresets[0]);
    const foamHeight = foam.dimensions.height ?? 1;
    const iceHeight = ice.dimensions.height ?? 1;
    const foamEquilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    const iceEquilibriumFraction = ice.densityKgM3 / calmTank.waterDensityKgM3;
    const foamState = createSimulation(foam, 1, 0);
    foamState.phase = "floating";
    foamState.object.centerYM = foamHeight / 2 - foamEquilibriumFraction * foamHeight;
    foamState.object.angularVelocityRadps = 0.18;
    const iceState = createSimulation(ice, 1, 0);
    iceState.phase = "floating";
    iceState.object.centerYM = iceHeight / 2 - iceEquilibriumFraction * iceHeight;
    iceState.object.angularVelocityRadps = 0.18;
    const foamDiagnostics = diagnosticsFor(foamState, foam, calmTank);
    const iceDiagnostics = diagnosticsFor(iceState, ice, calmTank);
    const foamEffectiveHeaveMass = foamDiagnostics.massKg + foamDiagnostics.addedMassKg;
    const iceEffectiveHeaveMass = iceDiagnostics.massKg + iceDiagnostics.addedMassKg;
    const foamDampingRatio =
      foamDiagnostics.heaveRadiationDampingNsPerM /
      (2 * Math.sqrt(foamDiagnostics.hydrostaticStiffnessNpm * foamEffectiveHeaveMass));
    const iceDampingRatio =
      iceDiagnostics.heaveRadiationDampingNsPerM /
      (2 * Math.sqrt(iceDiagnostics.hydrostaticStiffnessNpm * iceEffectiveHeaveMass));

    expect(foamDampingRatio).toBeGreaterThan(0.58);
    expect(iceDampingRatio).toBeLessThan(0.55);
    expect(Math.abs(foamDiagnostics.angularDragNm)).toBeGreaterThan(6);
  });

  it("builds radiation memory that opposes vertical heave velocity", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / calmTank.waterDensityKgM3;
    let state = createSimulation(foam, 1, 0);
    state.phase = "floating";
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    state.object.vyMps = -0.65;
    for (let index = 0; index < 14; index += 1) {
      state = stepSimulation(state, foam, calmTank, 0.01);
    }
    expect(state.heaveRadiationForceN).toBeGreaterThan(0);
    expect(diagnosticsFor(state, foam, calmTank).heaveRadiationForceN).toBeGreaterThan(0);

    state.object.vyMps = 0.65;
    for (let index = 0; index < 46; index += 1) {
      state = stepSimulation(state, foam, calmTank, 0.01);
    }
    expect(state.heaveRadiationForceN).toBeLessThan(0);
    expect(diagnosticsFor(state, foam, calmTank).heaveRadiationForceN).toBeLessThan(0);
  });

  it("samples wave orbital velocity at the surface and attenuates it with depth", () => {
    const waveTank = { ...calmTank, waveHeightM: 1.2, wavePeriodS: 6.5, waterDepthM: 22 };
    const surface = waveOrbitalKinematicsAtDepth(0, 0, 0, waveTank);
    const deep = waveOrbitalKinematicsAtDepth(0, 8, 0, waveTank);
    expect(surface.velocityYMps).toBeCloseTo(surfaceVerticalVelocityAt(0, 0, waveTank), 6);
    expect(Math.abs(surface.velocityYMps)).toBeGreaterThan(0.1);
    expect(Math.abs(deep.velocityYMps)).toBeLessThan(Math.abs(surface.velocityYMps) * 0.55);
    expect(deep.depthBelowSurfaceM).toBe(8);
  });

  it("solves finite-depth wave dispersion in deep and shallow limits", () => {
    const periodS = 6;
    const deepWaterLengthM = (calmTank.gravity * periodS ** 2) / (Math.PI * 2);
    const deepLengthM = finiteDepthWaveLengthM(periodS, 220, calmTank.gravity);
    const shallowLengthM = finiteDepthWaveLengthM(periodS, 1.2, calmTank.gravity);
    const shallowSpeedMps = finiteDepthWavePhaseSpeedMps(periodS, 1.2, calmTank.gravity);
    const shallowLimitSpeedMps = Math.sqrt(calmTank.gravity * 1.2);

    expect(deepLengthM).toBeCloseTo(deepWaterLengthM, 1);
    expect(shallowLengthM).toBeLessThan(deepWaterLengthM * 0.45);
    expect(Math.abs(shallowSpeedMps - shallowLimitSpeedMps) / shallowLimitSpeedMps).toBeLessThan(0.035);
  });

  it("reports shorter wavelength and slower phase speed in shallow water", () => {
    const ice = cloneObjectSpec(objectPresets.find((preset) => preset.id === "ice-block") ?? objectPresets[0]);
    const deepTank = { ...calmTank, waveHeightM: 1.1, wavePeriodS: 6, waterDepthM: 80 };
    const shallowTank = { ...deepTank, waterDepthM: 1.2 };
    const deepState = createSimulation(ice, 1, 0);
    const shallowState = createSimulation(ice, 1, 0);
    const deepDiagnostics = diagnosticsFor(deepState, ice, deepTank);
    const shallowDiagnostics = diagnosticsFor(shallowState, ice, shallowTank);

    expect(shallowDiagnostics.waveLengthM).toBeLessThan(deepDiagnostics.waveLengthM * 0.5);
    expect(shallowDiagnostics.wavePhaseSpeedMps).toBeLessThan(deepDiagnostics.wavePhaseSpeedMps * 0.5);
    const shallowLimitLengthM = shallowTank.wavePeriodS * Math.sqrt(shallowTank.gravity * shallowTank.waterDepthM);
    expect(Math.abs(shallowDiagnostics.waveLengthM - shallowLimitLengthM) / shallowLimitLengthM).toBeLessThan(0.035);
  });

  it("reduces vertical drag when a floating body moves with local orbital water velocity", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const waveTank = { ...calmTank, waveHeightM: 1.4, wavePeriodS: 6.2, waterDepthM: 22 };
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / waveTank.waterDensityKgM3;
    const fixed = createSimulation(foam, 1, 0);
    fixed.phase = "floating";
    fixed.object.centerYM = height / 2 - equilibriumFraction * height;
    fixed.object.xM = 2.5;
    fixed.timeS = 0.4;
    const fixedDiagnostics = diagnosticsFor(fixed, foam, waveTank);
    const matched = createSimulation(foam, 1, 0);
    matched.phase = "floating";
    matched.object.centerYM = fixed.object.centerYM;
    matched.object.xM = fixed.object.xM;
    matched.timeS = fixed.timeS;
    matched.object.vyMps = fixedDiagnostics.fluidVelocityYMps * fixedDiagnostics.submergedFraction;
    const matchedDiagnostics = diagnosticsFor(matched, foam, waveTank);
    expect(Math.abs(fixedDiagnostics.fluidVelocityYMps)).toBeGreaterThan(0.04);
    expect(Math.abs(matchedDiagnostics.dragN)).toBeLessThan(Math.abs(fixedDiagnostics.dragN) * 0.35);
  });

  it("uses orbital wave loading to push floating objects horizontally in waves", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    const waveTank = { ...calmTank, currentSpeedMps: 0, waveHeightM: 2, wavePeriodS: 5.8, waterDepthM: 22, windSpeedMps: 0 };
    const height = foam.dimensions.height ?? 1;
    const equilibriumFraction = foam.densityKgM3 / waveTank.waterDensityKgM3;
    let state = createSimulation(foam, 1, 0);
    state.phase = "floating";
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    state.object.xM = 4;
    state.timeS = 0.25;
    const before = diagnosticsFor(state, foam, waveTank);
    state = stepSimulation(state, foam, waveTank, 0.04);
    expect(Math.abs(before.fluidVelocityXMps)).toBeGreaterThan(0.02);
    expect(Math.abs(before.waveExcitationForceXN)).toBeGreaterThan(0.5);
    expect(Math.sign(state.object.vxMps)).toBe(Math.sign(before.waveExcitationForceXN));
    expect(Math.abs(state.object.vxMps)).toBeGreaterThan(0.0001);
  });

  it("reports Morison-style wave excitation from local fluid acceleration", () => {
    const ice = cloneObjectSpec(objectPresets.find((preset) => preset.id === "ice-block") ?? objectPresets[0]);
    const waveTank = { ...calmTank, waveHeightM: 1.1, wavePeriodS: 6.4, waterDepthM: 22 };
    const height = ice.dimensions.height ?? 1;
    const equilibriumFraction = ice.densityKgM3 / waveTank.waterDensityKgM3;
    const state = createSimulation(ice, 1, 0);
    state.phase = "floating";
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    state.object.xM = 1.7;
    state.timeS = 0.55;
    const diagnostics = diagnosticsFor(state, ice, waveTank);
    const displacedWaterMassKg = waveTank.waterDensityKgM3 * diagnostics.displacedVolumeM3;
    expect(Math.abs(diagnostics.fluidAccelerationXMps2)).toBeGreaterThan(0.01);
    expect(Math.abs(diagnostics.fluidAccelerationYMps2)).toBeGreaterThan(0.01);
    expect(diagnostics.waveInertiaCoefficient).toBeGreaterThan(1);
    expect(diagnostics.waveExcitationForceXN).toBeCloseTo(displacedWaterMassKg * diagnostics.waveInertiaCoefficient * diagnostics.fluidAccelerationXMps2, 5);
    expect(diagnostics.waveExcitationForceYN).toBeCloseTo(displacedWaterMassKg * diagnostics.waveInertiaCoefficient * diagnostics.fluidAccelerationYMps2, 5);
  });

  it("includes wave excitation in the reported vertical net force", () => {
    const ice = cloneObjectSpec(objectPresets.find((preset) => preset.id === "ice-block") ?? objectPresets[0]);
    const waveTank = { ...calmTank, waveHeightM: 1.2, wavePeriodS: 5.9, waterDepthM: 22 };
    const height = ice.dimensions.height ?? 1;
    const equilibriumFraction = ice.densityKgM3 / waveTank.waterDensityKgM3;
    const state = createSimulation(ice, 1, 0);
    state.phase = "floating";
    state.object.centerYM = height / 2 - equilibriumFraction * height;
    state.object.xM = 2.1;
    state.timeS = 0.45;
    const diagnostics = diagnosticsFor(state, ice, waveTank);
    const expectedNetForce =
      diagnostics.buoyancyN +
      diagnostics.surfaceTensionForceN +
      diagnostics.dragN +
      diagnostics.heaveRadiationForceN +
      diagnostics.waveExcitationForceYN +
      diagnostics.hydrodynamicLiftForceYN -
      diagnostics.weightN;
    expect(Math.abs(diagnostics.waveExcitationForceYN)).toBeGreaterThan(1);
    expect(diagnostics.netForceN).toBeCloseTo(expectedNetForce, 6);
  });

  it("settles a dropped floating block near the solved hydrostatic equilibrium", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    let state = startDrop(createSimulation(foam, 1.35, 0.18));
    let deviation = equilibriumDeviationFor(state, foam, calmTank);
    for (let index = 0; index < 2600; index += 1) {
      state = stepSimulation(state, foam, calmTank, 0.01);
      if (index % 20 === 0 || state.settledAtS !== null) {
        deviation = equilibriumDeviationFor(state, foam, calmTank);
        if (deviation.withinTolerance) break;
      }
    }
    expect(state.impact).not.toBeNull();
    expect(deviation.equilibrium).not.toBeNull();
    expect(deviation.withinTolerance).toBe(true);
    expect(Math.abs(deviation.draftErrorM ?? Infinity)).toBeLessThan(0.055);
    expect(deviation.buoyancyErrorRatio).toBeLessThan(0.08);
  });

  it("holds a dropped foam block inside the stricter settled window", () => {
    const foam = cloneObjectSpec(objectPresets.find((preset) => preset.id === "foam-rescue-block") ?? objectPresets[0]);
    let state = startDrop(createSimulation(foam, 1.35, 0.18));
    let deviation = equilibriumDeviationFor(state, foam, calmTank);
    for (let index = 0; index < 3200; index += 1) {
      state = stepSimulation(state, foam, calmTank, 0.01);
      if (index % 20 === 0 || state.settledAtS !== null) {
        deviation = equilibriumDeviationFor(state, foam, calmTank);
      }
      if (state.settledAtS !== null) break;
    }

    expect(state.impact).not.toBeNull();
    expect(state.settledAtS).not.toBeNull();
    expect(state.timeS - (state.settledAtS ?? state.timeS)).toBeGreaterThan(2.39);
    expect(deviation.withinTolerance).toBe(true);
    expect(Math.abs(deviation.draftErrorM ?? Infinity)).toBeLessThan(0.04);
    expect(deviation.buoyancyErrorRatio).toBeLessThan(0.035);
    expect(deviation.verticalSpeedMps).toBeLessThan(0.05);
    expect(deviation.angularSpeedRadps).toBeLessThan(0.05);
  });

  it("increases projected vertical area when a box enters water at an angle", () => {
    const crate = cloneObjectSpec(objectPresets.find((preset) => preset.id === "hardwood-crate") ?? objectPresets[0]);
    expect(projectedVerticalAreaAtAngleM2(crate, Math.PI / 4)).toBeGreaterThan(projectedVerticalAreaAtAngleM2(crate, 0));
  });

  it("raises effective drag coefficient in low-Reynolds viscous flow", () => {
    const sphere = cloneObjectSpec(objectPresets.find((preset) => preset.id === "steel-sphere") ?? objectPresets[0]);
    expect(effectiveDragCoefficientFor(sphere, 2)).toBeGreaterThan(effectiveDragCoefficientFor(sphere, 200_000) * 10);
    expect(effectiveDragCoefficientFor(sphere, 200_000)).toBeCloseTo(sphere.dragCoefficient, 2);
  });

  it("reports finite water terminal velocity for dense objects", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const state = createSimulation(concrete, 1);
    state.object.centerYM = -1;
    const diagnostics = diagnosticsFor(state, concrete, calmTank);
    expect(diagnostics.terminalVelocityMps).not.toBeNull();
    expect(diagnostics.terminalVelocityMps ?? 0).toBeGreaterThan(1);
    expect(
      terminalVelocityMpsFor(concrete, diagnostics.massKg, objectVolumeM3(concrete), calmTank.waterDensityKgM3, calmTank.waterDynamicViscosityPaS, 0, calmTank)
    ).toBeGreaterThan(1);
  });

  it("records turbulent high-Weber water entry for compact dense impacts", () => {
    const concrete = cloneObjectSpec(objectPresets.find((preset) => preset.id === "concrete-cube") ?? objectPresets[0]);
    const state = runUntilImpact(concrete, 8);
    expect(state.impact?.reynoldsNumber).toBeGreaterThan(1_000_000);
    expect(state.impact?.weberNumber).toBeGreaterThan(100_000);
  });
});

function runUntilImpact(
  spec: ReturnType<typeof cloneObjectSpec>,
  dropHeightM: number,
  initialAngleRad?: number,
  settings: OceanSettings = calmTank,
  dtS = 0.01
) {
  let state = startDrop(createSimulation(spec, dropHeightM, initialAngleRad));
  for (let index = 0; index < 900 && !state.impact; index += 1) {
    state = stepSimulation(state, spec, settings, dtS);
  }
  if (!state.impact) throw new Error("Expected impact during test scenario");
  return state;
}
