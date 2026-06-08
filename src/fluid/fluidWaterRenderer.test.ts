import { describe, expect, it } from "vitest";
import { fluidWaterPressureStepShader, fluidWaterRenderShader, legacyCanvasWaterTelemetry } from "./fluidWaterRenderer";

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

  it("marks Canvas telemetry as diagnostic fallback only", () => {
    const canvas = { dataset: {} } as HTMLCanvasElement;
    legacyCanvasWaterTelemetry(canvas, "test fallback");
    expect(canvas.dataset.waterRenderer).toBe("legacy-canvas-diagnostic-v1");
    expect(canvas.dataset.waterContext).toBe("2d");
    expect(canvas.dataset.waterFallbackReason).toBe("test fallback");
  });
});
