import { describe, expect, it } from "vitest";
import { backendForCapability, deterministicCpuFluidBackend, legacyCanvasDiagnosticBackend, webGpuFluidBackend } from "./fluidBackend";
import {
  detectFluidCapability,
  estimateFluidGridBytes,
  fallbackFluidCapabilityReport,
  gridForTier,
  selectFluidGridTier,
  type WebGpuLike,
} from "./webgpuCapability";
import { fluidGridTiers } from "./fluidGridContract";

const generousLimits = {
  maxBufferSize: 256 * 1024 * 1024,
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupSizeX: 256,
  maxComputeWorkgroupSizeY: 256,
  maxComputeWorkgroupsPerDimension: 65535,
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
};

describe("WebGPU fluid capability detection", () => {
  it("falls back intentionally when navigator.gpu is unavailable", async () => {
    const report = await detectFluidCapability({ generatedAt: "2026-06-07T00:00:00.000Z", gpu: null });
    expect(report.status).toBe("fallback");
    expect(report.backend).toBe("cpu-deterministic-test");
    expect(report.fallbackReason).toMatch(/navigator\.gpu/);
    expect(report.selectedTier).toBe("low");
    expect(report.requiredBrowserApis).toContain("navigator.gpu");
    expect(report.forbiddenProductionRenderers).toContain("canvas-2d");
  });

  it("reports adapter limits and chooses a high grid tier when WebGPU is available", async () => {
    const gpu: WebGpuLike = {
      requestAdapter: async () => ({
        features: new Set(["shader-f16"]),
        info: { vendor: "Test GPU", architecture: "Tile", device: "Ocean Lab" },
        limits: generousLimits,
        requestDevice: async () => ({
          features: new Set(["shader-f16", "timestamp-query"]),
          limits: generousLimits,
          destroy: () => undefined,
        }),
      }),
    };

    const report = await detectFluidCapability({ generatedAt: "2026-06-07T00:00:00.000Z", gpu });
    expect(report.status).toBe("webgpu-ready");
    expect(report.backend).toBe("webgpu-compute");
    expect(report.adapterName).toContain("Test GPU");
    expect(report.features).toEqual(["shader-f16", "timestamp-query"]);
    expect(report.limits.maxStorageBufferBindingSize).toBe(generousLimits.maxStorageBufferBindingSize);
    expect(report.selectedTier).toBe("high");
    expect(report.grid.cellsX).toBe(512);
    expect(report.grid.estimatedBytes).toBe(estimateFluidGridBytes(gridForTier("high")));
  });

  it("records device creation errors as explicit fallback reasons", async () => {
    const gpu: WebGpuLike = {
      requestAdapter: async () => ({
        requestDevice: async () => {
          throw new Error("device denied");
        },
      }),
    };

    const report = await detectFluidCapability({ generatedAt: "2026-06-07T00:00:00.000Z", gpu });
    expect(report.status).toBe("fallback");
    expect(report.fallbackReason).toContain("device denied");
  });

  it("selects the largest tier allowed by limits and memory budget", () => {
    expect(selectFluidGridTier(generousLimits, "high")).toBe("high");
    expect(selectFluidGridTier(generousLimits, "ultra")).toBe("ultra");
    expect(selectFluidGridTier(generousLimits, "ultra", estimateFluidGridBytes(gridForTier("high")) + 1)).toBe("high");
    expect(selectFluidGridTier({ ...generousLimits, maxComputeInvocationsPerWorkgroup: 32 }, "high")).toBe("low");
    expect(fluidGridTiers.map((tier) => tier.id)).toEqual(["low", "standard", "high", "ultra"]);
  });

  it("keeps Canvas 2D as diagnostic-only and selects CPU for fallback reports", async () => {
    const fallback = fallbackFluidCapabilityReport("testing");
    expect(backendForCapability(fallback)).toBe(deterministicCpuFluidBackend);
    expect(webGpuFluidBackend.compute).toBe(true);
    expect(webGpuFluidBackend.role).toBe("production");
    expect(legacyCanvasDiagnosticBackend.role).toBe("diagnostic");
    await expect(deterministicCpuFluidBackend.capabilityReport()).resolves.toMatchObject({ backend: "cpu-deterministic-test" });
  });
});
