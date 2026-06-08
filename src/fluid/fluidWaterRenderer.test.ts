import { describe, expect, it } from "vitest";
import { createFluidGridStepPlan } from "./fluidGridGpu";
import {
  fluidWaterPressureStepShader,
  fluidWaterRendererRequiredDeviceLimits,
  fluidWaterRendererRequiredStorageBuffers,
  fluidWaterRenderShader,
  legacyCanvasWaterTelemetry,
  livePressureSummaryFor,
  type FluidWaterRenderInput,
} from "./fluidWaterRenderer";

describe("WebGPU fluid water renderer contract", () => {
  it("renders from storage-backed height and foam grids through WebGPU", () => {
    expect(fluidWaterRenderShader).toContain("@fragment");
    expect(fluidWaterRenderShader).toContain("heightGrid");
    expect(fluidWaterRenderShader).toContain("foamGrid");
    expect(fluidWaterRenderShader).toContain("sprayAt");
    expect(fluidWaterRenderShader).toContain("params.splash0");
    expect(fluidWaterRenderShader).toContain("dropletDensity");
    expect(fluidWaterRenderShader).toContain("reentryMist");
    expect(fluidWaterRenderShader).toContain("@group(0) @binding(1) var<storage, read>");
    expect(fluidWaterRenderShader).not.toMatch(/getContext|CanvasRenderingContext2D|fillRect|Path2D/);
  });

  it("steps live renderer water with bounded pressure-gradient momentum state", () => {
    expect(fluidWaterPressureStepShader).toContain("@compute");
    expect(fluidWaterPressureStepShader).toContain("bounded-pressure-gradient-live-v1");
    expect(fluidWaterPressureStepShader).toContain("mxIn");
    expect(fluidWaterPressureStepShader).toContain("mxOut");
    expect(fluidWaterPressureStepShader).toContain("myIn");
    expect(fluidWaterPressureStepShader).toContain("myOut");
    expect(fluidWaterPressureStepShader).toContain("pressureGain");
    expect(fluidWaterPressureStepShader).toContain("slopeLimit");
    expect(fluidWaterPressureStepShader).toContain("maxMomentumPerDepth");
    expect(fluidWaterPressureStepShader).not.toMatch(/getContext|CanvasRenderingContext2D|fillRect|Path2D/);
  });

  it("requests the storage-buffer device limit required by the live compute pipeline", () => {
    expect(fluidWaterRendererRequiredStorageBuffers).toBe(10);
    expect(fluidWaterRendererRequiredDeviceLimits({ maxStorageBuffersPerShaderStage: 10 })).toEqual({ maxStorageBuffersPerShaderStage: 10 });
    expect(fluidWaterRendererRequiredDeviceLimits({ maxStorageBuffersPerShaderStage: 8 })).toBeNull();
    expect(fluidWaterRendererRequiredDeviceLimits(undefined)).toBeNull();
  });

  it("derives bounded pressure force feedback for rigid-body coupling", () => {
    const plan = createFluidGridStepPlan({ tier: "high" });
    const pressure = livePressureSummaryFor(exampleRenderInput, plan);

    expect(pressure.coupling).toBe("bounded-pressure-gradient-live-v1");
    expect(pressure.verticalForceDeltaN).not.toBe(0);
    expect(pressure.horizontalForceDeltaN).not.toBe(0);
    expect(Math.abs(pressure.verticalForceDeltaN)).toBeLessThanOrEqual(pressure.forceBoundN);
    expect(Math.abs(pressure.horizontalForceDeltaN)).toBeLessThanOrEqual(pressure.forceBoundN * 0.55);
    expect(pressure.bufferRoles).toContain("momentumX");
    expect(pressure.bufferRoles).toContain("momentumY");
    expect(pressure.noFullGridReadbackPerFrame).toBe(true);
  });

  it("marks Canvas telemetry as diagnostic fallback only", () => {
    const canvas = { dataset: {} } as HTMLCanvasElement;
    legacyCanvasWaterTelemetry(canvas, "test fallback");
    expect(canvas.dataset.waterRenderer).toBe("legacy-canvas-diagnostic-v1");
    expect(canvas.dataset.waterContext).toBe("2d");
    expect(canvas.dataset.waterFallbackReason).toBe("test fallback");
  });
});

const exampleRenderInput: FluidWaterRenderInput = {
  buoyancyN: 1800,
  currentSpeedMps: 0.18,
  displacedVolumeM3: 0.18,
  displacedVolumeRateM3ps: 2.4,
  dragForceXN: 12,
  dragForceYN: 40,
  ejectedWaterKg: 90,
  froudeNumber: 3.2,
  gravityMps2: 9.80665,
  impactStrength: 0.82,
  massKg: 895.8,
  netForceN: -3600,
  objectAngleRad: -0.1,
  objectCenterXPx: 420,
  objectCenterYPx: 250,
  objectDepthM: 0.72,
  objectHalfHeightPx: 42,
  objectHalfWidthPx: 42,
  objectHeightM: 0.72,
  objectVxMps: -0.4,
  objectVyMps: -8.8,
  objectWidthM: 0.72,
  scalePxPerM: 58,
  shape: "box",
  slamForceN: 9800,
  sprayParticleCount: 220,
  sprayReentryCount: 12,
  sprayReentryEnergyJ: 3.2,
  sprayReentryMassKg: 0.9,
  splashEnergyJ: 8400,
  splashHeightM: 2.1,
  submergedFraction: 0.62,
  surfaceTensionNpm: 0.073,
  surfaceYPx: 280,
  timeS: 1.25,
  waterDensityKgM3: 1025,
  waterDepthM: 22,
  weberNumber: 120000,
  waveHeightM: 0.85,
};
