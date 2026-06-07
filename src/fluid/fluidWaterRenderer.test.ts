import { describe, expect, it } from "vitest";
import { fluidWaterRenderShader, legacyCanvasWaterTelemetry } from "./fluidWaterRenderer";

describe("WebGPU fluid water renderer contract", () => {
  it("renders from storage-backed height and foam grids through WebGPU", () => {
    expect(fluidWaterRenderShader).toContain("@fragment");
    expect(fluidWaterRenderShader).toContain("heightGrid");
    expect(fluidWaterRenderShader).toContain("foamGrid");
    expect(fluidWaterRenderShader).toContain("@group(0) @binding(1) var<storage, read>");
    expect(fluidWaterRenderShader).not.toMatch(/getContext|CanvasRenderingContext2D|fillRect|Path2D/);
  });

  it("marks Canvas telemetry as diagnostic fallback only", () => {
    const canvas = { dataset: {} } as HTMLCanvasElement;
    legacyCanvasWaterTelemetry(canvas, "test fallback");
    expect(canvas.dataset.waterRenderer).toBe("legacy-canvas-diagnostic-v1");
    expect(canvas.dataset.waterContext).toBe("2d");
    expect(canvas.dataset.waterFallbackReason).toBe("test fallback");
  });
});
